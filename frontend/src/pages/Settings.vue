<script setup lang="ts">
import { onMounted, ref } from "vue";
import { baseURL } from "../util.ts";
import { notify } from "@kyvg/vue3-notification";

const authURL = ref("");

onMounted(async () => {
    try {
        const response = await fetch(baseURL + "/api/settings");
        if (response.ok) {
            const data = await response.json();
            authURL.value = data.authURL || "";
        } else {
            const data = await response.json();
            notify({
                title: data.error || "Failed to load settings",
                type: "error",
            });
        }
    } catch (err) {
        notify({
            title: "Network error: " + (err instanceof Error ? err.message : "Unknown error"),
            type: "error",
        });
    }
});
</script>

<template>
    <div>
        <p>Connect your AniList account to track your anime progress.</p>
        <a v-if="authURL" :href="authURL" class="btn btn-primary">
            <font-awesome-icon :icon='["fas", "arrow-up-right-from-square"]' class="me-1" />
            Login with AniList
        </a>
    </div>
</template>
