<script setup lang="ts">
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
    <div class="container-fluid">
        <router-view />
    </div>
</template>

<style lang="scss" scoped>
</style>
