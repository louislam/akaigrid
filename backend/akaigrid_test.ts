import { assertEquals } from "jsr:@std/assert";
import { AkaiGrid } from "./akaigrid.ts";

Deno.test("Test appdata dir", async () => {
    // Create a temporary directory
    const tempDir = Deno.makeTempDirSync();

    // Create an instance of AkaiGrid
    const akaiGrid = await AkaiGrid.createInstance(tempDir);

    // Check if the appDataDir is set correctly
    assertEquals(akaiGrid.appDataDir, tempDir);

    await akaiGrid.close();

    // Clean up
    Deno.removeSync(tempDir, { recursive: true });
});
