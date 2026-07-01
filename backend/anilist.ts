import { AnimeInfoSchema, isDev, log, type AnimeInfo } from "./util.ts";
import { kv } from "./db/kv.ts";

let id: string = "44718";
export const ANILIST_API = "https://graphql.anilist.co";
export const ANILIST_AUTH_URL = "https://anilist.co/api/v2/oauth/authorize";

let customID = Deno.env.get("ANILIST_ID");
if (customID) {
    log.info(`Using custom AniList ID: ${customID}`);
    id = customID;
} else if (isDev()) {
    // use dev id for dev mode
    id = "44744";
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
    const authURL = new URL(ANILIST_AUTH_URL);
    authURL.searchParams.set("client_id", String(id));
    authURL.searchParams.set("response_type", "token");
    return authURL.toString();
}

export async function storeToken(token: string) {
    await kv().set(["anilist", "token"], token);
}

export async function getToken(): Promise<string | null> {
    const entry = await kv().get<string>(["anilist", "token"]);
    return entry.value;
}

export async function isConfigured(): Promise<boolean> {
    const entry = await kv().get<string>(["anilist", "token"]);
    return !!entry.value;
}

export async function getUsername(): Promise<string | null> {
    const token = await getToken();
    if (!token) return null;

    const query = `query { Viewer { name } }`;
    const res = await fetch(ANILIST_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.Viewer?.name ?? null;
}

export async function getAnimeInfo(mediaId: number): Promise<AnimeInfo | null> {
    const token = await getToken();

    const query = `
    query ($mediaId: Int) {
      Media(id: $mediaId) {
        title {
          userPreferred
          romaji
          english
          native
        }
        coverImage {
          large
        }
        episodes
        mediaListEntry {
          status
          progress
        }
      }
    }
  `;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(ANILIST_API, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables: { mediaId } }),
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

    const parsed = AnimeInfoSchema.safeParse(json.data?.Media);

    if (!parsed.success) {
        log.error("AniList info parse error: " + parsed.error.message);
        return null;
    }

    return parsed.data;
}

export async function updateProgress(mediaId: number, progress: number): Promise<boolean> {
    const token = await getToken();
    if (!token) return false;

    const query = `
    mutation ($mediaId: Int, $progress: Int) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress) {
        id
        progress
      }
    }
  `;

    const res = await fetch(ANILIST_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables: { mediaId, progress } }),
    });

    if (!res.ok) {
        log.error(`AniList API error: ${res.status} ${res.statusText}`);
        return false;
    }

    const json = await res.json();
    if (json.errors) {
        for (const err of json.errors) {
            log.error(`AniList API error: ${err.message}`);
        }
        return false;
    }

    return !!json.data?.SaveMediaListEntry;
}

export async function updateStatus(mediaId: number, status: string): Promise<boolean> {
    const token = await getToken();
    if (!token) return false;

    const query = `
    mutation ($mediaId: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status) {
        id
        status
      }
    }
  `;

    const res = await fetch(ANILIST_API, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables: { mediaId, status } }),
    });

    if (!res.ok) {
        log.error(`AniList API error: ${res.status} ${res.statusText}`);
        return false;
    }

    const json = await res.json();
    if (json.errors) {
        for (const err of json.errors) {
            log.error(`AniList API error: ${err.message}`);
        }
        return false;
    }

    return !!json.data?.SaveMediaListEntry;
}
