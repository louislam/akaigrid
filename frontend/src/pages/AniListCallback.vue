<script setup lang="ts">
import { inject, onMounted, ref } from "vue";
import { baseURL } from "../util.ts";

const fetchSettings = inject<() => Promise<void>>("fetchSettings");
const status = ref<"loading" | "success" | "error">("loading");
const message = ref("");

onMounted(async () => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("access_token");
    if (!token) {
        status.value = "error";
        message.value = "No access token found in URL.";
        return;
    }

    try {
        const response = await fetch(baseURL + "/api/anilist/token?token=" + encodeURIComponent(token), { method: "POST" });
        if (response.ok) {
            await fetchSettings();
            status.value = "success";
            message.value = "Authorization successful!";
        } else {
            const data = await response.json();
            status.value = "error";
            message.value = data.error || "Failed to store access token.";
        }
    } catch (err) {
        status.value = "error";
        message.value = "Network error: " + (err instanceof Error ? err.message : "Unknown error");
    }
});
</script>

<template>
    <div>
        <div class="row justify-content-center">
            <div class="col-md-6 text-center mt-5">
                <div v-if='status === "loading"' class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Processing authorization...</span>
                </div>
                <div v-else-if='status === "success"' class="fs-4 text-success">
                    {{ message }}
                </div>
                <div v-else class="fs-4 text-danger">
                    {{ message }}
                </div>
                <div v-if='status !== "loading"' class="mt-3">
                    <router-link to="/settings">Back to Settings</router-link>
                </div>
            </div>
        </div>
    </div>
</template>
