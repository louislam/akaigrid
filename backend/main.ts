import childProcess from "node:child_process";
import process from "node:process";
import express from "npm:express";
import fs from "node:fs";

async function main() {
    console.log("Hello from the backend!");
    console.log("Shell: ", process.env.ComSpec);

    let frontendDir = "frontend-dist";

    // Check if the shell is cmd.exe
    if (!process.env.ComSpec?.endsWith("cmd.exe")) {
        console.error("Your ComSpec do not set to cmd.exe.");
        process.exit(1);
    }

    // Check if the frontend directory exists
    // If dev, allow not to exist, but create it
    // If prod, check if it exists, if not, exit
    if (process.env.NODE_ENV === "production") {
        if (!fs.existsSync(frontendDir)) {
            console.error(`${frontendDir} does not exist.`);
            process.exit(1);
        }
    } else {
        if (!fs.existsSync(frontendDir)) {
            console.log(`${frontendDir} directory does not exist, creating...`);
            fs.mkdirSync(frontendDir, { recursive: true });
        }
    }


    const app = express();

    // Static files
    app.use(express.static(frontendDir));

    app.get("/api", (_, res) => {
        res.send("Hello World!");
    });

    app.listen(60001);
    console.log("Server is running on http://localhost:60001");
}

await main();

function open(path: string) {
    const escapedPath = escape(path);
    childProcess.execSync(`start "" ${escapedPath}`, {
        stdio: "inherit",
    });
}

function escape(str: string) {
    return `"${str.replace(/"/g, '""')}"`;
}
