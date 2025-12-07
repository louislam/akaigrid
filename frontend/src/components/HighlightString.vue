<script setup lang="ts">
import { computed, ref } from "vue";

const props = defineProps({
    "text": { type: String, required: true },
});

const array = computed(() => {
    // Split the ext
    let array = props.text.split(".");
    let ext;

    if (array.length > 1) {
        ext = "." + array.pop();
    }

    let name = array.join(".");

    // Convert the string to an array of words, splitting by numbers
    // Example input: "Hello123 World456.mp4"
    // output: ["Hello", "123", " World", "456", ".mp4"]
    const regex = /(\d+|\D+)/g;
    const matches = name.match(regex);
    if (matches) {
        array = matches.map((match) => {
            return match;
        });
    } else {
        array = [name];
    }

    // Push back the ext
    if (ext) {
        array.push(ext);
    }

    return array;
});
</script>

<template>
    <span>
        <span class="item-title">
            <template v-for="(item, index) in array" :key="index">
                <span v-if="item.match(/^\d+$/)" class="highlight">{{ item }}</span>
                <span v-else-if="index === array.length - 1" class="ext">{{ item }}</span>
                <span v-else>{{ item }}</span>
            </template>
        </span>
    </span>
</template>

<style scoped lang="scss">
@import "../styles/vars.scss";

.highlight {
    color: #ff9898;
    font-weight: bold;
}

.ext {
    color: #555;
}
</style>
