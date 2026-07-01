import { assertEquals } from "jsr:@std/assert";
import { getAuthURL, getMediaID } from "./anilist.ts";

Deno.test("getMediaID live - Attack on Titan", async () => {
    const id = await getMediaID("Attack on Titan");
    assertEquals(id, 16498);
});

// Test native name リラックマ
Deno.test("getMediaID live - Test Native Name", async () => {
    const id = await getMediaID("リラックマ");
    assertEquals(id, 183231);
});
