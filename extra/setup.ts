import * as fs from "@std/fs";

// check if config.yaml exists
const configPath = "./config.yaml";

if (!fs.existsSync(configPath)) {
    // Copy config-template.yaml to config.yaml
    const templatePath = "./config-template.yaml";
    fs.copySync(templatePath, configPath);

    console.log("config.yaml has been created. Please edit it to your needs.");
}

// download ffmpeg
