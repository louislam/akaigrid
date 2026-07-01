import { isDev, log } from "./util.ts";
import { kv } from "./db/kv.ts";

export const ANILIST_ID = 44718;
export const ANILIST_API = "https://graphql.anilist.co";
export const ANILIST_AUTH_URL = "https://anilist.co/api/v2/oauth/authorize";
let proxyBaseURL = "https://akaigrid.kuma.pet";

if (isDev()) {
    proxyBaseURL = "http://localhost:60001";
}

export async function getMediaID(name: string): Promise<number | null> {
    const body = JSON.stringify({
        query: `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
          english
          native
        }
      }
    }
  `,
        variables: { search: name },
    });

    const res = await fetch(ANILIST_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body,
    });

    if (!res.ok) {
        log.error(`AniList API error: ${res.status} ${res.statusText}`);
        return null;
    }

    const json = await res.json();

    if (json.errors) {
        for (const err of json.errors) {
            log.error(`AniList API error: ${err.message}`);
        }
        return null;
    }

    const media = json.data?.Media;
    if (!media) {
        log.warn(`No AniList media found for "${name}"`);
        return null;
    }

    log.debug(`AniList match for "${name}": ID ${media.id} - ${media.title?.romaji ?? media.title?.english ?? name}`);
    return media.id as number;
}

export function getAuthURL(callback: string): string {
    const proxyUrl = new URL(`${proxyBaseURL}/anilist-auth-proxy`);
    proxyUrl.searchParams.set("callback", callback);
    return proxyUrl.toString();
}

export function getActualAuthURL(): string {
    const authURL = new URL(ANILIST_AUTH_URL);
    authURL.searchParams.set("client_id", String(ANILIST_ID));
    authURL.searchParams.set("response_type", "code");
    return authURL.toString();
}

export async function storeAuthCode(code: string) {
    await kv().set(["anilist", "code"], code);
}

export async function getAuthCode(): Promise<string | null> {
    const entry = await kv().get<string>(["anilist", "code"]);
    return entry.value;
}
