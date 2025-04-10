import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    server: {
        port: 60000,
    },
    root: "./frontend",
    build: {
        outDir: "../frontend-dist",
    },
    plugins: [
        vue(),
    ],
});
