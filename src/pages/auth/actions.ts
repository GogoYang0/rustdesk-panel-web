/**
 * 认证动作（React 19 Actions，设计 §6.2.1 / §1.4）。
 *
 * 落地方式：`useActionState` 的 reducer 形态 —— action 签名 `(prevState, formData) => nextState`。
 * pending 由 `useActionState` 的 `isPending` 内建给出；错误内建于返回的 state。
 *
 * 设计要点：
 * 1. **两步验证**：`account` 分支返回 `type=email_check` + `secret` + `tfa_type` 时，
 *    action 返回 `{status:"tfa", secret, tfaType}`，页面切到验证码步骤；
 *    用户提交验证码时以 `type:"tfa_code"` 二次调用 `POST /api/login`；
 * 2. **登录成功**：写入 `sessionStore`（token），随后拉取 `POST /api/currentUser` 与
 *    `GET /api/permissions/me`，写入 `sessionStore.user` / `permissionStore.eff`，
 *    并 `setQueryData` 预热 TanStack Query 缓存（避免受保护页首屏重复请求）；
 * 3. **错误**：统一走 `ApiError.display`（message 三形态归一化，共享知识 15）。
 *
 * ⚠️ 权限红线：前端只做 UI 拦截，**不是安全边界**；后端每次请求实时查库为准。
 */
import type { LoginRequest, LoginResponse } from "@/api/endpoints/auth";
import { currentUser, login, myPermissions, passkeyAuthBegin, passkeyAuthVerify } from "@/api/endpoints/auth";
import { toDisplayMessage } from "@/api/error";
import { queryClient } from "@/api/queryClient";
import { qk } from "@/api/queryKeys";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";

/** 登录 action 的步骤。 */
export type LoginStep = "account" | "tfa" | "passkey";

/** 登录 action 状态（内建于 `useActionState`）。 */
export interface LoginState {
  /** 当前步骤 */
  step: LoginStep;
  /** 是否成功（成功时页面负责跳转） */
  ok: boolean;
  /** 错误文案（失败时） */
  error: string | null;
  /** 两步验证会话 secret（`step === "tfa"` 时非空） */
  secret: string | null;
  /** 两步验证类型：`tfa_check`（TOTP）/ `passkey_check`（Passkey 二次验证） */
  tfaType: "tfa_check" | "passkey_check" | null;
  /** 验证码发送目标提示（如邮箱掩码，后端若返回） */
  hint: string | null;
}

/** 登录 action 初始状态。 */
export const initialLoginState: LoginState = {
  step: "account",
  ok: false,
  error: null,
  secret: null,
  tfaType: null,
  hint: null,
};

/**
 * 登录成功后统一收口：写会话 + 拉取用户与权限快照 + 预热 Query 缓存。
 *
 * 设计 §6.2.1 的第 12~16 步：`sessionStore.login` → `currentUser` → `myPermissions`
 * → `setQueryData(qk.currentUser/qk.permissions)`。
 *
 * @param token 登录返回的 JWT（`LoginResponse.access_token`）
 */
async function establishSession(token: string): Promise<void> {
  useSessionStore.getState().login(token, null);

  // 并行拉取用户与权限快照；任一失败不阻断登录（受保护页的 SessionGate 会兜底重试）
  const [userResult, permResult] = await Promise.allSettled([currentUser(), myPermissions()]);

  if (userResult.status === "fulfilled") {
    useSessionStore.getState().setUser(userResult.value);
    queryClient.setQueryData(qk.currentUser, userResult.value);
  }
  if (permResult.status === "fulfilled") {
    usePermissionStore.getState().setEff(permResult.value);
    queryClient.setQueryData(qk.permissions, permResult.value);
  }
}

/**
 * 从 `LoginResponse` 分支判定下一步 step。
 *
 * @param res 登录响应
 * @returns 两步验证态（`{secret, tfaType}`）；账号直登时返回 `null`
 */
function readTfaChallenge(
  res: LoginResponse,
): { secret: string; tfaType: "tfa_check" | "passkey_check" } | null {
  const secret = typeof res.secret === "string" && res.secret.length > 0 ? res.secret : null;
  // 契约：两步验证返回 type=email_check + tfa_type（tfa_check / passkey_check）
  if (res.type === "email_check" && secret !== null) {
    return { secret, tfaType: res.tfa_type === "passkey_check" ? "passkey_check" : "tfa_check" };
  }
  return null;
}

/**
 * 登录 action（`account` / `tfa_code` 两分支）。
 *
 * 表单字段（FormData）：
 * - `username` / `password`（step=account）；
 * - `tfaCode`（step=tfa 时）。
 *
 * @param prev 上一次 state
 * @param formData 表单数据
 * @returns 新 state
 */
export async function loginAction(prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const tfaCode = String(formData.get("tfaCode") ?? "").trim();
  const autoLogin = formData.get("autoLogin") === "on" || formData.get("autoLogin") === "true";

  try {
    // ---------- 分支②：两步验证码（复用上一步的 secret） ----------
    if (prev.step === "tfa" && prev.secret !== null) {
      if (tfaCode.length === 0) {
        return { ...prev, error: "tfaCodeRequired" };
      }
      const body: LoginRequest = { type: "tfa_code", secret: prev.secret, tfaCode };
      const res = await login(body);
      const challenge = readTfaChallenge(res);
      if (challenge !== null) {
        // 罕见：后端再次要求挑战（如 verifier 变更），保持 tfa 步骤并更新 secret
        return { ...prev, ...challenge, error: null };
      }
      if (typeof res.access_token !== "string" || res.access_token.length === 0) {
        return { ...prev, error: "loginFailed" };
      }
      await establishSession(res.access_token);
      return { ...initialLoginState, ok: true };
    }

    // ---------- 分支①：账号密码 ----------
    if (username.length === 0 || password.length === 0) {
      return { ...initialLoginState, error: "credentialsRequired" };
    }
    const body: LoginRequest = { type: "account", username, password, autoLogin };
    const res = await login(body);

    const challenge = readTfaChallenge(res);
    if (challenge !== null) {
      return {
        step: "tfa",
        ok: false,
        error: null,
        secret: challenge.secret,
        tfaType: challenge.tfaType,
        hint: null,
      };
    }
    if (typeof res.access_token !== "string" || res.access_token.length === 0) {
      return { ...initialLoginState, error: "loginFailed" };
    }
    await establishSession(res.access_token);
    return { ...initialLoginState, ok: true };
  } catch (err) {
    return { ...prev, ok: false, error: toDisplayMessage(err) };
  }
}

/**
 * Passkey 免密登录 action（`passkeyAuthBegin` → 浏览器断言 → `passkeyAuthVerify`）。
 *
 * WebAuthn 走 `@simplewebauthn/browser`（见下方 `runPasskeyAssertion`）；
 * 环境不支持 WebAuthn 时返回可展示错误。
 *
 * @param prev 上一次 state
 * @returns 新 state
 */
export async function passkeyLoginAction(prev: LoginState): Promise<LoginState> {
  try {
    const begin = await passkeyAuthBegin();
    const assertion = await runPasskeyAssertion(begin.options);
    const res = await passkeyAuthVerify({ secret: begin.secret, response: assertion });
    if (typeof res.access_token !== "string" || res.access_token.length === 0) {
      const challenge = readTfaChallenge(res);
      if (challenge !== null) {
        return { step: "tfa", ok: false, error: null, ...challenge, hint: null };
      }
      return { ...prev, error: "loginFailed" };
    }
    await establishSession(res.access_token);
    return { ...initialLoginState, ok: true };
  } catch (err) {
    return { ...prev, ok: false, error: toDisplayMessage(err) };
  }
}

/**
 * 调用浏览器 WebAuthn API 完成一次断言（使用原生 `navigator.credentials`）。
 *
 * ★ 依赖说明：M4-T04 未引入 `@simplewebauthn/browser` —— 纯 `navigator.credentials.get`
 *   对「只做一次断言」的场景足够，且可避免新增依赖（OQ-7 同一取舍思路）。
 *   后端返回的 `options` 为标准 `PublicKeyCredentialRequestOptionsJSON`，
 *   此处做 base64url → ArrayBuffer 的最小解码转换。
 *
 * @param options 后端返回的请求选项 JSON
 * @returns 可直接回传后端的断言响应 JSON
 */
async function runPasskeyAssertion(options: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (typeof navigator === "undefined" || !navigator.credentials) {
    throw new Error("webauthnUnsupported");
  }
  const challenge = decodeBase64Url(String(options["challenge"] ?? ""));
  const rawAllow = Array.isArray(options["allowCredentials"]) ? options["allowCredentials"] : [];
  const allowCredentials = (rawAllow as Array<Record<string, unknown>>).map((item) => ({
    id: decodeBase64Url(String(item["id"] ?? "")),
    type: "public-key" as const,
    transports: Array.isArray(item["transports"])
      ? (item["transports"] as AuthenticatorTransport[])
      : undefined,
  }));
  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    allowCredentials,
    timeout: typeof options["timeout"] === "number" ? (options["timeout"] as number) : 60000,
    rpId: typeof options["rpId"] === "string" ? (options["rpId"] as string) : undefined,
    userVerification:
      (options["userVerification"] as UserVerificationRequirement | undefined) ?? "preferred",
  };
  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  if (credential === null) {
    throw new Error("passkeyCancelled");
  }
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      authenticatorData: encodeBase64Url(response.authenticatorData),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  };
}

/**
 * base64url 字符串 → `ArrayBuffer`。
 *
 * @param value base64url 编码串
 * @returns 解码后的缓冲区
 */
function decodeBase64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * `ArrayBuffer` → base64url 字符串。
 *
 * @param buffer 待编码缓冲区
 * @returns base64url 编码串（无填充）
 */
function encodeBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
