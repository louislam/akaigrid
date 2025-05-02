import { assertEquals, assertLess } from "jsr:@std/assert";
import { escapeString, generateThumbnail, getMPCHCMediaHistory, getRFEHash, getVideoInfo } from "./util.ts";
import * as fs from "@std/fs";

Deno.test("test escapeString", () => {
    let str = "C:\\Program Files\\My App\\myapp.exe";
    let escapedStr = escapeString(str);
    assertEquals(escapedStr, `"C:\\Program Files\\My App\\myapp.exe"`);

    // Test with quotes in the string
    str = 'C:\\Program Files\\My App\\"myapp.exe"';
    escapedStr = escapeString(str);
    assertEquals(escapedStr, `"C:\\Program Files\\My App\\""myapp.exe"""`);
});

Deno.test("test getRFEHash", () => {
    let expected = "ofa9Jmo2014n";
    let path = "C:\\uptime kuma.mp4";
    let actual = getRFEHash(path);
    assertEquals(actual, expected);
});

// Test generateThumbnail
// It requires ffmpeg and a video to test, so it is ignored by default
// Change "ignore" to "only" to run the test
Deno.test.ignore("test generateThumbnail", async () => {
    const path = "C:\\uptime kuma.mp4";
    const thumbnailPath = "img.jpg";
    await generateThumbnail(path, thumbnailPath);

    // Check if the thumbnail file exists
    const fileExists = await fs.exists(thumbnailPath);

    assertEquals(fileExists, true);

    // Clean up the thumbnail file
    await Deno.remove(thumbnailPath);
});

Deno.test("test getMPCHCMediaHistory", async () => {
    const path = "E:\\Dropbox\\My Videos\\mp4.avi";
    const result = await getMPCHCMediaHistory(path);
    console.log(result);
});

Deno.test.ignore("test getVideoInfo", async () => {
    const path = "E:\\Dropbox\\My Videos\\mp4.avi";
    const result = await getVideoInfo(path);
    console.log(result);
});
