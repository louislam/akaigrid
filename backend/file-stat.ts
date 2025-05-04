import { Cache } from "jsr:@lambdalisue/ttl-cache";

/**
 * TTL: 60s
 * Since file size and date modified are not changed frequently, we can cache the result for a while to improve performance within a short time.
 */
const cache = new Cache<string, Deno.FileInfo>(60000);

/**
 * Same as Deno.stat, but with a cache.
 */
export async function statCache(path: string): Promise<Deno.FileInfo> {
    const cached = cache.get(path);
    if (cached) {
        return cached;
    }
    const fileInfo = await Deno.stat(path);
    cache.set(path, fileInfo);
    return fileInfo;
}

export async function clearStatCache(path: string) {
    cache.delete(path);
}

export async function clearAllStatCache() {
    cache.clear();
}
