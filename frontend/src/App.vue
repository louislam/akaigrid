<script setup>
import { onMounted, provide, ref } from "vue";
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

onMounted(fetchSettings);

provide("settings", settings);
provide("fetchSettings", fetchSettings);
</script>

<template>
    <router-view />
</template>

<style scoped>
</style>
