<script setup lang="ts">
import { computed, inject } from "vue";
import { baseURL, notifyError, notifySuccess } from "../util.ts";

interface Settings {
    authURL: string;
    anilistConfigured: boolean;
    aniListUsername?: string;
    aniListTokenExpiresAt?: number | null;
    aniListTokenDaysRemaining?: number | null;
}

const settings = inject<Settings | null>("settings");
const fetchSettings = inject<() => Promise<void>>("fetchSettings");

const expiryDate = computed(() => {
    if (!settings.value?.aniListTokenExpiresAt) return null;
    return new Date(settings.value.aniListTokenExpiresAt).toLocaleDateString();
});

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
    <div v-if="settings">
        <p>Connect your AniList account to track your anime progress.</p>

        <!-- Not configured -->
        <a v-if="!settings.anilistConfigured" :href="settings.authURL" class="btn btn-primary">
            <font-awesome-icon :icon='["fas", "arrow-up-right-from-square"]' class="me-1" />
            Connect AniList
        </a>

        <!-- Configured -->
        <div>
            <p>
                Logged in as: <strong>{{ settings.aniListUsername }}</strong><br />
                Token Status: {{ settings.aniListTokenDaysRemaining > 0 ? "Expires in " + settings.aniListTokenDaysRemaining + " days " : "expired" }}
                <strong>({{ expiryDate }})</strong>
            </p>

            <div v-if="settings?.anilistConfigured" class="d-flex gap-2">
                <a :href="settings.authURL" class="btn btn-primary">
                    <font-awesome-icon :icon='["fas", "arrow-up-right-from-square"]' class="me-1" />
                    Renew
                </a>
                <button class="btn btn-danger" @click="disconnectAniList">
                    Disconnect AniList
                </button>
            </div>
        </div>
    </div>
</template>
