import { QueryClient } from "@tanstack/react-query";

/**
 * 全局 QueryClient 单例。
 *
 * 默认策略：
 * - `retry: 1`：仅重试一次，避免后端不可达时长时间挂起；
 * - `refetchOnWindowFocus: false`：管理平台无需窗口聚焦即重取（避免打断表单输入）。
 *
 * 注：401 的统一处理与「首屏主动探测不跳登录」的区分策略由 T02 的请求层实现。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
