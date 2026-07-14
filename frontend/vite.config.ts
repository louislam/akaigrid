import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueDevTools from "vite-plugin-vue-devtools";
import { resolve } from "node:path";

export default defineConfig({
    server: {
        port: 60000,
        strictPort: true,
    },
    define: {},
    root: ".",
    build: {
        outDir: "../frontend-dist",
        emptyOutDir: true,
    },
    resolve: {
        alias: {
            "zod": resolve(__dirname, "node_modules/zod"),
            "natural-orderby": resolve(__dirname, "node_modules/natural-orderby"),
        },
    },
    plugins: [
        vue(),
        VueDevTools(),
    ],
});
