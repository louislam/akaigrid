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

Deno.test("login returns proxy URL with callback", () => {
    const url = getAuthURL("http://localhost:60001/anilist/callback");
    console.log(url);
    assertEquals(url, "https://akaigrid.kuma.pet/api/anilist-auth-proxy?callback=http%3A%2F%2Flocalhost%3A60001%2Fanilist%2Fcallback");
});
