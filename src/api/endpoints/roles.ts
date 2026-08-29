/**
 * 角色域端点（M4-T06）。
 *
 * 契约保真：
 * - 角色列表/详情 `roles.view`；创建/更新/删除为 super administrator（前端用 is_admin 判定，OQ-10）；
 * - `PATCH /api/roles/{guid}` 取消保护需 `confirm_protected_account_change=true`；
 * - `GET /api/permissions` 为 36 码编译期目录（无 total）；
 * - 删除前可查 `protection-impact`（{affected_member_count}）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { components } from "@/types/api-types";

/** 角色视图。 */
export type RoleView = components["schemas"]["RoleView"];
/** 角色详情（含权限码清单）。 */
export type RoleDetail = components["schemas"]["RoleDetail"];
/** 角色分页。 */
export type RolePage = components["schemas"]["RolePage"];
/** 角色创建请求。 */
export type RoleCreateRequest = components["schemas"]["RoleCreateRequest"];
/** 角色更新请求。 */
export type RoleUpdateRequest = components["schemas"]["RoleUpdateRequest"];
/** 保护角色变更影响面。 */
export type ProtectionImpact = components["schemas"]["ProtectionImpact"];
/** 权限目录条目。 */
export type PermissionDefinition = components["schemas"]["PermissionDefinition"];

/** 角色列表（GET /api/roles；name/note LIKE 过滤）。 */
export async function listRoles(params?: {
  name?: string;
  note?: string;
}): Promise<RolePage> {
  const res = await api.GET("/api/roles", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 角色详情（GET /api/roles/{guid}；含权限码清单）。 */
export async function getRole(guid: string): Promise<RoleDetail> {
  const res = await api.GET("/api/roles/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 创建角色（POST /api/roles；重名 409；system_only 码 400）。 */
export async function createRole(body: RoleCreateRequest): Promise<unknown> {
  const res = await api.POST("/api/roles", { body });
  return unwrap(res);
}

/** 更新角色（PATCH /api/roles/{guid}；取消保护需 confirm 标记）。 */
export async function updateRole(guid: string, body: RoleUpdateRequest): Promise<unknown> {
  const res = await api.PATCH("/api/roles/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 删除角色（DELETE /api/roles/{guid}）。 */
export async function deleteRole(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/roles/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 保护角色变更影响面（GET /api/roles/{guid}/protection-impact）。 */
export async function getRoleProtectionImpact(guid: string): Promise<ProtectionImpact> {
  const res = await api.GET("/api/roles/{guid}/protection-impact", {
    params: { path: { guid } },
  });
  return unwrap(res);
}

/** 权限目录只读（GET /api/permissions；{data:[...]} 无 total）。 */
export async function listPermissions(): Promise<{ data: PermissionDefinition[] }> {
  const res = await api.GET("/api/permissions");
  return unwrap(res);
}
