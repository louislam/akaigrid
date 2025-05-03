import * as fs from "@std/fs";
import {buildFrontend, denoInstall, download7zip, downloadFFmpeg} from "./build.ts";

// Download Tools
await fs.ensureDir("./tools");
await download7zip();
await downloadFFmpeg();

// Copy package-dev.json to package.json
Deno.copyFileSync("./package-dev.json", "./package.json");
denoInstall();

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

console.log("Dev environment setup complete.");
console.log("`deno task dev` to start the dev server.");
