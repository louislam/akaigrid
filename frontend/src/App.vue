<script setup>
import { computed, onMounted, provide, ref } from "vue";
import { baseURL } from "./util.ts";

const settings = ref(null);

async function fetchSettings() {
    try {
        const res = await fetch(baseURL + "/api/settings");
        if (res.ok) {
            settings.value = await res.json();
        }
    } catch {}
}

const tokenExpiring = computed(() => {
    const d = settings.value?.aniListTokenDaysRemaining;
    return d != null && d > 0 && d <= 30;
});

onMounted(fetchSettings);

provide("settings", settings);
provide("fetchSettings", fetchSettings);
</script>

<template>
    <div>
        <div v-if="tokenExpiring && settings?.authURL" class="token-warning">
            AniList token expires in {{ settings.aniListTokenDaysRemaining }} days —
            <a :href="settings.authURL">Renew now</a>
        </div>
        <router-view />
    </div>
</template>

<style scoped>
.token-warning {
    background: #f39c12;
    color: #111;
    text-align: center;
    padding: 8px;
    font-size: 0.9rem;
}
.token-warning a {
    color: inherit;
    font-weight: 700;
    text-decoration: underline;
}
</style>
