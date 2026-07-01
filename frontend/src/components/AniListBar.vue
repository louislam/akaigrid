<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { baseURL, notifyError, notifySuccess } from "../util.ts";

const props = defineProps<{
    dirPath: string;
    aniListMediaID?: number;
}>();

// UI state
const loading = ref(false);
const infoLoading = ref(false);
const statusLoading = ref(false);
const manualId = ref("");
const selectedStatus = ref("");
const selectedProgress = ref(0);

// Derive folder name for autosearch
const dirName = computed(() => props.dirPath.split(/[\\/]/).pop() || props.dirPath);
const searchURL = computed(() => "https://anilist.co/search/anime?search=" + encodeURIComponent(dirName.value));

// Fetched anime data from backend
const animeInfo = ref<{
    title: string;
    thumbnail: string;
    episodes: number | null;
    userStatus: string | null;
    userProgress: number | null;
} | null>(null);

// AniList media list status enum with display labels
const STATUSES: Record<string, string> = {
    CURRENT: "Watching",
    REPEATING: "Rewatching",
    COMPLETED: "Completed",
    PAUSED: "Paused",
    DROPPED: "Dropped",
    PLANNING: "Planning",
};

// Fetch anime info when media ID changes
watch(() => props.aniListMediaID, async (id) => {
    if (id) {
        await fetchAnimeInfo(id);
    } else {
        animeInfo.value = null;
    }
}, { immediate: true });

watch(animeInfo, (info) => {
    selectedStatus.value = info?.userStatus ?? "";
    selectedProgress.value = info?.userProgress ?? 0;
}, { immediate: true });

watch(selectedStatus, async (status) => {
    if (!props.aniListMediaID || !status) return;
    if (animeInfo.value && status === animeInfo.value.userStatus) return;
    await updateStatus(status);
});

watch(selectedProgress, async (progress) => {
    if (!props.aniListMediaID || Number.isNaN(progress)) return;
    if (animeInfo.value && progress === animeInfo.value.userProgress) return;
    await updateProgress(progress);
});

/** Fetch anime info from backend */
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

/** Unlink media from directory config */
async function unlinkAniList() {
    try {
        const res = await fetch(baseURL + "/api/anilist/unlink?dir=" + encodeURIComponent(props.dirPath), { method: "POST" });
        if (res.ok) {
            animeInfo.value = null;
            notifySuccess("Unlinked from AniList", "anilist");
        } else {
            const data = await res.json();
            notifyError(data.error || "Failed to unlink", "anilist");
        }
    } catch (err) {
        notifyError(err, "anilist");
    }
}

/** Link or manually assign media ID */
async function linkAniList() {
    loading.value = true;
    try {
        let url = baseURL + "/api/anilist/link?dir=" + encodeURIComponent(props.dirPath);
        if (manualId.value) {
            url += "&mediaId=" + manualId.value;
        }
        const res = await fetch(url, { method: "POST" });
        const data = await res.json();
        if (res.ok) {
            manualId.value = "";
            notifySuccess("Linked to AniList ID " + data.mediaId, "anilist");
            await fetchAnimeInfo(data.mediaId);
        } else {
            notifyError(data.error || "Failed to link", "anilist");
        }
    } catch (err) {
        notifyError(err, "anilist");
    } finally {
        loading.value = false;
    }
}

/** Send progress update to AniList */
async function updateProgress(progress: number) {
    if (!props.aniListMediaID) return;
    statusLoading.value = true;
    try {
        const res = await fetch(baseURL + "/api/anilist/progress?mediaId=" + props.aniListMediaID + "&progress=" + progress, { method: "POST" });
        if (res.ok) {
            animeInfo.value!.userProgress = progress;
        } else {
            const data = await res.json();
            notifyError(data.error || "Failed to update progress", "anilist");
        }
    } catch (err) {
        notifyError(err, "anilist");
    } finally {
        statusLoading.value = false;
    }
}

/** Send status update to AniList */
async function updateStatus(status: string) {
    if (!props.aniListMediaID) return;
    statusLoading.value = true;
    try {
        const res = await fetch(baseURL + "/api/anilist/status?mediaId=" + props.aniListMediaID + "&status=" + status, { method: "POST" });
        if (res.ok) {
            animeInfo.value!.userStatus = status;
            notifySuccess("Status updated", "anilist");
        } else {
            const data = await res.json();
            notifyError(data.error || "Failed to update status", "anilist");
        }
    } catch (err) {
        notifyError(err, "anilist");
    } finally {
        statusLoading.value = false;
    }
}
</script>

<template>
    <div class="bar" v-if="dirPath !== 'Home'">
        
        <!-- Linked -->
        <div v-if="animeInfo" class="info">
            <img v-if="animeInfo.thumbnail" :src="animeInfo.thumbnail" class="thumb" alt />
            <div class="details">
                <div class="title">{{ animeInfo.title }}</div>
                <a :href="'https://anilist.co/anime/' + props.aniListMediaID" target="_blank">Open AniList Page</a>
                <div class="status-row">
                    
                    <!-- Status -->
                    <select v-model="selectedStatus" class="status-select" :disabled="statusLoading">
                        <option value="" disabled>Set status</option>
                        <option v-for="(label, key) in STATUSES" :key="key" :value="key">{{ label }}</option>
                    </select>
                    
                    <!-- Episodes Select -->
                    <select v-if="animeInfo.episodes != null" v-model="selectedProgress" class="progress-select" :disabled="statusLoading">
                        <option v-for="n in animeInfo.episodes + 1" :key="n - 1" :value="n - 1">{{ n - 1 }}</option>
                    </select>
                    
                    <!-- Episode input when no max -->
                    <input v-else v-model.lazy.number="selectedProgress" type="number" class="progress-input" :disabled="statusLoading" min="0" />
                    <span class="progress-total">/ {{ animeInfo.episodes ?? '?' }}</span>
                </div>
            </div>
            <button class="btn btn-sm ms-2" style="background: none; border: none; color: #888; font-size: 0.8rem;" @click="unlinkAniList" title="Unlink">Unlink</button>
        </div>
        
        <!-- Not Linked -->
        <div v-else-if="!loading && !infoLoading" class="info not-linked">
            <div class="details">
                <div class="link-row">
                    <input v-model="manualId" type="number" class="manual-input me-2" placeholder="Optional / Anime ID" />
                    <button class="btn btn-primary btn-sm" @click="linkAniList">Link AniList</button>
                </div>
                <div class="search-row">
                    <span class="tip" title="Link AniList will automatically search the folder name. If the match is wrong, you can manually enter the AniList ID. Use Search on AniList to find the correct ID.">?</span>
                    <a :href="searchURL" target="_blank">Search on AniList</a>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.bar {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 1000;
}

.info {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(12px);
    padding: 16px 32px;
    border-radius: $border-radius;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    &.not-linked {
        padding-bottom: 10px;
    }
}

.thumb {
    width: 40px;
    height: 56px;
    object-fit: cover;
    border-radius: 4px;
}

.details {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.title {
    font-weight: 600;
    font-size: 0.9rem;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

a {
    font-size: 0.8rem;
    color: #888;
    text-decoration: none;
}
a:hover {
    color: #fff;
    text-decoration: underline;
}

.status-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

input, select {
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.1);
    color: #aaa;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 2px 4px;
    box-sizing: border-box;
}
select {
    cursor: pointer;
}

.progress-select,
.progress-input {
    width: 60px;
}

.progress-input {
    -moz-appearance: textfield;
}

.progress-total {
    font-size: 0.8rem;
    color: #aaa;
}

.link-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

.search-row {
    display: flex;
    align-items: center;
    gap: 4px;
}

.tip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 0.7rem;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #888;
    cursor: help;
    margin-right: 2px;
}

.manual-input {
    width: 120px;
    padding: 4px 6px;
    height: 31px;
}
</style>
