import { log } from "./util.ts";

const ANILIST_API = "https://graphql.anilist.co";


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

export async function login() {

}
