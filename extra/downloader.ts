/*
 * Original source code by Rabbit Company
 * https://github.com/Rabbit-Company/Downloader-JS/blob/main/src/downloader.ts
 */
import fs from "node:fs/promises";
import nodePath from "node:path";

/**
 * HTTP Methods enum.
 */
enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    DELETE = "DELETE",
    PATCH = "PATCH",
    HEAD = "HEAD",
    OPTIONS = "OPTIONS",
}

/**
 * Configuration options for the Downloader class.
 */
interface DownloaderConfig {
    /**
     * The URL of the file to download.
     */
    url: string;

    /**
     * The local file path where the downloaded file will be saved.
     */
    destinationPath: string;

    /**
     * HTTP method to use for the download request. Defaults to "GET".
     */
    method?: HttpMethod;

    /**
     * Custom headers for the download request, including optional authorization and other headers.
     * This can be used to pass authentication tokens, custom user agents, or other HTTP headers.
     */
    headers?: Record<string, string>;

    /**
     * The body of the request, which can be used for methods like POST, PUT, etc.
     * This allows sending data in the request body, such as JSON payloads, form data, or other types of content.
     */
    body?: any;

    /**
     * Size of each download chunk in bytes. Defaults to 10 MB.
     */
    chunkSize?: number;

    /**
     * Time in milliseconds to wait before retrying a failed request. Defaults to 5000 ms.
     */
    retryTimeout?: number;

    /**
     * Maximum number of retries for failed requests. Defaults to 120 retries.
     */
    maxRetries?: number;
}

/**
 * A class to handle large file downloads with support for various runtimes
 * (Node.js, Deno, Bun) and progress tracking.
 */
class Downloader {
    private url: string;
    private destinationPath: string;
    private method: HttpMethod;
    private headers: Record<string, string>;
    private body: any;
    private chunkSize: number;
    private retryTimeout: number;
    private maxRetries: number;
    private totalSize: number = 0;
    private downloadedSize: number = 0;
    private lastTime: number = Date.now();
    private lastDownloadedSize: number = 0;
    private progressCallback?: (progress: number, speed: number) => void;

    /**
     * Creates a new instance of the Downloader class.
     * @param {DownloaderConfig} config - Configuration options for the downloader.
     */
    constructor(config: DownloaderConfig) {
        this.url = config.url;
        this.destinationPath = config.destinationPath;
        this.method = config.method || HttpMethod.GET;
        this.headers = config.headers || {};
        this.body = config.body;
        this.chunkSize = config.chunkSize || 10 * 1024 * 1024;
        this.retryTimeout = config.retryTimeout || 5000;
        this.maxRetries = config.maxRetries || 120;
    }

    /**
     * Starts the download process.
     * @param {(progress: number, speed: number) => void} [progressCallback] - Callback with progress and download speed (in bytes per second).
     * @returns {Promise<void>}
     */
    async download(progressCallback?: (progress: number, speed: number) => void): Promise<boolean> {
        this.progressCallback = progressCallback;

        if (!this.destinationPath) {
            throw new Error("destinationPath is required.");
        }

        await this.deleteFile(this.destinationPath);

        const file = await this.openFile(this.destinationPath);

        try {
            const headers = this.headers;
            headers["Range"] = "bytes=0-0";

            const response = await fetch(this.url, {
                method: this.method,
                headers,
                body: this.body,
            });

            this.totalSize = parseInt(response.headers.get("content-range")?.split("/")[1] || "0");
            if (!this.totalSize) {
                throw new Error("Unable to determine file size.");
            }

            this.downloadedSize = 0;

            while (this.downloadedSize < this.totalSize) {
                const end = Math.min(this.downloadedSize + this.chunkSize - 1, this.totalSize - 1);

                let response;
                let retries = 0;
                let success = false;

                while (!success && retries < this.maxRetries) {
                    try {
                        const chunkHeaders = this.headers;
                        chunkHeaders["Range"] = `bytes=${this.downloadedSize}-${end}`;

                        response = await fetch(this.url, {
                            method: this.method,
                            headers: chunkHeaders,
                            body: this.body,
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to download chunk, status code: ${response.status}`);
                        }

                        if (!response.body) {
                            throw new Error("Response body is empty.");
                        }

                        success = true;
                    } catch (err) {
                        retries++;
                        await this.delay(this.retryTimeout);
                    }
                }

                if (!success || !response?.body) {
                    throw new Error("Failed to download chunk after multiple retries.");
                }

                const writable = file.writable.getWriter();
                const reader = response.body.getReader();

                try {
                    while (true) {
                        const { value, done } = await reader.read();
                        if (done) break;

                        let writeRetries = 0;
                        let writeSuccess = false;

                        while (!writeSuccess && writeRetries < this.maxRetries) {
                            try {
                                await writable.write(value);
                                writeSuccess = true;
                            } catch (err) {
                                writeRetries++;
                                await this.delay(this.retryTimeout);
                            }
                        }

                        if (!writeSuccess) {
                            throw new Error("Failed to write chunk after multiple retries.");
                        }

                        this.downloadedSize += value.length;

                        const now = Date.now();
                        if (now - this.lastTime > 1000) {
                            const speed = this.getDownloadSpeed();
                            if (this.progressCallback) {
                                this.progressCallback(this.getProgress(), speed);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Error processing chunk:", err);
                    throw err;
                } finally {
                    writable.releaseLock();
                    reader.releaseLock?.();
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                throw new Error(`Request to server failed: ${err.message}`);
            } else {
                throw new Error(`Request to server failed: ${err}`);
            }
        }

        try {
            await file.writable.close();
        } catch (_) {}

        const getFileSize = await this.getFileStats(this.destinationPath);
        if (getFileSize?.size === this.totalSize) return true;

        throw new Error(`Downloaded file (${getFileSize?.size} bytes) does not match requested one (${this.totalSize} bytes).`);
    }

    /**
     * Opens a file for writing.
     * @param {string} path - The path to the file.
     * @returns {Promise<{ writable: WritableStream }>} A file handle with a writable stream.
     */
    private async openFile(path: string): Promise<{ writable: WritableStream }> {
        try {
            await fs.mkdir(nodePath.dirname(path), { recursive: true });

            const handle = await fs.open(path, "a");
            const writableNodeStream = handle.createWriteStream();

            const webWritable = new WritableStream({
                write(chunk) {
                    return new Promise<void>((resolve, reject) => {
                        writableNodeStream.write(chunk, (err) => {
                            if (err) {
                                reject(new Error(`Write error: ${err.message}`));
                            } else {
                                resolve();
                            }
                        });
                    });
                },
                close() {
                    writableNodeStream.end();
                },
                abort(err) {
                    writableNodeStream.destroy(err);
                },
            });

            return { writable: webWritable };
        } catch {
            throw new Error(`Failed to open file`);
        }
    }

    /**
     * Gets file statistics, such as size, using runtime-specific APIs.
     * @param {string} path - The file path.
     * @returns {Promise<{ size: number } | null>} The file stats or null if the file doesn't exist.
     */
    private async getFileStats(path: string): Promise<{ size: number } | null> {
        try {
            const stats = await fs.stat(path);
            return { size: stats.size };
        } catch {
            return null;
        }
    }

    /**
     * Deletes the file at the given path.
     * @param {string} path - The path to the file to delete.
     * @returns {Promise<void>}
     */
    private async deleteFile(path: string): Promise<void> {
        try {
            await fs.rm(path);
        } catch {}
    }

    /**
     * Delays execution for a given time in milliseconds.
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>}
     */
    private async delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Gets the current download progress as a percentage.
     * @returns {number} The download progress percentage (0-100).
     */
    getProgress(): number {
        return (this.downloadedSize / this.totalSize) * 100 || 0;
    }

    /**
     * Gets the current download speed in bytes per second.
     * @returns {number} The current download speed (bytes/second).
     */
    getDownloadSpeed(): number {
        const now = Date.now();
        const elapsedTime = (now - this.lastTime) / 1000;

        if (elapsedTime <= 0) return 0;

        const bytesDownloaded = this.downloadedSize - this.lastDownloadedSize;

        this.lastTime = now;
        this.lastDownloadedSize = this.downloadedSize;

        return bytesDownloaded / elapsedTime;
    }
}

export { Downloader, type DownloaderConfig, HttpMethod };
