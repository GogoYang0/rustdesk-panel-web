/**
 * 认证域 + 会话端点的 typed 请求函数（M4-T02 起步）。
 *
 * 薄封装：每个函数只做「调用 api client → unwrap」，不含业务状态（状态归 sessionStore / TanStack Query）。
 * 所有函数返回已解包的成功数据；失败抛 `ApiError`（见 `src/api/error.ts`）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { EffectivePermissions, Schemas, UserPayload } from "@/types/domain";

/** 登录请求体（type 分支：account / tfa_code / email_code / sms_code）。 */
export type LoginRequest = Schemas["LoginRequest"];

/** 登录响应（account 直接带 access_token；两步验证带 secret）。 */
export type LoginResponse = Schemas["LoginResponse"];

/** 登出请求体（可选 id / uuid）。 */
export type LogoutRequest = Schemas["LogoutRequest"];

/**
 * 登录（POST /api/login）。
 *
 * @param body 登录请求体
 * @returns 登录响应（可能为账号直登或两步验证挑战）
 */
export async function login(body: LoginRequest): Promise<LoginResponse> {
  const res = await api.POST("/api/login", { body });
  return unwrap(res);
}

/**
 * 登出（POST /api/logout）。
 *
 * @param body 登出请求体（可选，指定要撤销的会话）
 * @returns 后端返回的业务对象
 */
export async function logout(body: LogoutRequest = {}): Promise<Record<string, unknown>> {
  const res = await api.POST("/api/logout", { body });
  return unwrap(res);
}

/**
 * 获取登录方式选项（GET /api/login-options，公开）。
 *
 * @returns OIDC 选项数组（字符串或 `{name, icon}`）
 */
export async function loginOptions(): Promise<Array<string | { name: string; icon?: string }>> {
  const res = await api.GET("/api/login-options");
  return unwrap(res);
}

/**
 * 获取当前用户信息（★ POST /api/currentUser，注意是 POST）。
 *
 * @returns 当前用户 payload（snake_case 契约）
 */
export async function currentUser(): Promise<UserPayload> {
  const res = await api.POST("/api/currentUser");
  return unwrap(res);
}

/**
 * 获取当前用户的生效权限快照（GET /api/permissions/me）。
 *
 * @returns 生效权限 `{permissions, scopes}`（无 total）
 */
export async function myPermissions(): Promise<EffectivePermissions> {
  const res = await api.GET("/api/permissions/me");
  return unwrap(res);
}

/**
 * 校验并绑定 TOTP（POST /api/2fa/verify）。
 *
 * @param tfaCode 6 位验证码
 * @returns 后端返回的业务对象
 */
export async function verifyTfa(tfaCode: string): Promise<Record<string, unknown>> {
  const res = await api.POST("/api/2fa/verify", { body: { tfaCode } });
  return unwrap(res);
}
