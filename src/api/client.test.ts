/**
 * 单测：401 中间件 / 探测端点 / 跳登录（QA 报告 TD-03）。
 *
 * 验证 T02 验收项「401 触发清会话 + 跳登录」：
 * - 业务请求 401 → `clearSession()` + 跳 `/login?returnTo=...`；
 * - 探测端点（`/api/currentUser`、`/api/permissions/me`）401 → **不清会话、不跳转**；
 * - 已在 `/login` 或 `/login/...` → 不重复跳转（防死循环）；
 * - 非 401（403/500）→ 不跳转；
 * - `Authorization: Bearer` 注入。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "@/api/client";
import { useSessionStore } from "@/stores/sessionStore";

/**
 * 中间件回调的公共参数（`openapi-fetch` 的 `MiddlewareCallbackParams`）。
 *
 * `options` 为 `MergedOptions`，测试中只关心中间件自身逻辑，故按测试替身断言。
 */
const callbackParams = {
  schemaPath: "/api/x",
  params: {},
  options: { baseUrl: "", parseAs: "json" },
  id: "test-request",
} as unknown as Parameters<NonNullable<typeof authMiddleware.onRequest>>[0];

/** 调用中间件的 onRequest 钩子并取回 Request。 */
async function runOnRequest(url: string): Promise<Request> {
  const request = new Request(url);
  const onRequest = authMiddleware.onRequest;
  if (onRequest === undefined) throw new Error("authMiddleware.onRequest 未实现");
  const result = await onRequest({ ...callbackParams, request });
  return result as Request;
}

/** 调用中间件的 onResponse 钩子。 */
async function runOnResponse(status: number, url: string): Promise<Response> {
  const response = new Response(null, { status });
  // 真实 fetch 的 response.url 为请求 URL；jsdom 下不可写，故用 defineProperty 还原
  Object.defineProperty(response, "url", { value: url, configurable: true });
  const onResponse = authMiddleware.onResponse;
  if (onResponse === undefined) throw new Error("authMiddleware.onResponse 未实现");
  const result = await onResponse({ ...callbackParams, request: new Request(url), response });
  return result as Response;
}

/** jsdom 下 `window.location.assign` 不可直接赋值，用 spy 拦截。 */
function spyOnAssign(): ReturnType<typeof vi.fn> {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname: "/devices", search: "?page=2", assign },
    writable: true,
    configurable: true,
  });
  return assign;
}

describe("authMiddleware.onRequest —— Bearer 注入", () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it("有 token 时注入 Authorization: Bearer", async () => {
    useSessionStore.getState().login("tok-123", null);
    const request = await runOnRequest("http://localhost/api/devices");
    expect(request.headers.get("Authorization")).toBe("Bearer tok-123");
  });

  it("无 token 时不注入 Authorization（cookieAuth 由浏览器携带）", async () => {
    const request = await runOnRequest("http://localhost/api/devices");
    expect(request.headers.get("Authorization")).toBeNull();
  });
});

describe("authMiddleware.onResponse —— 401 处理", () => {
  beforeEach(() => {
    useSessionStore.getState().clear();
  });

  it("★ 业务请求 401：清会话 + 跳登录并保留 returnTo", async () => {
    const assign = spyOnAssign();
    useSessionStore.getState().login("tok", null);
    await runOnResponse(401, "http://localhost/api/devices");
    expect(useSessionStore.getState().token).toBeNull();
    expect(assign).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith("/login?returnTo=%2Fdevices%3Fpage%3D2");
  });

  it("★ 探测端点 401（/api/currentUser）：不清会话、不跳转", async () => {
    const assign = spyOnAssign();
    useSessionStore.getState().login("tok", null);
    await runOnResponse(401, "http://localhost/api/currentUser");
    expect(useSessionStore.getState().token).toBe("tok");
    expect(assign).not.toHaveBeenCalled();
  });

  it("★ 探测端点 401（/api/permissions/me）：不清会话、不跳转", async () => {
    const assign = spyOnAssign();
    useSessionStore.getState().login("tok", null);
    await runOnResponse(401, "http://localhost/api/permissions/me");
    expect(useSessionStore.getState().token).toBe("tok");
    expect(assign).not.toHaveBeenCalled();
  });

  it("★ 已在 /login：不重复跳转（防循环）", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { pathname: "/login", search: "", assign },
      writable: true,
      configurable: true,
    });
    await runOnResponse(401, "http://localhost/api/devices");
    expect(assign).not.toHaveBeenCalled();
  });

  it("403 / 500 不跳转、不清会话（交页面处理）", async () => {
    const assign = spyOnAssign();
    useSessionStore.getState().login("tok", null);
    await runOnResponse(403, "http://localhost/api/devices");
    await runOnResponse(500, "http://localhost/api/devices");
    expect(assign).not.toHaveBeenCalled();
    expect(useSessionStore.getState().token).toBe("tok");
  });

  it("200 正常返回原 response", async () => {
    const assign = spyOnAssign();
    const response = await runOnResponse(200, "http://localhost/api/devices");
    expect(response.status).toBe(200);
    expect(assign).not.toHaveBeenCalled();
  });
});
