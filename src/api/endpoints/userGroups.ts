/**
 * 用户组域端点（M4-T06）。
 *
 * 契约保真：
 * - 删除用户组响应 `DeleteUserGroupResult`（moved_user_count 回落默认组数 +
 *   **deleted_rule_count** 级联删除的地址簿共享规则数，页面必须展示）；
 * - 成员移动 POST body `{user_guids[]}`，响应 `moved_user_count`；
 * - 默认组禁删（400）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { components } from "@/types/api-types";

/** 用户组视图。 */
export type UserGroupView = components["schemas"]["UserGroupView"];
/** 用户组分页。 */
export type UserGroupPage = components["schemas"]["UserGroupPage"];
/** 用户组创建/更新请求。 */
export type UserGroupUpsertRequest = components["schemas"]["UserGroupUpsertRequest"];
/** 成员视图。 */
export type MemberView = components["schemas"]["MemberView"];
/** 成员分页。 */
export type MemberPage = components["schemas"]["MemberPage"];
/** 删除用户组结果（含 deleted_rule_count）。 */
export type DeleteUserGroupResult = components["schemas"]["DeleteUserGroupResult"];

/** 用户组列表（GET /api/user-groups；无分页参数，响应含 total）。 */
export async function listUserGroups(): Promise<UserGroupPage> {
  const res = await api.GET("/api/user-groups");
  return unwrap(res);
}

/** 创建用户组（POST /api/user-groups；重名 409）。 */
export async function createUserGroup(body: UserGroupUpsertRequest): Promise<unknown> {
  const res = await api.POST("/api/user-groups", { body });
  return unwrap(res);
}

/** 更新用户组（PUT /api/user-groups/{guid}；重名 409）。 */
export async function updateUserGroup(
  guid: string,
  body: UserGroupUpsertRequest,
): Promise<unknown> {
  const res = await api.PUT("/api/user-groups/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/**
 * 删除用户组（DELETE /api/user-groups/{guid}；默认组禁删）。
 *
 * @returns `{moved_user_count, deleted_rule_count}`（deleted_rule_count 为级联删除的共享规则数）
 */
export async function deleteUserGroup(guid: string): Promise<DeleteUserGroupResult> {
  const res = await api.DELETE("/api/user-groups/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 用户组成员列表（GET /api/user-groups/{guid}/users；search 匹配 username/email）。 */
export async function listUserGroupMembers(
  guid: string,
  params?: { current?: number; pageSize?: number; search?: string },
): Promise<MemberPage> {
  const res = await api.GET("/api/user-groups/{guid}/users", {
    params: { path: { guid }, query: { ...params } },
  });
  return unwrap(res);
}

/** 移动用户到组（POST /api/user-groups/{guid}/users；body {user_guids[]}）。 */
export async function addUserGroupMembers(
  guid: string,
  userGuids: readonly string[],
): Promise<components["schemas"]["MoveUsersResult"]> {
  const res = await api.POST("/api/user-groups/{guid}/users", {
    params: { path: { guid } },
    body: { user_guids: [...userGuids] } satisfies components["schemas"]["MoveUsersRequest"],
  });
  return unwrap(res);
}
