<script setup lang="ts">
import { BButton } from "bootstrap-vue-next";
</script>

<template>
    <div>
        <div class="container-fluid">
            <div class="akaigrid-navbar">
                <router-link class="navbar-brand" to="/">
                    <span class="akai">Akai</span>
                    <sup>Grid</sup>
                </router-link>

                <div class="toolbar">
                    <router-link to="/settings">
                        <BButton pill title="Settings" active>
                            <font-awesome-icon :icon='["fas", "gear"]' />
                        </BButton>
                    </router-link>
                </div>
            </div>

            <router-view />
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "../styles/vars.scss";
</style>
