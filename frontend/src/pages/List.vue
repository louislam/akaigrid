<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { BAlert, BButton, BButtonGroup, BFormInput, BNavbar, BNavForm, BSpinner } from "bootstrap-vue-next";
import { baseURL } from "../util";
import { useRoute, useRouter } from "vue-router";
import ItemDir from "../components/ItemDir.vue";
import ItemFile from "../components/ItemFile.vue";
import { decodeRequestPath, encodeRequestPath, isEmptyObject, sortObjectAsArray } from "../../../common/util";
import { notify } from "@kyvg/vue3-notification";

const route = useRoute();
const router = useRouter();

const list = ref([]);
const previousDir = ref("");
const historyLength = ref(0);
const disableBack = ref(false);
const disableForward = ref(false);
const isTopLevel = ref(false);
const loading = ref(false);
const loadingFull = ref(false);
const path = ref("");
const pageType = ref((route.fullPath === "/") ? "home" : "list");
const dirConfig = ref({});
const errorMessage = ref("");
const searchKeyword = ref("");

// computed isList
const isList = computed(() => {
    return pageType.value === "list";
});

const disableUpper = computed(() => {
    return pageType.value === "home";
});

const listClass = computed(() => {
    let obj = {
        "mb-3": true,
    };

    if (dirConfig.value.view === "grid") {
        obj["grid-view"] = true;
    } else if (dirConfig.value.view === "list") {
        obj["list-view"] = true;
    }

    if (dirConfig.value.itemSize === "small") {
        obj["view-small"] = true;
    } else if (dirConfig.value.itemSize === "medium") {
        obj["view-medium"] = true;
    } else if (dirConfig.value.itemSize === "large") {
        obj["view-large"] = true;
    }

    return obj;
});

const sortedList = computed(() => {
    if (pageType.value === "home" || dirConfig.value.sort === undefined) {
        return list.value;
    }
    console.log("sorting");
    let sortedList = sortObjectAsArray(list.value, dirConfig.value);
    return sortedList;
});

// For home only
const hasInvalidFolders = computed(() => {
    if (pageType.value !== "home") {
        return false;
    }

    for (let key in list.value) {
        if (list.value[key].size == -1) {
            return true;
        }
    }
    return false;
});

// Watch path, update the page title
watch(path, (newPath) => {
    if (pageType.value === "home") {
        document.title = "AkaiGrid";
    } else {
        document.title = newPath + " - AkaiGrid";
    }
});

let popstateHandler = () => {
    historyLength.value = window.history.length;
    disableBack.value = window.history.state?.back === null;
    disableForward.value = window.history.state?.forward === null;
};

popstateHandler();

// Add a listener to update the history length
window.addEventListener("popstate", popstateHandler);

onBeforeUnmount(() => {
    window.removeEventListener("popstate", popstateHandler);
});

if (pageType.value === "home") {
    path.value = "Home";
    loadHomeData();
} else {
    if (typeof route.params.requestPath === "string") {
        path.value = decodeRequestPath(route.params.requestPath);
        loadListData();
    } else {
        notify({
            title: "Path is not a string",
            type: "error",
        });
    }
}

async function sortByName() {
    dirConfig.value.sort = "name";
    await updateDirConfig();
}

async function sortByDate() {
    dirConfig.value.sort = "dateAccessed";
    await updateDirConfig();
}

async function asc() {
    dirConfig.value.order = "asc";
    await updateDirConfig();
}

async function desc() {
    dirConfig.value.order = "desc";
    await updateDirConfig();
}

async function listView() {
    dirConfig.value.view = "list";
    await updateDirConfig();
}

async function gridView() {
    dirConfig.value.view = "grid";
    await updateDirConfig();
}

async function itemSizeSmall() {
    dirConfig.value.itemSize = "small";
    await updateDirConfig();
}

async function itemSizeMedium() {
    dirConfig.value.itemSize = "medium";
    await updateDirConfig();
}

async function itemSizeLarge() {
    dirConfig.value.itemSize = "large";
    await updateDirConfig();
}

async function refresh() {
    if (pageType.value === "home") {
        await loadHomeData();
    } else {
        await loadListData();
    }
}

async function loadHomeData() {
    loading.value = true;
    errorMessage.value = "";

    const response = await fetch(baseURL + `/api/home`);
    if (response.ok) {
        let data = await response.json();
        list.value = data.list;
        dirConfig.value = data.dirConfig;
    } else {
        errorMessage.value = "Failed to fetch list data";
    }
    loading.value = false;
}

/**
 * Getting all info is a bit slower due to reading the video info and windows registry to get the last position
 * My concept here:
 * First request = basic info (faster, basically just ls) and then it display the list to th user.
 * Second request = extra info (slower, reading video info and reading windows registry) and then merge it to the previous list
 */
async function loadListData() {
    if (loadingFull.value) {
        return;
    }

    errorMessage.value = "";
    loadingFull.value = true;
    loading.value = true;

    try {
        // Get the list with basic info (faster)
        let data = await getListData(false);
        loading.value = false;

        dirConfig.value = data.dirConfig;
        isTopLevel.value = data.isTopLevel;
        previousDir.value = data.previousDir;
        list.value = data.list;

        // Get the list with extra info (slower)
        data = await getListData(true);

        for (let key in list.value) {
            if (list.value[key]) {
                list.value[key].extraInfo = data.list[key].extraInfo;
            }
        }
    } catch (error) {
        errorMessage.value = "Failed to fetch list data: " + error.message;
    }

    loadingFull.value = false;
    loading.value = false;
}

async function getListData(extraInfo = false) {
    const escapedPath = encodeURIComponent(path.value);
    let url = baseURL + `/api/list/` + escapedPath;

    const params = new URLSearchParams();

    if (!isEmptyObject(dirConfig.value)) {
        params.append("dirConfig", JSON.stringify(dirConfig.value));
    }

    if (extraInfo) {
        params.append("extraInfo", "true");
    }

    if (params.size > 0) {
        url += "?" + params.toString();
    }

    let data;
    const response = await fetch(url);
    if (response.ok) {
        data = await response.json();
    } else if (response.status === 400) {
        let obj = await response.json();
        throw new Error(obj.error);
    } else {
        throw new Error("Failed to fetch list data");
    }

    return data;
}

async function updateDirConfig() {
    const escapedPath = encodeURIComponent(path.value);
    const response = await fetch(baseURL + "/api/dir-config/" + escapedPath, {
        method: "POST",
        body: JSON.stringify(dirConfig.value),
    });

    if (!response.ok) {
        notify({
            title: "Failed to update dir config",
            type: "error",
        });
    }
}

// history api previous page
function previous() {
    router.back();
}

function forward() {
    router.forward();
}

function upper() {
    const historyBackPath = window.history.state?.back;

    // vue router go to previousDir
    if (previousDir.value) {
        const targetPath = "/list/" + encodeRequestPath(previousDir.value);

        // Since we want to keep the scroll position, if they are same, use history.back().
        if (historyBackPath === targetPath) {
            router.back();
        } else {
            router.push(targetPath);
        }
    } else {
        // Since we want to keep the scroll position, if they are same, use history.back().
        if (historyBackPath === "/") {
            router.back();
        } else {
            // go to home
            router.push({
                name: "home",
            });
        }
    }
}

/**
 * Open the current path in the file explorer
 */
async function openExplorer() {
    const response = await fetch(baseURL + "/api/open/" + encodeURIComponent(path.value), {
        method: "POST",
    });
    if (!response.ok) {
        notify({
            title: "Failed to open in explorer",
            type: "error",
        });
    } else {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
        }
    }
}

async function toggleFullscreen() {
    // Check if the browser supports the Fullscreen API
    if (document.documentElement.requestFullscreen) {
        // Toggle
        if (document.fullscreenElement) {
            // Exit fullscreen
            await document.exitFullscreen();
        } else {
            // Enter fullscreen
            await document.documentElement.requestFullscreen();
        }
    } else {
        notify({
            title: "Fullscreen not supported",
            type: "error",
        });
    }
}

async function setDone(item) {
    const currentDone = item.done;
    // Flip it
    const yes = !currentDone;

    // Update the item
    item.done = yes;

    const response = await fetch(baseURL + "/api/done/" + encodeURIComponent(item.absolutePath) + "/" + yes, {
        method: "POST",
    });
    if (!response.ok) {
        // Revert the item
        item.done = currentDone;
        notify({
            title: "Failed to set done",
            type: "error",
        });
    }
}
</script>

<template>
    <div>
        <div class="akaigrid-navbar">
            <router-link class="navbar-brand" to="/">
                <span class="akai">Akai</span>
                <sup>Grid</sup>
            </router-link>

            <!-- Toolbar -->
            <div class="toolbar">
                <BButtonGroup>
                    <BButton @click="previous" :disabled="disableBack" title="Back">
                        <font-awesome-icon :icon='["fas", "arrow-left"]' />
                    </BButton>
                    <BButton @click="forward" :disabled="disableForward" title="Forward">
                        <font-awesome-icon :icon='["fas", "arrow-right"]' />
                    </BButton>
                    <BButton @click="upper" title="Up" :disabled="disableUpper">
                        <font-awesome-icon :icon='["fas", "arrow-up"]' />
                    </BButton>
                </BButtonGroup>

                <BButton pill @click="refresh">
                    <font-awesome-icon :icon='["fas", "arrows-rotate"]' />
                </BButton>

                <BButtonGroup v-if="isList">
                    <BButton @click="sortByName" :active='dirConfig.sort === "name"'>A-Z</BButton>
                    <BButton @click="sortByDate" :active='dirConfig.sort === "dateAccessed"'>Date Accessed</BButton>
                </BButtonGroup>

                <BButtonGroup v-if="isList">
                    <BButton @click="asc" :active='dirConfig.order === "asc"'>
                        <font-awesome-icon :icon='["fas", "caret-up"]' />
                    </BButton>
                    <BButton @click="desc" :active='dirConfig.order === "desc"'>
                        <font-awesome-icon :icon='["fas", "caret-down"]' />
                    </BButton>
                </BButtonGroup>

                <BButtonGroup v-if="isList">
                    <BButton title="List" @click="listView" :active='dirConfig.view === "list"'>
                        <font-awesome-icon :icon='["fas", "list"]' />
                    </BButton>
                    <BButton title="Grid" @click="gridView" :active='dirConfig.view === "grid"'>
                        <font-awesome-icon :icon='["fas", "table-cells-large"]' />
                    </BButton>
                </BButtonGroup>

                <BButtonGroup v-if="isList">
                    <BButton @click="itemSizeSmall" :active='dirConfig.itemSize === "small"'>Small</BButton>
                    <BButton @click="itemSizeMedium" :active='dirConfig.itemSize === "medium"'>Medium</BButton>
                    <BButton @click="itemSizeLarge" :active='dirConfig.itemSize === "large"'>Large</BButton>
                </BButtonGroup>

                <BButton pill @click="openExplorer" v-if="isList" title="Open in Explorer">
                    <font-awesome-icon :icon='["fas", "folder-open"]' class="me-1" /> Open in Explorer
                </BButton>

                <BButton pill @click="toggleFullscreen" title="Toggle Fullscreen">
                    <font-awesome-icon :icon='["fas", "expand"]' />
                </BButton>
            </div>

            <BSpinner type="grow" v-if="loadingFull" variant="primary" class="spinner" />

            <!-- Not implemented yet -->
            <BFormInput placeholder="Search..." class="search" v-model="searchKeyword" v-if="false" />
        </div>

        <div class="address-bar mb-3">
            <span>{{ path }}</span>
        </div>

        <!-- Alert -->
        <BAlert :model-value="true" class="mb-3" variant="warning" v-if="hasInvalidFolders">
            Some Folder(s) is/are not found. Please edit `config.yaml` to add your video folders.<br />
            Reload this page to see the changes.
        </BAlert>

        <BAlert :model-value="true" class="mb-3" variant="danger" v-if="errorMessage">{{ errorMessage }}</BAlert>

        <div :class="listClass">
            <div v-for="(item, index) in sortedList" :key="item.name">
                <ItemDir v-if="item.isDirectory" :item="item" :view="dirConfig.view" :itemSize="dirConfig.itemSize" @contextmenu.prevent="setDone(item)" />
                <ItemFile v-if="item.isFile" :item="item" :lazy-load="index >= 5" :view="dirConfig.view" :itemSize="dirConfig.itemSize" @contextmenu.prevent="setDone(item)" />
            </div>
        </div>

        <div v-if="!loadingFull && !loading && Object.values(list).length == 0" class="text-center my-5">
            No items
        </div>
    </div>
</template>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.akaigrid-navbar {
    height: 59px;
    margin: 10px 0;
    position: sticky;
    top: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: space-between;
    column-gap: 10px;
    backdrop-filter: blur(10px);

    .toolbar {
        flex-grow: 4;
        display: flex;
        column-gap: 10px;

        button {
            text-wrap: nowrap;
        }
    }
}

.address-bar {
    background-color: $akaigrid-dark;
    padding: 10px 20px;
    border-radius: $border-radius;
    transition: all 0.3s ease-in-out;
    display: flex;
}

.grid-view {
    $gap: 0px;
    $columns: 5;
    display: grid;
    gap: $gap;
    grid-template-columns: repeat($columns, calc(100% / $columns - $gap));

    &.view-small {
        $columns: 8;
        grid-template-columns: repeat($columns, calc(100% / $columns - $gap));
    }

    &.view-large {
        $columns: 3;
        grid-template-columns: repeat($columns, calc(100% / $columns - $gap));
    }
}

.spinner {
    min-width: 32px;
}

.search {
    //max-width: 150px;
}
</style>
