<script setup lang="ts">
import { ref, watch } from "vue";
import { baseURL, notifyError, notifySuccess } from "../util.ts";

const props = defineProps<{
    dirPath: string;
    aniListMediaID?: number;
}>();

const loading = ref(false);
const infoLoading = ref(false);
const animeInfo = ref<{
    title: string;
    thumbnail: string;
    episodes: number | null;
    userStatus: string | null;
    userProgress: number | null;
} | null>(null);

watch(() => props.aniListMediaID, async (id) => {
    if (id) {
        await fetchAnimeInfo(id);
    } else {
        animeInfo.value = null;
    }
}, { immediate: true });

async function fetchAnimeInfo(mediaId: number) {
    infoLoading.value = true;
    try {
        const res = await fetch(baseURL + "/api/anilist/info?mediaId=" + mediaId);
        if (res.ok) {
            animeInfo.value = await res.json();
        } else {
            animeInfo.value = null;
        }
    } catch {
        animeInfo.value = null;
    } finally {
        infoLoading.value = false;
    }
}

async function linkAniList() {
    loading.value = true;
    try {
        const res = await fetch(baseURL + "/api/anilist/link?dir=" + encodeURIComponent(props.dirPath), { method: "POST" });
        const data = await res.json();
        if (res.ok) {
            notifySuccess("Linked to AniList ID " + data.mediaId);
        } else {
            notifyError(data.error || "Failed to link");
        }
    } catch (err) {
        notifyError(err);
    } finally {
        loading.value = false;
    }
}
</script>

<template>
    <div class="anilist-bar" v-if="dirPath !== 'Home'">
        <div v-if="animeInfo" class="anilist-info">
            <img v-if="animeInfo.thumbnail" :src="animeInfo.thumbnail" class="anilist-thumb" />
            <div class="anilist-details">
                <div class="anilist-title">{{ animeInfo.title }}</div>
                <div v-if="animeInfo.episodes" class="anilist-episodes">{{ animeInfo.episodes }} episodes</div>
                <div v-if="animeInfo.userStatus" class="anilist-user-status">
                    {{ animeInfo.userStatus }}<span v-if="animeInfo.userProgress != null"> - {{ animeInfo.userProgress }} / {{ animeInfo.episodes ?? '?' }}</span>
                </div>
            </div>
        </div>
        <button v-else class="btn btn-primary btn-sm" :disabled="loading || infoLoading" @click="linkAniList">
            <span v-if="loading" class="spinner-border spinner-border-sm me-1"></span>
            Link AniList
        </button>
    </div>
</template>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.anilist-bar {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 1000;
}

.anilist-info {
    display: flex;
    align-items: center;
    gap: 8px;
    background: $akaigrid-dark;
    padding: 8px 12px;
    border-radius: $border-radius;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.anilist-thumb {
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
}

.anilist-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.anilist-title {
    font-weight: 600;
    font-size: 0.9rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.anilist-episodes {
    font-size: 0.8rem;
    color: #888;
}

.anilist-user-status {
    font-size: 0.8rem;
    color: #aaa;
}
</style>
