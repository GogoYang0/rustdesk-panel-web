/**
 * API 运行时薄 client（M4-T02）。
 *
 * 基于 `openapi-fetch`：类型安全的 fetch 薄封装（零依赖，使用原生 fetch）。
 * 职责：
 *   1. JWT 注入（`Authorization: Bearer`）—— 从 sessionStore 读取（非 React 上下文）；
 *   2. cookieAuth 由浏览器同源自动携带（`access_token` cookie），**不手工设置**；
 *   3. 401 统一处理：清会话 + 跳登录（保留 returnTo）；
 *   4. 403 交由页面渲染「无权限」，不在此跳转。
 *
 * ⚠️ 契约红线：`baseUrl` 置空字符串（同源），dev 下由 Vite proxy 转发 `/api`。
 */
import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "@/types/api-types";
import { clearSession, getSessionToken } from "@/stores/sessionStore";

/**
 * 判断某 URL 是否为「主动探测」端点。
 *
 * `POST /api/currentUser` 与 `GET /api/permissions/me` 在**未登录首屏**返回 401 属正常态，
 * 不应触发跳转循环（由路由守卫处理，而非请求中间件）。
 *
 * @param url 请求 URL
 * @returns 是否为静默探测端点
 */
function isProbeEndpoint(url: string): boolean {
  return url.includes("/api/currentUser") || url.includes("/api/permissions/me");
}

/**
 * 统一跳登录（保留 `returnTo`）。
 *
 * 使用 `location.assign` 而非 React Router navigate：本函数在非 React 上下文（中间件）调用，
 * 且 401 跳转属整页级行为。已在登录页时不重复跳转，避免循环。
 *
 * @param fromPath 触发 401 的路径 + 查询串
 */
function redirectToLogin(fromPath: string): void {
  if (typeof window === "undefined") return;
  const { pathname } = window.location;
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return;
  }
  const target = fromPath && fromPath.length > 0 ? fromPath : pathname;
  const loginUrl = `/login?returnTo=${encodeURIComponent(target)}`;
  window.location.assign(loginUrl);
}

/**
 * 鉴权中间件：注入 Bearer token，处理 401。
 */
export const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getSessionToken();
    if (token) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    // cookieAuth（access_token）由浏览器同源自动携带，无需手工设置。
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401) {
      const url = response.url ?? "";
      if (!isProbeEndpoint(url)) {
        // 业务请求 401：清会话 + 跳登录
        clearSession();
        redirectToLogin(`${window.location.pathname}${window.location.search}`);
      }
    }
    // 403 不跳转：交由页面渲染「无权限」（路由守卫或 <NoPermission />）
    return response;
  },
};

/**
 * 全局 API 客户端实例（同源，dev 走 Vite proxy）。
 */
export const api = createClient<paths>({ baseUrl: "" });

api.use(authMiddleware);
