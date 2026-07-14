import * as jsonc from "@std/jsonc";
import * as fs from "@std/fs";
import { downloadFFmpeg, download7zip } from "./build.ts";
import { log } from "../backend/util.ts";

const denoJsoncPath = "./deno.jsonc";

interface ExternalTools {
    ffmpeg: string;
    "7zip": string;
}

interface GitHubRelease {
    tag_name: string;
}

function readExternalTools(): ExternalTools {
    const content = Deno.readTextFileSync(denoJsoncPath);
    const parsed = jsonc.parse(content) as { externalTools?: ExternalTools };
    if (!parsed.externalTools) {
        throw new Error("externalTools not found in deno.jsonc");
    }
    return parsed.externalTools;
}

/**
 * Parse JSONC and save it back may lose comments, so we use regex to update the version in the text directly.
 */
function updateVersionInText(content: string, tool: string, oldVersion: string, newVersion: string): string {
    const escapedOld = oldVersion.replace(/\./g, "\\.");
    const regex = new RegExp(`("${tool}"\\s*:\\s*")(${escapedOld})(")`, "g");
    return content.replace(regex, `$1${newVersion}$3`);
}

async function fetchLatestVersion(owner: string, repo: string): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch latest release from ${owner}/${repo}: ${response.status}`);
    }
    const data: GitHubRelease = await response.json();
    return data.tag_name;
}

if (import.meta.main) {
    const tools = readExternalTools();
    log.info(`Current versions - FFmpeg: ${tools.ffmpeg}, 7-Zip: ${tools["7zip"]}`);

    const [ffmpegLatest, sevenZipLatest] = await Promise.all([
        fetchLatestVersion("GyanD", "codexffmpeg"),
        fetchLatestVersion("ip7z", "7zip"),
    ]);

    log.info(`Latest versions - FFmpeg: ${ffmpegLatest}, 7-Zip: ${sevenZipLatest}`);

    const ffmpegUpdated = tools.ffmpeg !== ffmpegLatest;
    const sevenZipUpdated = tools["7zip"] !== sevenZipLatest;

    if (!ffmpegUpdated && !sevenZipUpdated) {
        log.info("All external tools are up to date");
        Deno.exit(0);
    }

    let content = Deno.readTextFileSync(denoJsoncPath);

    await fs.ensureDir("./tools");

    // Update 7-Zip first
    if (sevenZipUpdated) {
        log.info(`Updating 7-Zip from ${tools["7zip"]} to ${sevenZipLatest}`);
        const exe7zr = "./tools/7zr.exe";
        if (await fs.exists(exe7zr)) {
            await Deno.remove(exe7zr);
        }
        await download7zip();
    }

    if (sevenZipUpdated) {
        content = updateVersionInText(content, "7zip", tools["7zip"], sevenZipLatest);
    }

    if (ffmpegUpdated) {
        log.info(`Updating FFmpeg from ${tools.ffmpeg} to ${ffmpegLatest}`);
        const ffmpegDir = "./tools/ffmpeg";
        if (await fs.exists(ffmpegDir)) {
            await Deno.remove(ffmpegDir, { recursive: true });
        }
        await downloadFFmpeg();
    }

    if (ffmpegUpdated) {
        content = updateVersionInText(content, "ffmpeg", tools.ffmpeg, ffmpegLatest);
    }


    log.info("Updated deno.jsonc");
    Deno.writeTextFileSync(denoJsoncPath, content);

    log.info("All external tools updated successfully");
}
