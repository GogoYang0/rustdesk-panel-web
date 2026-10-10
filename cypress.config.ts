/**
 * Cypress 配置（M4-T07）。
 *
 * 设计要点（设计 §7 / 批复 OQ-3 / T07 交付范围）：
 * - E2E 采用 **cy.intercept 全 mock**，不依赖后端 api 进程，可独立跑绿；
 * - baseUrl 默认 `http://localhost:4173`（vite preview），CI 中先 build 再 preview；
 * - 本地 headless：`pnpm e2e`（Cypress 内置 Electron 或 `--browser <chrome路径>`）；
 * - 根容器环境如需 --no-sandbox，用 chrome 二进制包装脚本传入（见 README）。
 */
import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: process.env.CYPRESS_baseUrl ?? "http://localhost:4173",
    specPattern: "cypress/e2e/**/*.cy.ts",
    supportFile: "cypress/support/e2e.ts",
    viewportWidth: 1440,
    viewportHeight: 900,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    // 全量失败即停（P0 收口语义）；nightly 全量跑同一配置
    retries: { runMode: 0, openMode: 0 },
    setupNodeEvents(on) {
      on("task", {
        // 预留：后续接入报告插件（mochawesome 等）
        log(message: string) {
          console.log(message);
          return null;
        },
      });
    },
  },
});
