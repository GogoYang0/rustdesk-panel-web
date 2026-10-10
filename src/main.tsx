// T01：M4 入口文件。
// ⚠️ 首三行的 import 顺序是官方强约束，禁止调整（详见设计 §2.6 与 §8 共享知识第 6 条）。

// 1) CSS Layer 顺序声明 —— 官方要求「所有其他 import 之前」，故放第一行。
//    它只声明层顺序（theme < base < semi < utilities），不含任何 Semi 组件代码，
//    因此不会违反 react19-adapter 的「任何 Semi 组件之前」约束。
import "./styles/semi-layer.css";

// 2) React 19 × Semi 适配 —— 官方要求「任何 Semi 组件导入之前」。
//    注入 createRoot，使 Modal.confirm() / Toast / Notification 等命令式 API
//    在 React 19（已移除 ReactDOM.render）下可用。
//    参见 https://semi.design/zh-CN/ecosystem/react19
import "@douyinfe/semi-ui/react19-adapter";

// 3) Tailwind 入口（含 @import "tailwindcss" 与 @theme/body/暗色变体）。
//    官方要求：semi-layer.css 必须位于「任何含 @import "tailwindcss"; 的文件」之前 —— 已由第 1 行满足。
import "./styles/tailwind.css";

// 3.5) 全站补充样式（依赖 Tailwind/已就绪的层顺序，位于业务入口之前）。
import "./styles/app.css";

// 4) 业务入口。此后方可引入 Semi 组件与其它 CSS。
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./api/queryClient";
import i18n from "./i18n"; // i18next 初始化（无副作用依赖 CSS）
import App from "./App";

// 同步 `<html lang>` 与 i18next 的**初始**语言。
// 之所以放在入口而非 `useI18n`：`useI18n` 的副作用只在挂载它的布局中执行（当前为 TopBar），
// 而登录页 / 403 / 404 等公开路由不挂该布局，会导致 `<html lang>` 停留在 index.html 的默认值。
// 此处覆盖首屏，后续语言**切换**仍由 `useI18n` 负责（其副作用已覆盖全站已挂载场景）。
document.documentElement.lang = i18n.language;

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("找不到挂载节点 #root，请检查 index.html");
}

ReactDOM.createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
