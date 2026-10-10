/**
 * 全局 QueryClient 单例与默认策略（M4-T02）。
 *
 * 默认策略（设计 §3.4）：
 * - `retry`：401/403/404 **不重试**；网络错误重试 1 次（避免长挂起）；
 * - `refetchOnWindowFocus: false`：管理平台无需窗口聚焦即重取（避免打断表单输入）；
 * - `staleTime`：会话/权限 5min、列表 30s、dashboard 60s（各 hook 可覆写）。
 */
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/error";

/** 会话/权限类数据的默认新鲜期（毫秒）。 */
export const STALE_SESSION = 5 * 60 * 1000;
/** 列表类数据的默认新鲜期（毫秒）。 */
export const STALE_LIST = 30 * 1000;
/** 仪表盘数据的默认新鲜期（毫秒）。 */
export const STALE_DASHBOARD = 60 * 1000;

/**
 * 全局重试策略：鉴权/权限/不存在类错误不重试，其余最多重试 1 次。
 *
 * @param failureCount 已失败次数
 * @param error 失败原因
 * @returns 是否继续重试
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if ([401, 403, 404].includes(error.statusCode)) {
      return false;
    }
  }
  return failureCount < 1;
}

/**
 * 全局 QueryClient 单例。
 *
 * 注：401 的统一处理（清会话 + 跳登录）在请求层中间件完成（`src/api/client.ts`），
 * Query 层只负责重试策略，避免「薄封装」与 Query 的重试逻辑双重跳转。
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: STALE_SESSION,
    },
    mutations: {
      retry: false,
    },
  },
});
