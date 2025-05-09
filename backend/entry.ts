import * as path from "@std/path";
import crypto from "node:crypto";
import { AkaiGrid } from "./akaigrid.ts";
import * as fs from "@std/fs";
import { devLogTime, devLogTimeEnd, generateThumbnail, getFrontendDir, getVideoInfo, log, placeholderImagePath } from "./util.ts";
import { kv } from "./db/kv.ts";
import { EntryDisplayObject, ObjectAsArray, VideoInfo, VideoInfoSchema } from "../common/util.ts";
import * as naturalOrderBy from "natural-orderby";
import { getMPCHCMediaHistory } from "./history.ts";
import { statCache } from "./file-stat.ts";

export class Entry {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    absolutePath: string;
    akaiGrid: AkaiGrid;

    /**
     * Call getStat() instead
     */
    private stat?: Deno.FileInfo;

    constructor(input: InputType) {
        this.name = input.name;
        this.isDirectory = input.isDirectory;
        this.isFile = input.isFile;
        this.absolutePath = input.absolutePath;
        this.akaiGrid = input.akaiGrid;
    }

    async getStat() {
        if (!this.stat) {
            this.stat = await statCache(this.absolutePath);
        }
        return this.stat;
    }

    private hashAbsolutePath() {
        const buffer = crypto.hash("sha1", this.absolutePath, "buffer");
        return buffer.toString("base64url");
    }

    private async hexSize() {
        const stat = await this.getStat();
        const kb = Math.floor(stat.size / 1024);
        return kb.toString(16);
    }

    async getID() {
        return `${this.hashAbsolutePath()}_${await this.hexSize()}`;
    }

    async getThumbnailPath() {
        return path.join(this.akaiGrid.thumbnailDir, await this.getID() + ".jpg");
    }

    async generateThumbnail(): Promise<string> {
        const stat = await this.getStat();

        if (stat.isFile) {
            const path = await this.getThumbnailPath();
            if (!await fs.exists(path)) {
                await generateThumbnail(this.absolutePath, path);
            }
            return path;
        } else if (stat.isDirectory) {
            // cover.jpg or cover.png
            let coverPath = path.join(this.absolutePath, "cover.jpg");
            if (await fs.exists(coverPath)) {
                return coverPath;
            }
            coverPath = path.join(this.absolutePath, "cover.png");
            if (await fs.exists(coverPath)) {
                return coverPath;
            }

            // list the directory, get the first file and generate a thumbnail for it
            let entryList = [];
            const entryGenerator = this.akaiGrid.list(this.absolutePath);

            for await (const entry of entryGenerator) {
                entryList.push(entry);
            }

            // Sort isFile first, then isDirectory
            entryList.sort((a, b) => {
                if (a.isFile && !b.isFile) {
                    return -1;
                } else if (!a.isFile && b.isFile) {
                    return 1;
                } else {
                    return 0;
                }
            });

            // Natural order by name
            entryList = naturalOrderBy.orderBy(entryList, (entry) => entry.name);

            for (const entry of entryList) {
                const path = await entry.generateThumbnail();
                if (path !== placeholderImagePath) {
                    return path;
                }
            }

            log.debug("No files in directory, using placeholder: " + placeholderImagePath);
            return placeholderImagePath;
        } else {
            throw new Error("Not a file or directory");
        }
    }

    /**
     * @returns Seconds (-1 if not found)
     */
    async getLastPosition(allMediaHistory: ObjectAsArray<number>): Promise<number> {
        if (this.isDirectory) {
            return -1;
        }

        const id = await this.getID();
        const seconds = getMPCHCMediaHistory(allMediaHistory, this.absolutePath);

        if (seconds === -1) {
            // It is possible that MPC-HC removed the entry from the history
            // No worry, we might have cached the last position
            const cached = await kv().get(["lastPosition", id]);
            if (cached.versionstamp && typeof cached.value === "number") {
                return cached.value;
            }
        } else {
            // Cache the last position
            await kv().set(["lastPosition", id], seconds);
        }

        return seconds;
    }

    async clearLastPositionCache() {
        await kv().delete(["lastPosition", await this.getID()]);
    }

    async getVideoInfo(): Promise<VideoInfo | undefined> {
        if (!this.isFile) {
            return undefined;
        }

        const id = await this.getID();

        // Check if the video info is cached
        const cached = await kv().get(["videoInfo", id]);

        if (cached.versionstamp) {
            try {
                return VideoInfoSchema.parse(cached.value);
            } catch (_error) {
                await kv().delete(["videoInfo", id]);
            }
        }

        const videoInfo = await getVideoInfo(this.absolutePath);

        // Cache the video info
        await kv().set(["videoInfo", id], videoInfo);

        return videoInfo;
    }

    async getDone(): Promise<boolean> {
        const id = await this.getID();

        const entry = await kv().get(["done", id]);

        if (entry.versionstamp && typeof entry.value === "boolean") {
            return entry.value;
        } else {
            // Assume not watched
            return false;
        }
    }

    async setDone(done: boolean) {
        const id = await this.getID();
        devLogTime("setDone +" + id);
        await kv().set(["done", id], done);
        devLogTimeEnd("setDone +" + id);
    }

    async toDisplayObject(extraInfo: boolean, allMediaHistory: ObjectAsArray<number> = {}): Promise<EntryDisplayObject> {
        let stat;
        let name = this.name;
        let dateAccessed: string;
        let size: number;
        let done: boolean;

        // All stat relative functions should be called here to avoid exceptions
        try {
            stat = await this.getStat();
            size = stat.size;
            done = await this.getDone();

            if (stat.atime === null) {
                dateAccessed = new Date(0).toJSON();
            } else {
                dateAccessed = stat.atime?.toJSON();
            }
        } catch (_) {
            // Probably not exist, but still return a valid object for Home
            name = `[Not Found] ${name}`;
            size = -1;
            done = false;
            dateAccessed = new Date(0).toJSON();
        }

        let obj = {
            name,
            isDirectory: this.isDirectory,
            isFile: this.isFile,
            absolutePath: this.absolutePath,
            size,
            dateAccessed,
            done,
            extraInfo: {},
        };

        if (extraInfo) {
            let videoInfo;

            // ffprobe can throw an error, but we don't want to stop the whole process, so catch it
            try {
                videoInfo = await this.getVideoInfo();
            } catch (error) {
                log.error("Error getting video info: " + error);
                videoInfo = undefined;
            }

            const extraObj = {
                lastPosition: await this.getLastPosition(allMediaHistory),
                videoInfo,
            };

            obj = {
                ...obj,
                extraInfo: extraObj,
            };
        }

        return obj;
    }
}

type InputType = {
    name: string;
    isDirectory: boolean;
    isFile: boolean;
    absolutePath: string;
    akaiGrid: AkaiGrid;
};
