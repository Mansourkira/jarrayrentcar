import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  // three.js chunk is lazy-loaded with the showroom
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
