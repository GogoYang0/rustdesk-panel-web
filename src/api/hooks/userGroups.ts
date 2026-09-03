/**
 * 用户组域 React Query hooks（M4-T06）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addUserGroupMembers,
  createUserGroup,
  deleteUserGroup,
  listUserGroupMembers,
  listUserGroups,
  updateUserGroup,
  type UserGroupUpsertRequest,
} from "@/api/endpoints/userGroups";
import { qk } from "@/api/queryKeys";

export type { MemberView, UserGroupView } from "@/api/endpoints/userGroups";

/** 用户组列表（无分页参数）。 */
export function useUserGroups(enabled = true) {
  return useQuery({
    queryKey: qk.userGroups(),
    queryFn: () => listUserGroups(),
    enabled,
  });
}

/** 用户组成员分页。 */
export function useUserGroupMembers(
  guid: string,
  params: { current?: number; pageSize?: number; search?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: qk.userGroupMembers(guid, params),
    queryFn: () => listUserGroupMembers(guid, params),
    enabled: enabled && guid.length > 0,
    placeholderData: (prev) => prev,
  });
}

/** 创建用户组。 */
export function useCreateUserGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UserGroupUpsertRequest) => createUserGroup(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    },
  });
}

/** 更新用户组。 */
export function useUpdateUserGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: UserGroupUpsertRequest }) =>
      updateUserGroup(vars.guid, vars.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

/** 删除用户组（响应含 moved_user_count / deleted_rule_count）。 */
export function useDeleteUserGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteUserGroup(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries({ queryKey: ["address-book"] });
    },
  });
}

/** 移动用户到组。 */
export function useAddUserGroupMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; userGuids: readonly string[] }) =>
      addUserGroupMembers(vars.guid, vars.userGuids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
