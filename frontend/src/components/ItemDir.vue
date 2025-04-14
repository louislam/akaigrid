<script setup lang="ts">
import { computed, ref } from "vue";
import { BButton } from "bootstrap-vue-next";
import { encodeRequestPath } from "../../../common/util";
import { baseURL } from "../util";

const props = defineProps({
    "item": { type: Object, required: true },
    "view": { type: String, required: true },
    "itemSize": { type: String, required: true },
});

const itemClass = computed(() => {
    let obj = {
        "item": true,
    };

    // View
    if (props.view === "grid") {
        obj["grid"] = true;
    } else if (props.view === "list") {
        obj["list"] = true;
    }

    // Done?
    if (props.item.done) {
        obj["done"] = true;
    }

    return obj;
});

function getRequestPath() {
    return encodeRequestPath(props.item.absolutePath);
}
</script>

<template>
    <div>
        <router-link :class="itemClass" :to='{ name: "list", params: { requestPath: getRequestPath() } }'>
            <div class="thumbnail">
                <font-awesome-icon :icon='["fas", "folder"]' class="mt-3 ms-3 folder-icon" />
                <img loading="lazy" :src='baseURL + "/api/thumbnail/" + encodeURIComponent(props.item.absolutePath)' alt />
            </div>
            <div class="mt-1">
                {{ props.item.name }}
            </div>
        </router-link>
    </div>
</template>

<style lang="scss" scoped>
.thumbnail {
    overflow: hidden;

    .folder-icon {
        position: absolute;
        z-index: 1;
        filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}
</style>
