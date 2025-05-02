import childProcess from "node:child_process";
import fs from "node:fs";
import { log } from "../backend/util.ts";

const backendEntry = "./backend/main.ts";

export function build() {
    checkBackend();

    removeLockFile();
    buildFrontend();

    removeLockFile();
    buildBackend();

    removeLockFile();
}

if (import.meta.main) {
    build();
}

/**
 * Build the frontend
 */
export function buildFrontend() {
    childProcess.spawnSync("vite", [
        "build",
        "--config",
        "./frontend/vite.config.js",
    ], {
        stdio: "inherit",
    });
}

/**
 * Build the backend
 */
export function buildBackend() {
    // Deno cannot exclude devDependencies.................. which heavily increases the size of the build.
    // I tried to be creative here.
    // Rename package.json in order to exclude devDependencies
    fs.renameSync("package.json", "package.json.building");

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

    fs.renameSync("package.json.building", "package.json");
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

export function removeLockFile() {
    try {
        fs.rmSync("deno.lock");
    } catch (_error) {
        // Ignore error
    }
}

// https://www.gyan.dev/ffmpeg/builds/ffmpeg-git-essentials.7z
