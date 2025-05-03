import process from "node:process";
import { Server } from "./server.ts";
import { appVersion, checkDenoVersion, isDev, log, setupLog, start } from "./util.ts";

// Set NODE_ENV to production if not set
if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "production";
}

const logLevel = setupLog();
log.info("AkaiGrid " + appVersion);
log.info("Shell (ComSpec): " + process.env.ComSpec);
log.info("Env: " + process.env.NODE_ENV);
log.info(`Log level: ${logLevel}`);

checkDenoVersion();

// Check if the shell is cmd.exe
if (!process.env.ComSpec?.endsWith("cmd.exe")) {
    log.error("Your ComSpec do not set to cmd.exe.");
    Deno.exit(1);
}

// Catch Signal
const signalHandler = async () => {
    log.info("Shutdown requested");
    await server.close();
    Deno.exit();
};
Deno.addSignalListener("SIGINT", signalHandler);

if (Deno.build.os === "linux") {
    Deno.addSignalListener("SIGTERM", signalHandler);
}

const server = await Server.createInstance();
await server.run((url) => {
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
