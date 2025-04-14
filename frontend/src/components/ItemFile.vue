<script setup lang="ts">
import { computed, ref } from "vue";
import { BBadge, BButton } from "bootstrap-vue-next";
import { baseURL } from "../util";
import { formatTime } from "../../../common/util";
import HighlightString from "./HighlightString.vue";

const props = defineProps({
    "item": { type: Object, required: true },
    "lazyLoad": { type: Boolean, required: false, default: true },
    "view": { type: String, required: true },
    "itemSize": { type: String, required: true },
});

const duration = computed(() => {
    if (props.item.extraInfo.videoInfo) {
        return formatTime(props.item.extraInfo.videoInfo.duration);
    } else {
        return null;
    }
});

const resolution = computed(() => {
    if (props.item.extraInfo.videoInfo) {
        const width = props.item.extraInfo.videoInfo.width;
        const height = props.item.extraInfo.videoInfo.height;
        return `${width}x${height}`;
    } else {
        return null;
    }
});

const lastPosition = computed(() => {
    if (props.item.extraInfo.videoInfo) {
        return props.item.extraInfo.lastPosition / props.item.extraInfo.videoInfo.duration * 100;
    } else {
        return null;
    }
});

const showExtraInfo = computed(() => {
    if (props.item.extraInfo.videoInfo) {
        return {
            visibility: "visible",
        };
    } else {
        return {
            visibility: "hidden",
        };
    }
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

    // Size
    if (props.itemSize === "small") {
        obj["small"] = true;
    } else if (props.itemSize === "medium") {
        obj["medium"] = true;
    } else if (props.itemSize === "large") {
        obj["large"] = true;
    }

    // Done?
    if (props.item.done) {
        obj["done"] = true;
    }

    return obj;
});

async function open() {
    const response = await fetch(baseURL + "/api/open/" + encodeURIComponent(props.item.absolutePath), {
        method: "POST",
    });
    if (!response.ok) {
        console.error("Failed to open file");
    }
}
</script>

<template>
    <div @click.prevent="open" :class="itemClass">
        <div class="thumbnail">
            <img :loading='(props.lazyLoad) ? "lazy" : "eager"' :src='baseURL + "/api/thumbnail/" + encodeURIComponent(props.item.absolutePath)' alt />
            <div class="progress" v-if="lastPosition > 0">
                <div class="progress-current" :style='{ width: lastPosition + "%" }'></div>
            </div>
        </div>
        <div class="mt-1">
            <div><HighlightString :text="props.item.name" /></div>
            <div :style="showExtraInfo" class="extraInfo">
                <BBadge variant="secondary">{{ duration }}</BBadge>
                <BBadge variant="secondary" class="ms-2">{{ resolution }}</BBadge>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.extraInfo {
    height: 27px;
}
</style>
