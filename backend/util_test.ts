import { assertEquals } from "jsr:@std/assert@^1.0.16";
import { escapeString, generateThumbnail, getRFEHash, getShortHash, getVideoInfo, isSamePath, isSubPath } from "./util.ts";
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

Deno.test("test getShortHash", () => {
    const data = new TextEncoder().encode("test");
    const hash = getShortHash(data);
    assertEquals(typeof hash, "string");
    assertEquals(hash.length, 12);
    // Same input should produce same hash
    assertEquals(getShortHash(data), hash);
});

Deno.test("test isSubPath", () => {
    assertEquals(isSubPath("/home/user", "/home/user/documents/file.txt"), true);
    assertEquals(isSubPath("/home/user", "/home/user"), false);
    assertEquals(isSubPath("/home/user", "/home/other/file.txt"), false);
    assertEquals(isSubPath("/home/user", "/tmp/file.txt"), false);
    assertEquals(isSubPath("C:\\Videos", "C:\\Videos\\Anime\\episode.mkv"), true);
    assertEquals(isSubPath("C:\\Videos", "C:\\Other\\file.txt"), false);
});

Deno.test("test isSamePath", () => {
    assertEquals(isSamePath("/home/user", "/home/user"), true);
    assertEquals(isSamePath("/home/user", "/home/other"), false);
    assertEquals(isSamePath("C:\\Videos", "C:\\Videos"), true);
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

Deno.test.ignore("test getVideoInfo", async () => {
    const path = "E:\\Dropbox\\My Videos\\mp4.avi";
    const result = await getVideoInfo(path);
    console.log(result);
});
