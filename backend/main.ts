import process from "node:process";
import { Server } from "./server.ts";
import {appVersion, isDev, log, setupLog, start} from "./util.ts";
import * as semver from "@std/semver";

// Set NODE_ENV to production if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
}

const logLevel = setupLog();
log.info("AkaiGrid " + appVersion);
log.info("Shell (ComSpec): " + process.env.ComSpec);
log.info("Env: " + process.env.NODE_ENV);
log.info(`Log level: ${logLevel}`);

const denoVersion = semver.parse(Deno.version.deno);
const targetVersion = semver.parse("2.3.1");

// Check Deno version if >= 2.3.1
if (semver.compare(denoVersion, targetVersion) < 0) {
    log.error("Your Deno version is " + Deno.version.deno);
    log.error("Deno version >= 2.3.1 is required.");
    Deno.exit(1);
}

// Check if the shell is cmd.exe
if (!process.env.ComSpec?.endsWith("cmd.exe")) {
    log.error("Your ComSpec do not set to cmd.exe.");
    Deno.exit(1);
}

const server = await Server.createInstance();
server.run((url) => {
    if (server.akaiGrid.config.launchBrowser && !isDev()) {
        // Open the URL in the default browser
        start(url);
    } else if (server.akaiGrid.config.launchBrowser) {
        log.debug("launchBrowser is set to true! But for convenience, we will not open the browser in dev mode.");
    }

    log.debug("Dev servers are ready");
    log.debug("Frontend (Vue 3): http://localhost:" + (server.port - 1));
    log.debug("Backend (API): " + url);
});

const signalHandler = async () => {
    log.info("Shutdown requested");
    await server.close();
    Deno.exit();
};
Deno.addSignalListener("SIGINT", signalHandler);

if (Deno.build.os === "linux") {
    Deno.addSignalListener("SIGTERM", signalHandler);
}
