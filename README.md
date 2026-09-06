# rustdesk-panel-web

RustDesk Panel Web 控制台（React 19 + Vite 7 + Semi Design）。

- 页面与权限模型对齐参考项目 rustdesk-console-web 的功能面，UI 全部以 Semi Design 重新实现。
- React 19 适配：入口最顶部导入 `@douyinfe/semi-ui/react19-adapter`（官方方案）。
- API client 将由后端 `openapi.yaml` 单一契约源生成（openapi-typescript / orval）。

## 本地开发

```sh
pnpm install
pnpm dev        # http://localhost:5173 ，/api 代理到 http://localhost:8080
pnpm build      # 产物 dist/
```

## 发布形态

- `rustdesk-panel-web_<version>_dist.tar.gz`（release / pre-release 附件）
- nightly 为覆盖式 Prerelease（保留最近 14 天 artifact）

## 稳定性提醒

> ⚠️ 本项目主版本号目前为 **0**，处于开发阶段，**不保证稳定性**。如遇 bug 或其他影响使用的问题，欢迎提出 issue。（M6 正式收口时将随首个版本 v0.1.0 完善本声明。）

## 测试

- 单元测试：`pnpm test`（Vitest）。
- E2E（Cypress，全 mock 后端、可独立运行）：
  - `pnpm e2e:headless`：headless 跑全量（需先 `pnpm build && pnpm preview --port 4173`）；
  - `pnpm e2e:p0`：仅 P0 关键链路；
  - 浏览器基线：Chrome / Edge 现代版本（Chromium 99+，OQ-6：不引入 CSS layer polyfill）；CI 使用 Chrome。
  - 根容器环境运行 Cypress 需 X server（`xvfb-run -a`）；Chrome 需 `--no-sandbox`（可用包装脚本后 `--browser <脚本路径>`）。
- 契约生成：`pnpm gen:api`（依赖同级目录 `../rustdesk-panel-api/openapi.yaml`）。
