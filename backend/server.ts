import * as fs from "@std/fs";
import { AkaiGrid } from "./akaigrid.ts";
import { Router } from "@louislam/deno-serve-router";
import { allowDevAllOrigin, devLogTime, devLogTimeEnd, getFrontendDir, isDev, log, placeholderImagePath, sleep } from "./util.ts";
import * as path from "@std/path";
import { serveDir, serveFile } from "@std/http/file-server";
import { DirConfigSchema, EntryDisplayObject, ObjectAsArray } from "../common/util.ts";
import { getAllMPCHCMediaHistory } from "./history.ts";

export class Server {
    akaiGrid: AkaiGrid;
    server?: Deno.HttpServer;
    router: Router;
    abortController: AbortController;
    //io: SocketIOServer;

    hostname;
    port: number;
    frontendDir: string;

    public static async createInstance() {
        const frontendDir = getFrontendDir();

        if (!Deno.build.standalone) {
            // Check if the frontend directory exists
            // If dev, allow not to exist, but create it
            // If prod, check if it exists, if not, exit
            if (!fs.existsSync(frontendDir)) {
                if (isDev()) {
                    console.error("You need to build the frontend first. Run `deno task build`.");
                } else {
                    console.error(`${frontendDir} does not exist.`);
                    console.error(`Please run \`deno task setup\` to build ${frontendDir}`);
                }
                Deno.exit(1);
            }
        }

        const appDataDir = "./";
        const akaiGrid = await AkaiGrid.createInstance(appDataDir);
        const hostname = akaiGrid.config.host;
        const port = akaiGrid.config.port;
        return new Server(akaiGrid, hostname, port, frontendDir);
    }

    private constructor(akaiGrid: AkaiGrid, hostname: string, port: number, frontendDir: string) {
        this.akaiGrid = akaiGrid;
        this.hostname = hostname;
        this.port = port;
        this.frontendDir = frontendDir;
        this.abortController = new AbortController();
        this.router = new Router();

        this.router.add("GET", "/api", (_req) => {
            const res = Response.json({
                name: "AkaiGrid API",
            });
            allowDevAllOrigin(res);
            return res;
        });

        // List Home entries
        this.router.add("GET", "/api/home", async (_req) => {
            // Home is not configurable now, return default config
            const dirConfig = DirConfigSchema.parse({});
            const list: ObjectAsArray<EntryDisplayObject> = {};

            const entryList = this.akaiGrid.home();

            for (const entry of entryList) {
                const obj = await entry.toDisplayObject(false);
                list[obj.name] = obj;
            }

            const res = Response.json({
                status: true,
                list,
                dirConfig,
            });
            allowDevAllOrigin(res);
            return res;
        });

        // List all entries in a directory (with basic info only)
        this.router.add("GET", "/api/list/:dir", async (req, params) => {
            try {
                const dir = params.dir;
                if (!dir) {
                    return this.errorResponse(new Error("No directory specified"));
                }

                const isTopLevel = this.akaiGrid.isTopLevel(dir);

                const url = new URL(req.url);
                const extraInfo = url.searchParams.get("extraInfo") === "true";
                const dirConfig = await this.akaiGrid.getDirConfig(dir);
                const list: ObjectAsArray<EntryDisplayObject> = {};
                let allMediaHistory: ObjectAsArray<number> = {};
                if (extraInfo) {
                    allMediaHistory = await getAllMPCHCMediaHistory();
                }

                devLogTime("list " + dir);
                const entryGenerator = this.akaiGrid.list(dir);
                const toDisplayObjectPromises: Promise<void>[] = [];

                // Generator will keep sending out entries
                for await (const entry of entryGenerator) {
                    const p = entry.toDisplayObject(extraInfo, allMediaHistory).then((obj) => {
                        list[obj.name] = obj;
                    });
                    toDisplayObjectPromises.push(p);
                }

                // Wait for all promises to finish
                await Promise.all(toDisplayObjectPromises);

                devLogTimeEnd("list " + dir);

                const res = Response.json({
                    status: true,
                    isTopLevel,
                    dirConfig,
                    extraInfo,
                    previousDir: this.akaiGrid.previousDir(dir),
                    list,
                });

                allowDevAllOrigin(res);
                return res;
            } catch (error) {
                return this.errorResponse(error);
            }
        });

        // Update DirConfig
        this.router.add("POST", "/api/dir-config/:dir", async (req, params) => {
            try {
                const dir = params.dir;
                if (!dir) {
                    return this.errorResponse(new Error("No directory specified"));
                }

                const body = await req.json();
                const dirConfig = DirConfigSchema.parse(body);

                await this.akaiGrid.setDirConfig(dir, dirConfig);

                const res = Response.json({
                    status: true,
                    dirConfig,
                });
                allowDevAllOrigin(res);
                return res;
            } catch (error) {
                return this.errorResponse(error);
            }
        });

        // Open Media file
        this.router.add("POST", "/api/open/:path", async (_req, params) => {
            try {
                const path = params.path;
                if (!path) {
                    return this.errorResponse(new Error("No path specified"));
                }
                await this.akaiGrid.open(path);
                const res = Response.json({
                    status: true,
                });
                allowDevAllOrigin(res);
                return res;
            } catch (error) {
                return this.errorResponse(error);
            }
        });

        // Set the path to done?
        // :yes = true/false
        this.router.add("POST", "/api/done/:path/:yes", async (_req, params) => {
            try {
                const path = params.path;
                if (!path) {
                    return this.errorResponse(new Error("No path specified"));
                }

                const yes = params.yes === "true";
                await this.akaiGrid.setDone(path, yes);

                const res = Response.json({
                    status: true,
                });
                allowDevAllOrigin(res);
                return res;
            } catch (error) {
                return this.errorResponse(error);
            }
        });

        // Generate thumbnail
        this.router.add("GET", "/api/thumbnail/:path", async (req, params) => {
            try {
                const path = params.path;

                if (!path) {
                    return this.errorResponse(new Error("No path specified"));
                }

                const entry = await this.akaiGrid.getEntry(path);
                const thumbnailPath = await entry.generateThumbnail();
                const res = serveFile(req, thumbnailPath);

                res.then((res) => {
                    const s = 86400 * 30; // cache 30 days
                    res.headers.set("Cache-Control", `public, max-age=${s}`);
                });

                return res;
            } catch (error) {
                return serveFile(req, placeholderImagePath);
            }
        });
    }

    errorResponse(error: unknown, status = 400) {
        const res = Response.json({
            status: false,
            error: (error instanceof Error) ? error.message : "Unknown error",
        }, {
            status,
        });
        allowDevAllOrigin(res);
        return res;
    }

    /**
     * Run the server
     */
    async run(callback?: (url: string) => void) {
        if (this.hostname !== "localhost" && this.hostname !== "127.0.0.1") {
            log.warn("Hostname is not localhost, this is not recommended!");
            log.warn("This application is intended to be run in localhost only! Do not expose it to the internet!");
        }

        try {
            this.server = Deno.serve({
                hostname: this.hostname,
                port: this.port,
                signal: this.abortController.signal,
                onListen() {
                    const url = `http://${this.hostname}:${this.port}`;
                    log.info(`Server is running at ${url}`);
                    if (callback) {
                        callback(url);
                    }
                },
            }, async (request) => {
                let response = await this.router.match(request);

                if (response) {
                    return response;
                }

                const pathname = new URL(request.url).pathname;

                // start with /api
                if (pathname.startsWith("/api")) {
                    return new Response("404 Not Found", { status: 404 });
                }

                response = await serveDir(request, {
                    fsRoot: this.frontendDir,
                    urlRoot: "",
                    quiet: true,
                });

                if (response.status === 404) {
                    // If the file is not found, serve the index.html file
                    const indexPath = path.join(this.frontendDir, "index.html");
                    response = await serveFile(request, indexPath);
                }

                return response;
            });
            this.server.finished.then(() => {
                log.info("Server closed");
            });
        } catch (error) {
            log.error("Error starting server: " + error);
            log.info("This application will be closed in 10 seconds.");
            await sleep(10000);
            Deno.exit(1);
        }
    }

    async close() {
        log.info("Closing server...");
        this.abortController.abort();
        await this.akaiGrid.close();
    }
}
