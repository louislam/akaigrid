import * as fs from "@std/fs";
import * as path from "@std/path";
import { AkaiGridConfig, AkaiGridConfigSchema, isDemo, isDev, isFileLocked, isSamePath, isSubPath, log, start, videoExtensions } from "./util.ts";
import * as yaml from "jsr:@std/yaml@^1.0.10";
import { Entry } from "./entry.ts";
import { closeKv, initKv, kv, kvDeletePrefix } from "./db/kv.ts";
import { DirConfig, DirConfigSchema } from "../common/util.ts";
import { clearAllStatCache, clearStatCache, statCache } from "./file-stat.ts";

export class AkaiGrid {
    appDataDir: string;

    /**
     * This variable will be set by createInstance(...)
     * Use ! to skip the check here
     */
    config!: AkaiGridConfig;
    configFileWatcher!: Deno.FsWatcher;

    configFilename = "config.yaml";
    thumbnailDir: string;

    public static async createInstance(appDataDir: string) {
        await fs.ensureDir(appDataDir);
        const thumbnailDir = path.join(appDataDir, "data", "thumbnails");
        await fs.ensureDir(thumbnailDir);

        await initKv(appDataDir);

        // Clear videoInfo cache for dev
        if (isDev()) {
            log.debug("Clearing KV");
            //await kvDeletePrefix("videoInfo");
            //await kvDeletePrefix("lastPosition");
        }

        const instance = new AkaiGrid(appDataDir, thumbnailDir);

        if (!await fs.exists(instance.configFullPath)) {
            const configTemplatePath = "./config-template.yaml";

            if (await fs.exists(configTemplatePath)) {
                // Rename config-template.yaml to config.yaml
                await Deno.copyFile("./config-template.yaml", instance.configFullPath);
            } else {
                // Probably the user deleted it or it is in Deno.build.standalone mode
                log.error("config-template.yaml is not found. Please download it from the repository: https://github.com/louislam/akaigrid.");
            }
        }

        const configFile = await Deno.readTextFile(instance.configFullPath);

        try {
            instance.config = AkaiGridConfigSchema.parse(yaml.parse(configFile));
        } catch (error) {
            if (error instanceof Error) {
                log.error(error.message);
            }
            throw new Error("Error parsing your config file");
        }

        log.debug(instance.config);

        await instance.checkDirs();
        instance.watchConfigFile();

        return instance;
    }

    /**
     * You should use the static method createInstance() to create an instance of AkaiGrid.
     */
    private constructor(appDataDir: string, thumbnailDir: string) {
        this.appDataDir = appDataDir;
        this.thumbnailDir = thumbnailDir;
    }

    get configFullPath() {
        return path.join(this.appDataDir, this.configFilename);
    }

    async saveConfig() {
        await Deno.writeTextFile(this.configFullPath, yaml.stringify(this.config));
        log.debug(`Saved config to ${this.configFullPath}`);
    }

    async checkDirs() {
        for (const dir of this.config.folders) {
            if (!await fs.exists(dir)) {
                log.error(`Directory ${dir} does not exist. Please check your config.yaml.`);
            } else {
                const stat = await Deno.stat(dir);
                if (!stat.isDirectory) {
                    log.error(`Path ${dir} is not a directory. Please check your config.yaml.`);
                }
            }
        }
    }

    home(): Entry[] {
        const list: Entry[] = [];
        for (const dir of this.config.folders) {
            list.push(
                new Entry({
                    name: dir,
                    isDirectory: true,
                    isFile: false,
                    absolutePath: dir,
                    akaiGrid: this,
                }),
            );
        }
        return list;
    }

    async getDirConfig(dir: string): Promise<DirConfig> {
        this.checkAllowedPath(dir);

        // Demo
        if (isDemo()) {
            if (dir === "/app/videos") {
                return DirConfigSchema.parse({
                    view: "grid",
                });
            }
        }

        // Find in KV
        const dirConfigEntry = await kv().get(["dirConfig", dir]);

        // Check if dirConfigEntry.value is an object
        if (dirConfigEntry.value && typeof dirConfigEntry.value === "object") {
            return DirConfigSchema.parse(dirConfigEntry.value);
        } else {
            return DirConfigSchema.parse({});
        }
    }

    async setDirConfig(dir: string, dirConfig: DirConfig) {
        if (isDemo()) {
            log.debug("Skipping setDirConfig in demo mode");
            return;
        }
        this.checkAllowedPath(dir);
        await kv().set(["dirConfig", dir], dirConfig);
    }

    async *list(dir: string): AsyncGenerator<Entry> {
        this.checkAllowedPath(dir);

        // Check if the directory exists
        if (!await fs.exists(dir)) {
            throw new Error(`Directory ${dir} does not exist.`);
        }

        // Check if the directory is a directory using Deno.stat
        const stat = await Deno.stat(dir);
        if (!stat.isDirectory) {
            throw new Error(`Path ${dir} is not a directory.`);
        }

        for await (const entry of Deno.readDir(dir)) {
            // skip dotfiles
            if (this.config.hideDotfiles && entry.name.startsWith(".")) {
                continue;
            }

            const ext = path.extname(entry.name).toLowerCase();

            // allow video files only
            if (entry.isFile && videoExtensions.indexOf(ext) === -1) {
                continue;
            }

            const obj = new Entry({
                name: entry.name,
                isDirectory: entry.isDirectory,
                isFile: entry.isFile,
                absolutePath: path.join(dir, entry.name),
                akaiGrid: this,
            });
            yield obj;
        }
    }

    async getEntry(path: string): Promise<Entry> {
        this.checkAllowedPath(path);
        const stat = await Deno.stat(path);
        return new Entry({
            name: path,
            isDirectory: stat.isDirectory,
            isFile: stat.isFile,
            absolutePath: path,
            akaiGrid: this,
        });
    }

    async open(path: string) {
        this.checkAllowedPath(path);
        log.debug(`Opening path ${path}`);
        start(path);

        // Also update the date accessed for the parent directory
        if (this.config.bringFolderToTop) {
            await this.bringFolderToTop(path);
        }

        // Update the date accessed
        if (this.config.updateDateAccessed) {
            await this.updateDateAccessed(path);
        }
    }

    async setDone(path: string, done: boolean) {
        this.checkAllowedPath(path);
        log.debug(`Setting path ${path} to done: ${done}`);
        const entry = await this.getEntry(path);
        await entry.setDone(done);

        if (this.config.bringFolderToTopDone && done) {
            await this.bringFolderToTop(path);
        }
    }

    async updateDateAccessed(p: string) {
        this.checkAllowedPath(p);

        // Check if the file locked first, because Deno.utime will never end if the file is locked
        if (await isFileLocked(p)) {
            log.warn(`${p} is locked. Skipping update date accessed.`);
            return;
        }

        log.debug(`Updating date accessed for path ${p}`);
        const stat = await statCache(p);
        const accessTime = new Date();
        const modifiedTime = (stat.mtime) ? stat.mtime : accessTime;
        await Deno.utime(p, accessTime, modifiedTime);
        log.debug(`Updated date accessed for path ${p} to ${accessTime}`);
        await clearStatCache(p);
    }

    async bringFolderToTop(p: string) {
        this.checkAllowedPath(p);

        const dir = path.dirname(p);

        // Check if the path is a directory
        const stat = await statCache(dir);
        if (!stat.isDirectory) {
            log.debug(`Path ${dir} is not a directory. How could this possible?`);
            return;
        }

        log.debug(`Bringing folder ${dir} to top`);
        await this.updateDateAccessed(dir);
    }

    /**
     * Check if the path is in the config
     */
    isAllowedPath(p: string): boolean {
        // Allow absolute paths only
        // path.isAbsolute cannot check dot path!!!
        if (!path.isAbsolute(p)) {
            log.debug(`Path ${p} is not absolute.`);
            return false;
        }

        // TODO: Check if the path contains ".." that resolves to a different directory

        // Check if the path is in the config
        if (this.isTopLevel(p)) {
            log.debug(`Path ${p} is in the config.`);
            return true;
        }

        // Check if the path is a subpath of any of the directories in the config
        for (const dir of this.config.folders) {
            if (isSubPath(dir, p)) {
                return true;
            }
        }
        log.debug(`Path ${p} is not in the config.`);
        return false;
    }

    search(keyword: string) {
    }

    checkAllowedPath(p: string) {
        if (!this.isAllowedPath(p)) {
            throw new Error(`Path ${p} is not in the config.`);
        }
    }

    isTopLevel(dir: string) {
        for (const d of this.config.folders) {
            if (isSamePath(d, dir)) {
                return true;
            }
        }
        return false;
    }

    previousDir(dir: string) {
        if (this.isTopLevel(dir)) {
            return "";
        }
        return path.dirname(dir);
    }

    async close() {
        log.info("Closing KV...");
        await closeKv();

        log.info("Closing config file watcher...");
        this.configFileWatcher.close();

        log.info("Clearing all stat cache...");
        await clearAllStatCache();

        log.info("AkaiGrid closed.");
    }

    /**
     * Watch config.yaml for changes, and reload the config if the yaml is valid
     */
    watchConfigFile() {
        this.configFileWatcher = Deno.watchFs(this.configFullPath);
        this.watchLoop(this.configFileWatcher).then((_) => {});
    }

    private async watchLoop(watcher: Deno.FsWatcher) {
        for await (const event of watcher) {
            if (event.kind === "modify" || event.kind === "create") {
                const configFile = await Deno.readTextFile(this.configFullPath);
                try {
                    this.config = AkaiGridConfigSchema.parse(yaml.parse(configFile));
                    log.info("Reload config file successfully!");
                    await this.checkDirs();
                } catch (error) {
                    log.error("Reload config file failed, please check the format.");
                }
                log.debug(this.config);
            }
        }
    }
}
