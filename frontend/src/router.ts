import { createRouter, createWebHistory } from "vue-router";

import Layout from "./layouts/Layout.vue";
import GeneralLayout from "./layouts/GeneralLayout.vue";
import Dashboard from "./pages/Dashboard.vue";
import List from "./pages/List.vue";
import AniListCallback from "./pages/AniListCallback.vue";
import Settings from "./pages/Settings.vue";
import { sleep } from "../../common/util.ts";

const routes = [
    {
        path: "/anilist/callback",
        component: Layout,
        children: [
            {
                path: "",
                component: GeneralLayout,
                children: [
                    {
                        name: "anilist-callback",
                        path: "",
                        component: AniListCallback,
                    },
                ],
            },
        ],
    },
    {
        name: "settings",
        path: "/settings",
        component: Layout,
        children: [
            {
                path: "",
                component: GeneralLayout,
                children: [
                    {
                        path: "",
                        component: Settings,
                    },
                ],
            },
        ],
    },
    {
        path: "/empty",
        component: Layout,
        children: [
            {
                path: "",
                component: Dashboard,
                children: [
                    {
                        name: "home",
                        path: "/",
                        component: List,
                    },
                    {
                        name: "list",
                        path: "/list/:requestPath",
                        component: List,
                    },
                ],
            },
        ],
    },
];

export const router = createRouter({
    linkActiveClass: "active",
    history: createWebHistory(),
    routes,
    async scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            while (true) {
                await sleep(500);

                // @ts-ignore document must be defined in browser
                let element = document.querySelectorAll(".item");

                if (element.length > 0) {
                    savedPosition.behavior = "instant";
                    return savedPosition;
                }
            }
        } else {
            return { top: 0 }; // Default behavior
        }
    },
});
