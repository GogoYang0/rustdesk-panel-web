// React 19 + Semi 适配（官方方案）：必须在任何 Semi 组件导入之前
// 注入 createRoot，使 Modal.confirm / Toast / Notification 等命令式 API 正常工作。
// 参见 https://semi.design/zh-CN/ecosystem/react19
import "@douyinfe/semi-ui/react19-adapter";

import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
ReactDOM.createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
