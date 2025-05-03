import * as fs from "@std/fs";
import {download7zip, downloadFFmpeg} from "./build.ts";

// check if config.yaml exists
const configPath = "./config.yaml";

if (!fs.existsSync(configPath)) {
    // Copy config-template.yaml to config.yaml
    const templatePath = "./config-template.yaml";
    fs.copySync(templatePath, configPath);

    console.log("config.yaml has been created. Please edit it to your needs.");
}

// deno install

// Build Frontend

// Delete node_modules, it is just for building the frontend

await fs.ensureDir("./tools");
await download7zip();
await downloadFFmpeg();
