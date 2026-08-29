/**
 * 用户域 React Query hooks（M4-T06）。
 *
 * 约定：queryKey 一律取 `qk`；失效用前缀匹配；页面不直接调 `api.*`。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  batchForceUserLogout,
  batchUpdateUserSecurity,
  batchUpdateUserStatus,
  deleteUser,
  forceUserLogout,
  getUser,
  getUserRoles,
  listAdminUsers,
  replaceUserRoles,
  updateUser,
  updateUserSecurity,
  userRoleEligibility,
  type AdminUserListParams,
  type BatchResult,
  type MessageResult,
  type BatchSecurityRequest,
  type ReplaceRolesRequest,
  type UpdateUserRequest,
  type UpdateUserSecurityRequest,
} from "@/api/endpoints/users";
import { getRoleProtectionImpact } from "@/api/endpoints/roles";
import { qk } from "@/api/queryKeys";

export type {
  AdminUserRow,
  AdminUserPage,
  BatchResult,
  EligibilityRow,
} from "@/api/endpoints/users";

/** 管理员用户分页（分页 + 筛选）。 */
export function useAdminUsers(params: AdminUserListParams, enabled = true) {
  return useQuery({
    queryKey: qk.adminUsers(params),
    queryFn: () => listAdminUsers(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 用户详情。 */
export function useUser(guid: string, enabled = true) {
  return useQuery({
    queryKey: qk.user(guid),
    queryFn: () => getUser(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 用户角色指派列表。 */
export function useUserRoles(guid: string, enabled = true) {
  return useQuery({
    queryKey: qk.userRoles(guid),
    queryFn: () => getUserRoles(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 角色指派资格矩阵。 */
export function useUserRoleEligibility(guid: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.userRoles(guid), "eligibility"],
    queryFn: () => userRoleEligibility(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 保护角色变更影响面（删除前确认）。 */
export function useRoleProtectionImpact(guid: string, enabled = true) {
  return useQuery({
    queryKey: ["roles", "impact", guid],
    queryFn: () => getRoleProtectionImpact(guid),
    enabled: enabled && guid.length > 0,
  });
}

function invalidateUsers(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["users"] });
}

/** 更新用户 → 失效用户前缀。 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: UpdateUserRequest }) => updateUser(vars.guid, vars.body),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 删除用户 → 失效用户前缀。 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteUser(guid),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 更新用户安全设置（含重置口令）→ 失效用户前缀。 */
export function useUpdateUserSecurity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: UpdateUserSecurityRequest }) =>
      updateUserSecurity(vars.guid, vars.body),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 强制下线单用户。 */
export function useForceUserLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => forceUserLogout(guid),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 全量替换用户角色指派。 */
export function useReplaceUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: ReplaceRolesRequest }) =>
      replaceUserRoles(vars.guid, vars.body),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 批量启停用户（部分成功）。 */
export function useBatchUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guids: string[]; status: -1 | 0 | 1 }): Promise<BatchResult> =>
      batchUpdateUserStatus(vars),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 批量安全设置（契约 200 = MessageResponse）。 */
export function useBatchUpdateUserSecurity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BatchSecurityRequest): Promise<MessageResult> =>
      batchUpdateUserSecurity(body),
    onSuccess: () => invalidateUsers(queryClient),
  });
}

/** 批量强制下线（部分成功）。 */
export function useBatchForceUserLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guids: string[]): Promise<MessageResult> => batchForceUserLogout({ guids }),
    onSuccess: () => invalidateUsers(queryClient),
  });
}
