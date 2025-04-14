import * as path from "@std/path";
import * as fs from "@std/fs";
import { log } from "../util.ts";
let instance: Deno.Kv | undefined;

export async function initKv(appDataDir: string) {
    if (!instance) {
        await fs.ensureDir(path.join(appDataDir, "data"));
        const kvPath = path.join(appDataDir, "data", "kv.db");
        instance = await Deno.openKv(kvPath);
    }
}

export function kv(): Deno.Kv {
    checkKv(instance);
    return instance;
}

export async function closeKv() {
    if (instance) {
        instance.close();
        instance = undefined;
    }
}

function checkKv(instance: Deno.Kv | undefined): asserts instance is Deno.Kv {
    if (!instance) {
        throw new Error("Kv not initialized. Call initDB() first.");
    }
}

export async function kvDeletePrefix(prefix: string) {
    checkKv(instance);

    const atomic = instance.atomic();

    const entries = instance.list({
        prefix: [prefix],
    });

    for await (const entry of entries) {
        atomic.delete(entry.key);
    }

    // Commit the atomic operation
    await atomic.commit();
}
