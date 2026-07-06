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
