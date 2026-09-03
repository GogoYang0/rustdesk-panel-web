/**
 * 用户域端点（M4-T06）。
 *
 * 契约保真：
 * - `GET /api/users` 为三源并集（非 admin 忽略 status 参数）；
 * - `GET /api/admin/users` 为管理员分页（10 过滤参数；行含 is_protected/strategy_name/role_names）；
 * - `PATCH /api/users/{guid}` 按字段分权（is_admin 一律 400；全空 body 400）；
 * - 批量端点：status/security 为 PATCH，sessions 为 DELETE；响应为部分成功 `BatchResult`；
 * - `PUT /api/users/{guid}/roles` 全量替换指派（越权防护链由后端兜底）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { PageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** 用户视图。 */
export type UserView = components["schemas"]["UserView"];
/** 用户分页。 */
export type UserPage = components["schemas"]["UserPage"];
/** 管理员用户分页行。 */
export type AdminUserRow = components["schemas"]["AdminUserPage"]["data"][number];
/** 管理员用户分页。 */
export type AdminUserPage = components["schemas"]["AdminUserPage"];
/** 批量部分成功结果。 */
export type BatchResult = components["schemas"]["BatchResult"];
/** 更新用户请求（按字段分权）。 */
export type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
/** 更新用户安全设置请求。 */
export type UpdateUserSecurityRequest = components["schemas"]["UpdateUserSecurityRequest"];
/** 创建用户请求。 */
export type CreateUserRequest = components["schemas"]["CreateUserRequest"];
/** 邀请用户请求。 */
export type InviteUserRequest = components["schemas"]["InviteUserRequest"];
/** 用户角色指派列表。 */
export type UserRolesResult = components["schemas"]["UserRolesResult"];
/** 全量替换用户角色指派请求。 */
export type ReplaceRolesRequest = components["schemas"]["ReplaceRolesRequest"];
/** 角色指派资格矩阵行。 */
export type EligibilityRow = components["schemas"]["EligibilityRow"];
/** 批量安全设置请求。 */
export type BatchSecurityRequest = components["schemas"]["BatchSecurityRequest"];

/** 管理员用户查询参数（契约形态；分页由调用方经 toPageParams 产出）。 */
export interface AdminUserListParams extends PageParams {
  /** 索引签名（满足 qk QueryParams 结构约束） */
  [key: string]: unknown;
  /** 状态过滤（'1' 活跃 / '0' 停用 / '-1' 未验证） */
  status?: string;
  /** 用户名 LIKE */
  name?: string;
  /** 邮箱 LIKE */
  email?: string;
  /** 是否管理员（"0"/"1"） */
  is_admin?: "0" | "1";
  /** 第三方认证类型 */
  third_auth_type?: string;
  /** 策略名 */
  strategy_name?: string;
  /** 用户组 guid */
  user_group_guid?: string;
  /** 用户组名 */
  user_group_name?: string;
}

/** 管理员用户分页（GET /api/admin/users）。 */
export async function listAdminUsers(params: AdminUserListParams): Promise<AdminUserPage> {
  const res = await api.GET("/api/admin/users", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 用户列表（GET /api/users；三源并集）。 */
export async function listUsers(params?: { status?: string }): Promise<UserPage> {
  const res = await api.GET("/api/users", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 用户详情（GET /api/users/{guid}）。 */
export async function getUser(guid: string): Promise<UserView> {
  const res = await api.GET("/api/users/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 创建用户（POST /api/users；重名 400）。 */
export async function createUser(body: CreateUserRequest): Promise<unknown> {
  const res = await api.POST("/api/users", { body });
  return unwrap(res);
}

/** 邀请用户（POST /api/users/invite；响应可携带 token 明文降级）。 */
export async function inviteUser(body: InviteUserRequest): Promise<unknown> {
  const res = await api.POST("/api/users/invite", { body });
  return unwrap(res);
}

/** 更新用户（PATCH /api/users/{guid}；按字段分权）。 */
export async function updateUser(guid: string, body: UpdateUserRequest): Promise<unknown> {
  const res = await api.PATCH("/api/users/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 删除用户（DELETE /api/users/{guid}）。 */
export async function deleteUser(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/users/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 更新用户安全设置（PATCH /api/users/{guid}/security；含管理员重置口令）。 */
export async function updateUserSecurity(
  guid: string,
  body: UpdateUserSecurityRequest,
): Promise<unknown> {
  const res = await api.PATCH("/api/users/{guid}/security", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 强制下线（DELETE /api/users/{guid}/sessions）。 */
export async function forceUserLogout(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/users/{guid}/sessions", { params: { path: { guid } } });
  return unwrap(res);
}

/** 批量启停用户（PATCH /api/users/batch/status；部分成功）。 */
export async function batchUpdateUserStatus(
  body: components["schemas"]["BatchStatusRequest"],
): Promise<BatchResult> {
  const res = await api.PATCH("/api/users/batch/status", { body });
  return unwrap(res);
}

/** 消息型响应（契约 MessageResponse：{message}）。 */
export type MessageResult = { message: string };

/** 批量安全设置（PATCH /api/users/batch/security；契约 200 = MessageResponse）。 */
export async function batchUpdateUserSecurity(body: BatchSecurityRequest): Promise<MessageResult> {
  const res = await api.PATCH("/api/users/batch/security", { body });
  return unwrap(res);
}

/** 批量强制下线（DELETE /api/users/batch/sessions）。 */
export async function batchForceUserLogout(
  body: components["schemas"]["BatchSessionsRequest"],
): Promise<MessageResult> {
  const res = await api.DELETE("/api/users/batch/sessions", { body });
  return unwrap(res);
}

/** 用户角色指派列表（GET /api/users/{guid}/roles）。 */
export async function getUserRoles(guid: string): Promise<UserRolesResult> {
  const res = await api.GET("/api/users/{guid}/roles", { params: { path: { guid } } });
  return unwrap(res);
}

/** 全量替换用户角色指派（PUT /api/users/{guid}/roles）。 */
export async function replaceUserRoles(guid: string, body: ReplaceRolesRequest): Promise<unknown> {
  const res = await api.PUT("/api/users/{guid}/roles", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 角色指派资格矩阵（GET /api/users/{guid}/roles/eligibility）。 */
export async function userRoleEligibility(guid: string): Promise<{ data: EligibilityRow[] }> {
  const res = await api.GET("/api/users/{guid}/roles/eligibility", { params: { path: { guid } } });
  return unwrap(res);
}
