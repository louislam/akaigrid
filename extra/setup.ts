import * as fs from "@std/fs";
import { buildFrontend, denoInstall, download7zip, downloadFFmpeg } from "./build.ts";
import { checkDenoVersion } from "../backend/util.ts";

checkDenoVersion();

// Download Tools
await fs.ensureDir("./tools");
await download7zip();
await downloadFFmpeg();

// Build Frontend
buildFrontend(true);

// check if config.yaml exists
const configPath = "./config.yaml";

if (!fs.existsSync(configPath)) {
    // Copy config-template.yaml to config.yaml
    const templatePath = "./config-template.yaml";
    fs.copySync(templatePath, configPath);

    console.log("config.yaml has been created.");
} else {
    console.log("config.yaml already exists.");
}

console.log("Please edit config.yaml to add your video folders!");
console.log("`deno task start` to start the server");
