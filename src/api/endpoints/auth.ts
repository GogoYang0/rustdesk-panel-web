/**
 * 认证域 + 会话 + 个人中心端点的 typed 请求函数（M4-T02 起步，M4-T04 扩展）。
 *
 * 薄封装：每个函数只做「调用 api client → unwrap」，不含业务状态
 * （状态归 sessionStore / TanStack Query）。所有函数返回已解包的成功数据；
 * 失败抛 `ApiError`（见 `src/api/error.ts`）。
 *
 * ⚠️ 契约保真（共享知识 20）：
 *   - `POST /api/currentUser`（注意是 POST）→ `UserPayload`（snake_case，禁止规范化）；
 *   - 登录 `type` 分支：`account` / `tfa_code` / `email_code` / `sms_code`；
 *   - 两步验证返回 `type=email_check` + `secret`（5 分钟、单次使用）+ `tfa_type`。
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

/** 当前用户资料更新请求（PATCH /api/users/me）。 */
export type UpdateMeRequest = Schemas["UpdateMeRequest"];

/** 修改自己的密码请求（PATCH /api/users/me/password）。 */
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];

/** 头像上传响应（POST /api/users/me/avatar）。 */
export type AvatarResponse = Schemas["AvatarResponse"];

/** 登录会话信息（GET /api/sessions）。 */
export type SessionInfo = Schemas["SessionInfo"];

/** Passkey 凭据视图（GET /api/passkeys）。 */
export type PasskeyView = Schemas["PasskeyView"];

/** 两步验证绑定初始化响应（POST /api/2fa/setup）。 */
export interface TfaSetupResult {
  /** TOTP 密钥（base32） */
  secret: string;
  /** otpauth:// 二维码链接 */
  otpauth_url: string;
}

/**
 * 登录（POST /api/login）。
 *
 * 限流 5 次 / 分钟 / IP（超限 429）。两步验证时返回 `type=email_check`（含 `secret`）。
 *
 * @param body 登录请求体
 * @returns 登录响应（账号直登或两步验证挑战）
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
 * @returns 登录方式数组（字符串或 `{name, icon}` 对象）
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
 * 初始化 TOTP 绑定（POST /api/2fa/setup）。
 *
 * @returns TOTP 密钥与 otpauth URL
 */
export async function setupTfa(): Promise<TfaSetupResult> {
  const res = await api.POST("/api/2fa/setup");
  return unwrap(res);
}

/**
 * 校验并绑定 TOTP（POST /api/2fa/verify）。
 *
 * @param tfaCode 6 位验证码
 * @returns 绑定结果 `{message}`
 */
export async function verifyTfa(tfaCode: string): Promise<{ message: string }> {
  const res = await api.POST("/api/2fa/verify", { body: { tfaCode } });
  return unwrap(res);
}

/**
 * 关闭两步验证（DELETE /api/2fa）。
 *
 * @param tfaCode 6 位验证码（后端要求校验）
 * @returns 关闭结果 `{message}`
 */
export async function disableTfa(tfaCode: string): Promise<{ message: string }> {
  const res = await api.DELETE("/api/2fa", { body: { tfaCode } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// Passkey（WebAuthn）
// ---------------------------------------------------------------------------

/**
 * 开始 Passkey 注册（POST /api/passkey/register/begin）。
 *
 * @returns WebAuthn `PublicKeyCredentialCreationOptions`
 */
export async function passkeyRegisterBegin(): Promise<Record<string, unknown>> {
  const res = await api.POST("/api/passkey/register/begin");
  return unwrap(res);
}

/**
 * 完成 Passkey 注册（POST /api/passkey/register/verify）。
 *
 * @param response 浏览器 `PublicKeyCredential` 序列化结果
 * @param name 凭据显示名（可选）
 * @returns 注册结果 `{message}`
 */
export async function passkeyRegisterVerify(
  response: Record<string, unknown>,
  name?: string,
): Promise<{ message: string }> {
  // 契约把 WebAuthn 载荷声明为 `Record<string, never>`（退化类型，无信息量）；
  // 实际运行时为 `PublicKeyCredentialJSON`。此处做**显式窄化断言**并保留类型说明。
  const res = await api.POST("/api/passkey/register/verify", {
    body: { response, name } as unknown as { response: Record<string, never>; name?: string },
  });
  return unwrap(res);
}

/**
 * 开始 Passkey 登录（POST /api/passkey/auth/begin）。
 *
 * @returns 会话 `secret` 与 WebAuthn `PublicKeyCredentialRequestOptions`
 */
export async function passkeyAuthBegin(): Promise<{
  secret: string;
  options: Record<string, unknown>;
}> {
  const res = await api.POST("/api/passkey/auth/begin");
  return unwrap(res);
}

/**
 * 完成 Passkey 登录（POST /api/passkey/auth/verify）。
 *
 * @param body 会话 secret + 浏览器断言响应
 * @returns 登录响应（含 access_token）
 */
export async function passkeyAuthVerify(body: {
  secret: string;
  response: Record<string, unknown>;
}): Promise<LoginResponse> {
  // 同 passkeyRegisterVerify：契约的 `response` 为 `Record<string, never>` 退化类型。
  const res = await api.POST("/api/passkey/auth/verify", {
    body: body as unknown as { secret: string; response: Record<string, never> },
  });
  return unwrap(res);
}

/**
 * 列出当前用户的 Passkey 凭据（GET /api/passkeys）。
 *
 * @returns 凭据数组
 */
export async function listPasskeys(): Promise<PasskeyView[]> {
  const res = await api.GET("/api/passkey/list");
  return unwrap(res);
}

/**
 * 删除 Passkey 凭据（DELETE /api/passkeys/{guid}）。
 *
 * @param guid 凭据 guid
 * @returns 删除结果 `{message}`
 */
export async function deletePasskey(guid: string): Promise<{ message: string }> {
  const res = await api.DELETE("/api/passkey/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// 个人中心
// ---------------------------------------------------------------------------

/**
 * 更新本人资料（PATCH /api/users/me）。
 *
 * @param body 可更新字段（display_name / email / note）
 * @returns 更新后的用户 payload
 */
export async function updateMe(body: UpdateMeRequest): Promise<UserPayload> {
  const res = await api.PATCH("/api/users/me", { body });
  return unwrap(res);
}

/**
 * 修改本人密码（PATCH /api/users/me/password）。
 *
 * @param body 当前密码与新密码
 * @returns 修改结果 `{message}`
 */
export async function changeMyPassword(body: ChangePasswordRequest): Promise<{ message: string }> {
  const res = await api.PATCH("/api/users/me/password", { body });
  return unwrap(res);
}

/**
 * 上传本人头像（POST /api/users/me/avatar，multipart，webp ≤ 2MB）。
 *
 * @param file 头像文件（webp / 图片）
 * @returns 新头像文件名 `{avatar}`
 */
export async function uploadMyAvatar(file: File): Promise<AvatarResponse> {
  const form = new FormData();
  form.append("avatar", file);
  const res = await api.POST("/api/users/me/avatar", {
    body: { avatar: file as unknown as string },
    bodySerializer: () => form,
  });
  return unwrap(res);
}

/**
 * 删除本人头像（DELETE /api/users/me/avatar）。
 *
 * @returns 删除结果 `{message}`
 */
export async function deleteMyAvatar(): Promise<{ message: string }> {
  const res = await api.DELETE("/api/users/me/avatar");
  return unwrap(res);
}

/**
 * 构造头像静态资源 URL（GET /api/avatars/{filename}，公开）。
 *
 * @param filename 头像文件名（可为空）
 * @returns 头像 URL；filename 为空时返回空串
 */
export function avatarUrl(filename?: string | null): string {
  if (typeof filename !== "string" || filename.trim().length === 0) return "";
  return `/api/avatars/${encodeURIComponent(filename.trim())}`;
}

// ---------------------------------------------------------------------------
// 会话
// ---------------------------------------------------------------------------

/**
 * 列出当前用户的活跃会话（GET /api/sessions）。
 *
 * @returns 会话数组（createdAt 倒序）
 */
export async function listSessions(): Promise<SessionInfo[]> {
  const res = await api.GET("/api/sessions");
  return unwrap(res);
}

/**
 * 撤销指定会话（DELETE /api/sessions/{jti}）。
 *
 * @param jti 会话 jti
 * @returns 撤销结果 `{message}`
 */
export async function revokeSession(jti: string): Promise<{ message: string }> {
  const res = await api.DELETE("/api/sessions/{jti}", { params: { path: { jti } } });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// 邀请接受（公开，带 token）
// ---------------------------------------------------------------------------

/** 邀请校验响应（`{name, display_name, email}`）。 */
export type InvitationInfo = Schemas["InvitationInfo"];

/** 邀请请求体（`{token}`）。 */
export type InvitationTokenRequest = Schemas["InvitationTokenRequest"];

/** 邀请接受请求体（`{token, password}`）。 */
export type InvitationAcceptRequest = Schemas["InvitationAcceptRequest"];

/**
 * 校验邀请 token（POST /api/invitations/verify，公开）。
 *
 * token 无效 / 已用 / 过期 → 400 固定文案（`Invalid invitation token` /
 * `Invitation has already been used` / `Invitation has expired`）。
 *
 * @param token 64 hex 邀请 token
 * @returns 邀请详情 `{name, display_name, email}`
 */
export async function verifyInvitation(token: string): Promise<InvitationInfo> {
  const res = await api.POST("/api/invitations/verify", { body: { token } });
  return unwrap(res);
}

/**
 * 接受邀请并设置密码（POST /api/invitations/accept，公开）。
 *
 * @param body 邀请 token 与密码
 * @returns 接受结果 `{message}`
 */
export async function acceptInvitation(body: InvitationAcceptRequest): Promise<{ message: string }> {
  const res = await api.POST("/api/invitations/accept", { body });
  return unwrap(res);
}
