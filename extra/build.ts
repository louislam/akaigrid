import childProcess from "node:child_process";
import * as fs from "@std/fs";
import { log } from "../backend/util.ts";
import { MultiProgressBar } from "jsr:@deno-library/progress@~1.5.1";
import { Downloader } from "./downloader.ts";
import { appVersion } from "../backend/util.ts";

//import { Downloader } from "jsr:@rabbit-company/downloader@0.1.2";
import * as path from "@std/path";
const backendEntry = "./backend/main.ts";

if (import.meta.main) {
    build();
}

export function build() {
    checkBackend();
    buildFrontend(false);
    buildBackend();
}

export async function pack() {
    const cwd = "./build/";

    // These variables are assume the cwd is ./build
    const targetDirCWD = "./AkaiGrid";
    const exe7zr = "../tools/7zr.exe";
    const outputCWD = `./akaigrid-win-x64.7z`;
    const level = 9;

    const targetDir = path.join(cwd, targetDirCWD);
    const output = path.join(cwd, outputCWD);

    const fileList = [
        ["./frontend-dist", "./frontend-dist"],
        ["./tools/ffmpeg", "./tools/ffmpeg"],
        ["./config-template.yaml", "./config.yaml"],
        ["./AkaiGrid.exe", "./AkaiGrid.exe"],
    ];

    // Clean up the target directory
    if (await fs.exists(targetDir)) {
        await Deno.remove(targetDir, { recursive: true });
    }

    // Create the target directory
    await fs.ensureDir(targetDir);

    // Copy the files to the target directory
    for (const [src, dest] of fileList) {
        const destPath = path.join(targetDir, dest);
        await fs.copy(src, destPath);
    }

    // Remove if exists
    if (await fs.exists(output)) {
        await Deno.remove(output);
    }

    const args = [
        "a",
        `-mx=${level}`,
        "-mmt=on",
        outputCWD,
        targetDirCWD,
    ];

    const cmd = new Deno.Command(exe7zr, {
        args: args,
        stdout: "inherit",
        stderr: "inherit",
        cwd: cwd,
    });

    const { code } = await cmd.output();

    if (code !== 0) {
        log.error("Error while packing the files");
        Deno.exit(1);
    }

    // Clean up the target directory
    if (await fs.exists(targetDir)) {
        await Deno.remove(targetDir, { recursive: true });
    }
}

export function denoInstall() {
    childProcess.spawnSync("deno", [
        "install",
        "--node-modules-dir=auto",
    ], {
        stdio: "inherit",
    });
}

/**
 * Build the frontend
 */
export function buildFrontend(isBuiltByProductionUser: boolean) {
    fs.copySync("./package-dev.json", "./package.json", {
        overwrite: true,
    });

    denoInstall();

    childProcess.spawnSync("deno", [
        "run",
        "--allow-all",
        "--node-modules-dir=manual",
        "./node_modules/vite/bin/vite.js",
        "build",
        "--config",
        "./frontend/vite.config.js",
    ], {
        stdio: "inherit",
    });

    if (isBuiltByProductionUser) {
        Deno.removeSync("./package.json");
        Deno.removeSync("node_modules", { recursive: true });
    }
}

/**
 * Build the backend
 */
export function buildBackend() {
    // Deno cannot exclude devDependencies.................. which heavily increases the size of the build.
    // I tried to be creative here.
    // Rename package.json in order to exclude devDependencies
    Deno.renameSync("package.json", "package.json.building");

    // Because we have excluded devDependencies, @types/express is not existing anymore.
    // TypeScript will complain here, --no-check skips the check.
    // To overcome this, checkBackend() is called before buildBackend()
    try {
        childProcess.spawnSync("deno", [
            "compile",
            "--include",
            "./frontend-dist",
            "--include",
            "./deno.jsonc",
            "--no-check",
            "--allow-all",
            "--output",
            "AkaiGrid.exe",
            "--node-modules-dir=none",
            "--target",
            "x86_64-pc-windows-msvc",
            "--icon",
            "./extra/logo.ico",
            backendEntry,
        ], {
            stdio: "inherit",
        });
    } catch (_error) {
        log.error("Error while building the backend");
    }

    Deno.renameSync("package.json.building", "package.json");
}

/**
 * Check Typescript in the backend
 */
export function checkBackend() {
    childProcess.spawnSync("deno", [
        "check",
        backendEntry,
    ], {
        stdio: "inherit",
    });
}

/**
 * https://github.com/GyanD/codexffmpeg/releases
 */
export async function downloadFFmpeg() {
    const version = "7.1.1";
    const url = `https://github.com/GyanD/codexffmpeg/releases/download/${version}/ffmpeg-${version}-essentials_build.7z`;

    const zipFile = "./tools/ffmpeg.7z";
    const unzipDest = "./tools/ffmpeg";

    if (await fs.exists(unzipDest)) {
        log.info("FFmpeg already downloaded and unpacked");
        return;
    }

    if (!await fs.exists(zipFile)) {
        await download("FFmpeg", url, zipFile);
    } else {
        log.info("FFmpeg already downloaded, but not unpacked");
    }

    // Unzip the file
    const tmpDir = unzipDest + "_tmp";
    await unzip(zipFile, tmpDir);
    const innerDir = path.join(tmpDir, `ffmpeg-${version}-essentials_build`);

    // Delete unnessesary files
    await Deno.remove(path.join(innerDir, "bin", "ffplay.exe"));
    await Deno.remove(path.join(innerDir, "README.txt"));
    await Deno.remove(path.join(innerDir, "doc"), { recursive: true });
    await Deno.remove(path.join(innerDir, "presets"), { recursive: true });

    // Rename the tmpDir/ffmpeg-${version}-essentials_build to ffmpeg
    await Deno.rename(innerDir, unzipDest);

    // Delete the tmp folder
    await Deno.remove(tmpDir);

    // Delete the zip file
    await Deno.remove(zipFile);
}

export async function download7zip() {
    const url = "https://github.com/ip7z/7zip/releases/download/24.09/7zr.exe";
    const dest = "./tools/7zr.exe";

    if (await fs.exists(dest)) {
        log.info("7-Zip already downloaded");
        return;
    }
    await download("7-Zip", url, dest);
}

export async function download(name: string, url: string, dest: string) {
    const tmp = dest + ".tmp";
    const bars = new MultiProgressBar({
        title: `Downloading ${name}`,
    });

    const downloader = new Downloader({
        url,
        destinationPath: tmp,
    });

    const interval = setInterval(async () => {
        await renderBars(bars, downloader.getProgress(), downloader.getDownloadSpeed());
    }, 100);

    await downloader.download();

    await Deno.rename(tmp, dest);

    clearInterval(interval);
    await renderBars(bars, 100, downloader.getDownloadSpeed());
    console.log("");
    console.log("");
}

export async function unzip(filePath: string, dest: string) {
    const bin = "./tools/7zr.exe";
    childProcess.spawnSync(bin, [
        "x",
        filePath,
        `-o${dest}`,
    ], {
        stdio: "inherit",
    });
    return dest;
}

export async function renderBars(bars: MultiProgressBar, progress: number = 100, speed: number) {
    await bars.render([{
        completed: Math.floor(progress),
        text: `${(speed / 1024).toFixed(2)} KB/s`,
    }]);
}
