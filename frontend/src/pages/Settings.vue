<script setup lang="ts">
import { onMounted, ref } from "vue";
import { baseURL, notifyError, notifySuccess } from "../util.ts";

const settings = ref<{ authURL: string; anilistConfigured: boolean; aniListUsername?: string } | null>(null);

async function disconnectAniList() {
    try {
        const response = await fetch(baseURL + "/api/anilist/token?token=", { method: "POST" });
        if (response.ok) {
            await fetchSettings();
            notifySuccess("AniList disconnected");
        } else {
            const data = await response.json();
            notifyError(data.error || "Failed to disconnect");
        }
    } catch (err) {
        notifyError(err);
    }
}

async function fetchSettings() {
    try {
        const response = await fetch(baseURL + "/api/settings");
        if (response.ok) {
            settings.value = await response.json();
        } else {
            const data = await response.json();
            notifyError(data.error || "Failed to load settings");
        }
    } catch (err) {
        notifyError(err);
    }
}

onMounted(fetchSettings);
</script>

<template>
    <div>
        <p>Connect your AniList account to track your anime progress.</p>
        <p v-if="settings?.aniListUsername">Logged in as: <strong>{{ settings.aniListUsername }}</strong></p>
        <a v-if="settings?.authURL && !settings?.anilistConfigured" :href="settings.authURL" class="btn btn-primary">
            <font-awesome-icon :icon='["fas", "arrow-up-right-from-square"]' class="me-1" />
            Connect AniList
        </a>
        <button v-else-if="settings?.anilistConfigured" class="btn btn-danger" @click="disconnectAniList">
            Disconnect AniList
        </button>
    </div>
</template>
