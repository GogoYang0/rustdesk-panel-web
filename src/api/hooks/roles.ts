/**
 * 角色域 React Query hooks（M4-T06）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  getRole,
  listPermissions,
  listRoles,
  updateRole,
  type RoleCreateRequest,
  type RoleUpdateRequest,
} from "@/api/endpoints/roles";
import { qk } from "@/api/queryKeys";

/** 角色列表。 */
export function useRoles(params?: { name?: string }, enabled = true) {
  return useQuery({
    queryKey: qk.roles(params ?? {}),
    queryFn: () => listRoles(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 角色详情（含权限码清单）。 */
export function useRole(guid: string, enabled = true) {
  return useQuery({
    queryKey: qk.role(guid),
    queryFn: () => getRole(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 权限目录（36 码编译期目录序列化）。 */
export function usePermissionsCatalog(enabled = true) {
  return useQuery({
    queryKey: qk.permissionsCatalog,
    queryFn: () => listPermissions(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

function invalidateRoles(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["roles"] });
  void queryClient.invalidateQueries({ queryKey: ["users"] });
}

/** 创建角色（super administrator）。 */
export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RoleCreateRequest) => createRole(body),
    onSuccess: () => invalidateRoles(queryClient),
  });
}

/** 更新角色（super administrator）。 */
export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: RoleUpdateRequest }) => updateRole(vars.guid, vars.body),
    onSuccess: () => invalidateRoles(queryClient),
  });
}

/** 删除角色（super administrator）。 */
export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteRole(guid),
    onSuccess: () => invalidateRoles(queryClient),
  });
}
