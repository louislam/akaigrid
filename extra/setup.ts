import * as fs from "@std/fs";
import {buildFrontend, denoInstall, download7zip, downloadFFmpeg} from "./build.ts";

// check if config.yaml exists
const configPath = "./config.yaml";

if (!fs.existsSync(configPath)) {
    // Copy config-template.yaml to config.yaml
    const templatePath = "./config-template.yaml";
    fs.copySync(templatePath, configPath);

    console.log("config.yaml has been created. Please edit it to your needs.");
} else {
    console.log("config.yaml already exists.");
}

console.log("Installing dependencies...");
denoInstall();

// Build Frontend
buildFrontend();

// Delete node_modules, it is just for building the frontend
Deno.removeSync("./node_modules", {
    recursive: true,
});

// Download Tools
await fs.ensureDir("./tools");
await download7zip();
await downloadFFmpeg();
