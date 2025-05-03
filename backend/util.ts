import * as log from "@std/log";
import process from "node:process";
import childProcess from "node:child_process";
import { z } from "zod";
import * as path from "@std/path";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { VideoInfo } from "../common/util.ts";
import { fileURLToPath } from "node:url";
import * as jsonc from "@std/jsonc";
import * as semver from "@std/semver";

// @types packages list here
import type {} from "npm:@types/winreg";

/**
 * After compiled, some files are inside the executable, so the path is different
 */
export function getSourceDir(): string {
    if (Deno.build.standalone) {
        // `..` go up one leve is the root. In case this file moved to another folder in the future, be careful
        return path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    } else {
        return "./";
    }
}

const ffprobe = "./tools/ffmpeg/bin/ffprobe.exe";
const ffmpeg = "./tools/ffmpeg/bin/ffmpeg.exe";

const denoJSONCPath = path.join(getSourceDir(), "./deno.jsonc");
export const denoJSONC = jsonc.parse(await Deno.readTextFile(denoJSONCPath));
let version = "unknown";
if (denoJSONC && typeof denoJSONC === "object" && !Array.isArray(denoJSONC) && typeof denoJSONC.version === "string") {
    version = denoJSONC.version;
}

// Parse deno.jsonc
export const appVersion = version;

// better for auto import for IDE
export { log };

// Define the schema matching AkaiGridConfig
export const AkaiGridConfigSchema = z.object({
    host: z.string().default("127.0.0.1"),
    port: z.number().default(60001),
    folders: z.array(z.string()).default([]),
    hideDotfiles: z.boolean().default(true),
    launchBrowser: z.boolean().default(true),
    bringFolderToTop: z.boolean().default(false),
    bringFolderToTopDone: z.boolean().default(false),
});

// Infer the type from the schema (matches AkaiGridConfig)
export type AkaiGridConfig = z.infer<typeof AkaiGridConfigSchema>;

/**
 * For cmd.exe's start command, escape the string
 * @param str
 */
export function escapeString(str: string) {
    return `"${str.replace(/"/g, '""')}"`;
}

export function setupLog() {
    const useColors = isDev();
    let logLevel: log.LevelName = "INFO";

    if (process.env.LOG_LEVEL) {
        for (const level in log.LogLevels) {
            if (level === process.env.LOG_LEVEL) {
                logLevel = level as log.LevelName;
                break;
            }
        }
        throw new Error(`Invalid log level: ${process.env.LOG_LEVEL}`);
    } else if (isDev()) {
        logLevel = "DEBUG";
    }

    log.setup({
        handlers: {
            console: new log.ConsoleHandler("DEBUG", {
                formatter: (record) => `[${record.levelName}] ${record.msg}`,
                useColors,
            }),
        },
        loggers: {
            default: {
                level: logLevel,
                handlers: ["console"],
            },
        },
    });

    return logLevel;
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getFrontendDir(): string {
    return path.join(getSourceDir(), "./frontend-dist");
}

export function start(path: string) {
    const escapedPath = escapeString(path);
    childProcess.exec(`start "" ${escapedPath}`);
}

export function isDev() {
    return process.env.NODE_ENV === "development";
}

export function allowDevAllOrigin(res: Response) {
    if (isDev()) {
        res.headers.set("Access-Control-Allow-Origin", "*");
        res.headers.set("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
        res.headers.set("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    }
}

/**
 * Reference: https://stackoverflow.com/a/45242825/1097815
 */
export function isSubPath(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    log.debug("Parent: " + parent);
    log.debug("Checking child: " + child);
    log.debug("Relative: " + relative);

    if (!relative) {
        return false;
    }
    return !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function isSamePath(path1: string, path2: string): boolean {
    return path.normalize(path1) === path.normalize(path2);
}

/**
 * Re-implementation of MPC-HC's getRFEHash
 * https://github.com/clsid2/mpc-hc/blob/182153b6b49336a172e18f6956d848a6a7c47508/src/mpc-hc/AppSettings.cpp#L2875
 */
export function getRFEHash(path: string) {
    const loweredPath = path.toLowerCase();
    // Well, I probably cannot solve this without Grok 3's help.
    const data = Buffer.from(loweredPath, "utf16le");
    return getShortHash(data);
}

/**
 * Re-implementation of MPC-HC's getShortHash
 * https://github.com/clsid2/mpc-hc/blob/182153b6b49336a172e18f6956d848a6a7c47508/src/mpc-hc/AppSettings.cpp#L2875
 */
export function getShortHash(bytes: Uint8Array): string {
    const shortHashLen = 12;
    try {
        // Create SHA-1 hash
        const hash = createHash("sha1");
        hash.update(bytes);
        const hashBuffer = hash.digest();

        // Convert to Base64
        const longHash = hashBuffer.toString("base64");

        // Return first 12 characters
        return longHash.slice(0, shortHashLen);
    } catch (error) {
        console.error("Hashing failed:", error);
        return "";
    }
}

export async function getVideoInfo(videoPath: string): Promise<VideoInfo> {
    // ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,duration -of json input_video.mp4
    const command = new Deno.Command(ffprobe, {
        args: [
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=codec_name,width,height",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            videoPath,
        ],
    });
    const output = await command.output();
    if (output.code !== 0) {
        throw new Error(`Error executing ffprobe: ${output.stderr}, ${output.code}`);
    }
    const decoder = new TextDecoder();
    const json = decoder.decode(output.stdout);
    const data = JSON.parse(json);
    const videoStream = data.streams[0];
    const codecName = videoStream.codec_name;
    const width = videoStream.width;
    const height = videoStream.height;
    const duration = parseFloat(data.format.duration);

    return {
        codecName,
        width,
        height,
        duration,
    };
}

export async function generateThumbnail(videoPath: string, thumbnailPath: string) {
    let command = new Deno.Command(ffprobe, {
        args: [
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            videoPath,
        ],
    });
    let output = await command.output();

    if (output.code !== 0) {
        throw new Error(`Error executing ffprobe: ${output.stderr}, ${output.code}`);
    }

    // Get the video duration
    const duration = parseFloat(new TextDecoder().decode(output.stdout).trim());

    log.debug(`Video duration: ${duration} seconds`);

    // The 20% of the video duration
    const target = Math.floor(duration * 0.2);

    command = new Deno.Command(ffmpeg, {
        args: [
            "-ss",
            target + "",
            "-i",
            videoPath,
            "-vf",
            "scale=512:-1",
            "-vframes",
            "1",
            thumbnailPath,
        ],
        stdout: "piped",
    });
    output = await command.output();

    if (output.code !== 0) {
        log.error("Error executing ffmpeg:", output.stderr);
        throw new Error(`Error executing ffmpeg: ${output.code}`);
    }
    log.debug(`Thumbnail generated at: ${thumbnailPath}`);
}

// From https://github.com/clsid2/mpc-hc/blob/develop/src/mpc-hc/MediaFormats.cpp
// Must be in lowercase
export const videoExtensions = [
    ".avi",
    ".mpg",
    ".mpeg",
    ".mpe",
    ".m1v",
    ".m2v",
    ".mpv2",
    ".mp2v",
    ".pva",
    ".evo",
    ".m2p",
    ".ts",
    ".tp",
    ".trp",
    ".m2t",
    ".m2ts",
    ".mts",
    ".rec",
    ".ssif",
    ".vob",
    ".ifo",
    ".mkv",
    ".mk3d",
    ".webm",
    ".mp4",
    ".m4v",
    ".mp4v",
    ".mpv4",
    ".hdmov",
    ".mov",
    ".3gp",
    ".3gpp",
    ".3g2",
    ".3gp2",
    ".flv",
    ".f4v",
    ".ogm",
    ".ogv",
    ".rm",
    ".rmvb",
    ".ram",
    ".wmv",
    ".wmp",
    ".wm",
    ".asf",
    ".smk",
    ".bik",
    ".fli",
    ".flc",
    ".flic",
    ".dsm",
    ".dsv",
    ".dsa",
    ".dss",
    ".ivf",
    ".divx",
    ".amv",
    ".mxf",
    ".dv",
    ".dav",
    ".mpls",
    ".bdmv",
    ".swf",
    // ".rar",  I don't like this
];

export function devLogTime(label: string) {
    if (!isDev()) {
        return;
    }
    console.time(label);
}

export function devLogTimeEnd(label: string) {
    if (!isDev()) {
        return;
    }
    console.timeEnd(label);
}

export function checkDenoVersion() {
    const requiredDenoVersion = "2.3.1";
    const denoVersion = semver.parse(Deno.version.deno);
    const targetVersion = semver.parse(requiredDenoVersion);

    // Check Deno version if >= 2.3.1
    if (semver.compare(denoVersion, targetVersion) < 0) {
        log.error("Your Deno version is " + Deno.version.deno);
        log.error(`Deno version >= ${requiredDenoVersion} is required.`);
        Deno.exit(1);
    }
}
