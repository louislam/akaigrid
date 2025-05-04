import { createRouter, createWebHistory } from "vue-router";

import Layout from "./layouts/Layout.vue";
import Dashboard from "./pages/Dashboard.vue";
import List from "./pages/List.vue";
import { sleep } from "../../common/util.ts";

const routes = [
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
            console.log("Restoring scroll position:", savedPosition);

            while (true) {
                // @ts-ignore document must be defined in browser
                let element = document.querySelectorAll(".item");

                if (element.length > 0) {
                    savedPosition.behavior = "instant";
                    return savedPosition;
                }

                await sleep(100);
            }
        } else {
            return { top: 0 }; // Default behavior
        }
    },
});
