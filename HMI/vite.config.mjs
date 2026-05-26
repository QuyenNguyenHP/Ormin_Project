import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    watch: {
      ignored: ["**/backend/database/**"],
    },
    proxy: {
      "/api": "http://127.0.0.1:8001",
    },
  },
  build: {
    outDir: "build",
  },
  plugins: [react()],
});
