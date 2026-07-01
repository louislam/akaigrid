<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { baseURL } from "../util.ts";

const route = useRoute();
const status = ref<"loading" | "success" | "error">("loading");
const message = ref("");

onMounted(async () => {
    const code = route.query.code as string | undefined;
    if (!code) {
        status.value = "error";
        message.value = "No authorization code found in URL.";
        return;
    }

    try {
        const url = baseURL + "/api/anilist/auth-code?code=" + encodeURIComponent(code);
        const response = await fetch(url, { method: "POST" });
        if (response.ok) {
            status.value = "success";
            message.value = "Authorization successful! You can close this tab.";
        } else {
            const data = await response.json();
            status.value = "error";
            message.value = data.error || "Failed to exchange authorization code.";
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
            </div>
        </div>
    </div>
</template>
