/**
 * 单测：登录 action（M4-T04 验收项）。
 *
 * 覆盖（对应任务书「登录 action 的 pending/error 状态与分支（account / tfa_code）」）：
 * - account 分支：空凭据 → `credentialsRequired`（不发请求）；
 * - account 分支：账号直登成功（`access_token`）→ `ok=true` 且写入会话；
 * - account 分支：返回挑战（`type=email_check` + `secret`）→ 切 `step="tfa"` 并保存 secret；
 * - account 分支：既无 token 也无挑战 → `loginFailed`；
 * - account 分支：网络 / HTTP 错误 → 展示归一化错误文案（`ApiError.display`）；
 * - tfa_code 分支：验证码为空 → `tfaCodeRequired`；
 * - tfa_code 分支：验证码校验成功 → `ok=true` 且写入会话；
 * - tfa_code 分支：校验失败 → 保持 `step="tfa"` 并展示错误；
 * - 成功后 `sessionStore` 写入 token，`permissionStore` 写入权限快照；
 * - `pending`：由 `useActionState` 的 `isPending` 提供（此处验证 action 的异步契约 ——
 *   返回 Promise 且 resolve 前状态未被变更）。
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/error";
import { initialLoginState, loginAction, type LoginState } from "@/pages/auth/actions";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";

/** mocked 端点模块（避免真实网络）。 */
const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  currentUser: vi.fn(),
  myPermissions: vi.fn(),
}));

vi.mock("@/api/endpoints/auth", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/api/endpoints/auth");
  return {
    ...actual,
    login: mocks.login,
    currentUser: mocks.currentUser,
    myPermissions: mocks.myPermissions,
  };
});

/** 构造 `FormData`。 */
function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) fd.append(key, value);
  return fd;
}

/** 构造结构化 400 `ApiError`（用于验证 `display` 归一化）。 */
function badRequest(message: string): ApiError {
  const response = new Response(null, { status: 400 });
  return new ApiError(400, { statusCode: 400, message, error: "Bad Request" }, response);
}

/** 已登录态的最小用户 payload。 */
const USER = { guid: "u1", name: "alice" } as never;

describe("loginAction —— account 分支", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clear();
    usePermissionStore.getState().reset();
    mocks.currentUser.mockResolvedValue(USER);
    mocks.myPermissions.mockResolvedValue({ permissions: ["devices.view"], scopes: { global: ["devices.view"] } });
  });

  it("空凭据 → credentialsRequired，且不发起请求", async () => {
    const next = await loginAction(initialLoginState, form({ username: "", password: "" }));
    expect(next.error).toBe("credentialsRequired");
    expect(next.ok).toBe(false);
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("★ account 直登成功 → ok=true，写入 token 与权限快照", async () => {
    mocks.login.mockResolvedValue({ type: "account", access_token: "tok-abc" });
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "pw" }));

    expect(next.ok).toBe(true);
    expect(next.error).toBeNull();
    expect(mocks.login).toHaveBeenCalledTimes(1);
    // 请求体契约：type=account + autoLogin 布尔
    expect(mocks.login.mock.calls[0][0]).toMatchObject({ type: "account", username: "alice", password: "pw" });
    // 会话与权限快照已写入
    expect(useSessionStore.getState().token).toBe("tok-abc");
    expect(usePermissionStore.getState().eff?.permissions).toEqual(["devices.view"]);
  });

  it("★ account 返回两步挑战 → step=tfa 且保存 secret 与 tfaType", async () => {
    mocks.login.mockResolvedValue({ type: "email_check", secret: "sec-1", tfa_type: "tfa_check" });
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "pw" }));

    expect(next.step).toBe("tfa");
    expect(next.secret).toBe("sec-1");
    expect(next.tfaType).toBe("tfa_check");
    expect(next.ok).toBe(false);
    expect(useSessionStore.getState().token).toBeNull();
  });

  it("挑战 tfa_type=passkey_check 时原样保留", async () => {
    mocks.login.mockResolvedValue({ type: "email_check", secret: "sec-2", tfa_type: "passkey_check" });
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "pw" }));
    expect(next.tfaType).toBe("passkey_check");
  });

  it("★ 无 token 也无挑战 → loginFailed（不写入会话）", async () => {
    mocks.login.mockResolvedValue({ type: "account" });
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "pw" }));
    expect(next.error).toBe("loginFailed");
    expect(next.ok).toBe(false);
    expect(useSessionStore.getState().token).toBeNull();
  });

  it("★ HTTP 错误 → 展示 ApiError.display 归一化文案", async () => {
    mocks.login.mockRejectedValue(badRequest("invalid credentials"));
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "bad" }));
    expect(next.error).toBe("invalid credentials");
    expect(next.ok).toBe(false);
  });

  it("429 限流（message 为字符串）→ 展示后端原文", async () => {
    const response = new Response(null, { status: 429 });
    mocks.login.mockRejectedValue(new ApiError(429, { statusCode: 429, message: "Too Many Requests" }, response));
    const next = await loginAction(initialLoginState, form({ username: "alice", password: "pw" }));
    expect(next.error).toBe("Too Many Requests");
  });

  it("★ pending 契约：action 返回可 await 的 Promise，await 前会话未变更", async () => {
    let resolveLogin: (value: unknown) => void = () => undefined;
    mocks.login.mockImplementation(
      () => new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const promise = loginAction(initialLoginState, form({ username: "alice", password: "pw" }));
    expect(promise).toBeInstanceOf(Promise);
    // 尚未 resolve：会话必须保持为空（pending 期间不变更状态）
    expect(useSessionStore.getState().token).toBeNull();
    resolveLogin({ type: "account", access_token: "tok-pending" });
    const next = await promise;
    expect(next.ok).toBe(true);
    expect(useSessionStore.getState().token).toBe("tok-pending");
  });
});

describe("loginAction —— tfa_code 分支", () => {
  /** 处于 tfa 步骤的初态。 */
  const tfaState: LoginState = { ...initialLoginState, step: "tfa", secret: "sec-1", tfaType: "tfa_check" };

  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.getState().clear();
    usePermissionStore.getState().reset();
    mocks.currentUser.mockResolvedValue(USER);
    mocks.myPermissions.mockResolvedValue({ permissions: [], scopes: { global: [] } });
  });

  it("★ 验证码为空 → tfaCodeRequired，且不发起请求", async () => {
    const next = await loginAction(tfaState, form({ tfaCode: "" }));
    expect(next.error).toBe("tfaCodeRequired");
    expect(next.step).toBe("tfa");
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("★ tfa_code 校验成功 → ok=true 并写入会话", async () => {
    mocks.login.mockResolvedValue({ type: "account", access_token: "tok-tfa" });
    const next = await loginAction(tfaState, form({ tfaCode: "123456" }));

    expect(next.ok).toBe(true);
    expect(useSessionStore.getState().token).toBe("tok-tfa");
    // 请求体契约：type=tfa_code + secret + tfaCode
    expect(mocks.login.mock.calls[0][0]).toMatchObject({ type: "tfa_code", secret: "sec-1", tfaCode: "123456" });
  });

  it("★ tfa_code 校验失败 → 保持 step=tfa 并展示错误", async () => {
    mocks.login.mockRejectedValue(badRequest("invalid tfa code"));
    const next = await loginAction(tfaState, form({ tfaCode: "000000" }));
    expect(next.step).toBe("tfa");
    expect(next.error).toBe("invalid tfa code");
    expect(next.ok).toBe(false);
    expect(useSessionStore.getState().token).toBeNull();
  });

  it("tfa 步骤但 secret 缺失 → 回退 account 分支（视为凭据缺失）", async () => {
    const broken: LoginState = { ...initialLoginState, step: "tfa", secret: null };
    const next = await loginAction(broken, form({ tfaCode: "123456" }));
    expect(next.error).toBe("credentialsRequired");
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it("tfa_code 无 token 也无新挑战 → loginFailed", async () => {
    mocks.login.mockResolvedValue({ type: "account" });
    const next = await loginAction(tfaState, form({ tfaCode: "123456" }));
    expect(next.error).toBe("loginFailed");
  });
});
