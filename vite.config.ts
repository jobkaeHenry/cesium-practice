import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import cesium from "vite-plugin-cesium";
import gltf from "vite-plugin-gltf";

// https://vitejs.dev/config/
export default defineConfig({
  preview: { open:true },
  plugins: [vue(), cesium(), gltf()],
});
