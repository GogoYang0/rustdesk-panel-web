import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { semiCssLayer } from "./build/semiCssLayer";

// M4-T01：Vite 7 + React 19 + Semi Design + TailwindCSS v4 + Semi CSS Layer。
//
// 插件顺序为 react() → tailwindcss() → semiCssLayer()：
// - tailwindcss() 为 Tailwind v4 官方 Vite 插件（CSS-first，无需 tailwind.config.js）；
// - semiCssLayer() 放最后，确保其 transform 作用于 CSS 管线的较后阶段。
export default defineConfig({
  plugins: [react(), tailwindcss(), semiCssLayer()],
  resolve: {
    // 路径别名 `@/*` → `src/*`，必须与 tsconfig.json 的 paths 保持同步
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // 业务 API
      "/api": "http://localhost:8080",
      // 后端静态文件路由（nexus 产物下载走 GET /files/...）
      "/files": "http://localhost:8080",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
