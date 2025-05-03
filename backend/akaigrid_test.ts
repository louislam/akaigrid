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

Deno.test("Test isAllowedPath", async () => {
    // Create a temporary directory
    const tempDir = Deno.makeTempDirSync();

    // Create an instance of AkaiGrid
    const akaiGrid = await AkaiGrid.createInstance(tempDir);

    let result = akaiGrid.isAllowedPath("C:\\MyExampleVideosFolder\\Animes\\");
    assertEquals(result, true);

    result = akaiGrid.isAllowedPath("C:\\MyExampleVideosFolder\\Animes");
    assertEquals(result, true);

    result = akaiGrid.isAllowedPath("C:\\NotAllowedFolder");
    assertEquals(result, false);

    result = akaiGrid.isAllowedPath("C:\\MyExampleVideosFolder\\..");
    assertEquals(result, false);

    result = akaiGrid.isAllowedPath("C:\\MyExampleVideosFolder\\..\\Animes");
    assertEquals(result, false);

    result = akaiGrid.isAllowedPath("C:\\MyExampleVideosFolder\\.\\Animes\\A\\B\\C");
    assertEquals(result, false);

    result = akaiGrid.isAllowedPath("/home/user/MyExampleVideosFolder/Animes/");
    assertEquals(result, false);

    await akaiGrid.close();

    // Clean up
    Deno.removeSync(tempDir, { recursive: true });
});
