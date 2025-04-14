import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueDevTools from "vite-plugin-vue-devtools";

export default defineConfig({
    server: {
        port: 60000,
        strictPort: true,
    },
    define: {},
    root: "./frontend",
    build: {
        outDir: "../frontend-dist",
        emptyOutDir: true,
    },
    plugins: [
        vue(),
        VueDevTools(),
    ],
});
