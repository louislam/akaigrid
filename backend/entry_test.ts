import { assertEquals } from "jsr:@std/assert";
import { Entry } from "./entry.ts";
import * as path from "@std/path";
import { Buffer } from "node:buffer";
import { AkaiGrid } from "./akaigrid.ts";

const akaiGrid: AkaiGrid = await AkaiGrid.createInstance("./tmp");

globalThis.onunload = async () => {
    await akaiGrid.close();
};

Deno.test("Test hash", async () => {
    // LICENSE file
    const name = "LICENSE";
    const p = path.join(Deno.cwd(), name);
    const stat = await Deno.stat(p);

    const entry = new Entry({
        name,
        isDirectory: stat.isDirectory,
        isFile: stat.isFile,
        absolutePath: p,
        akaiGrid,
    });

    // By another software (sha1)
    //const sha1 = "18b288f151ad8e8db2446046c14b3bad3e818199";

    // Convert to base64url format
    //const buffer = Buffer.from(sha1, "hex");
    //const hash = buffer.toString("base64url");

    const size = Math.floor(1066 / 1024);
    const hexSize = size.toString(16);
    const id = await entry.getID();

    // Ends with id
    assertEquals(id.endsWith("_" + hexSize), true);

    // TODO test hashed absolutePath, but absolutePath is different in different machines, no idea how to test it.
});

Deno.test.ignore("Test Entry toDisplayObject", async () => {
    // LICENSE file
    const name = "mp4.avi";
    const p = "E:\\Dropbox\\My Videos\\mp4.avi";
    const stat = await Deno.stat(p);

    const entry = new Entry({
        name,
        isDirectory: stat.isDirectory,
        isFile: stat.isFile,
        absolutePath: p,
        akaiGrid,
    });

    console.log(await entry.toDisplayObject(false));
});
