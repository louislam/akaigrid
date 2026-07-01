<script setup lang="ts">
import { inject } from "vue";
import { baseURL, notifyError, notifySuccess } from "../util.ts";

const settings = inject<{ authURL: string; anilistConfigured: boolean; aniListUsername?: string } | null>("settings");
const fetchSettings = inject<() => Promise<void>>("fetchSettings");

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
</script>

<template>
    <div>
        <p>Connect your AniList account to track your anime progress.</p>
        <p v-if="settings?.aniListUsername">Logged in as: <strong>{{ settings.aniListUsername }}</strong></p>
        <a v-if="!settings?.anilistConfigured && settings?.authURL" :href="settings.authURL" class="btn btn-primary">
            <font-awesome-icon :icon='["fas", "arrow-up-right-from-square"]' class="me-1" />
            Connect AniList
        </a>
        <button v-else-if="settings?.anilistConfigured" class="btn btn-danger" @click="disconnectAniList">
            Disconnect AniList
        </button>
    </div>
</template>
