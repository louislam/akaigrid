<script setup lang="ts">
import { useRoute } from "vue-router";
import { Notifications } from "@kyvg/vue3-notification";
const route = useRoute();
</script>

<template>
    <div>
        <!-- Add :key to disable vue router re-use the same component -->
        <router-view :key="route.fullPath" />

        <notifications position="bottom right" />
        <notifications group="anilist" position="bottom middle" />
    </div>
</template>

<style lang="scss" scoped>
</style>
