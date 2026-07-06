import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// M0：Vite 7 + React 19 脚手架；/api 代理到本地 Go 后端。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
