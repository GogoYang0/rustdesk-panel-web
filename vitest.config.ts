import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Vitest 配置（M4-T01 就绪，具体用例自 T02 起补充）
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // 允许「暂无用例」时不报错：T01 仅搭骨架，用例自 T02 起补充。
    // 否则 CI 的 test 步骤会因 exit 1 变红（QA 验证报告 M-1）。
    passWithNoTests: true,
    css: false,
  },
});
