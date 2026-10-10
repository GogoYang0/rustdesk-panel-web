/**
 * 设备组域 React Query hooks（M4-T05）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addDeviceGroupDevices,
  createDeviceGroup,
  deleteDeviceGroup,
  getDeviceGroup,
  listDeviceGroupDevices,
  listDeviceGroups,
  removeDeviceGroupDevices,
  updateDeviceGroup,
  type DeviceGroupListParams,
  type DeviceGroupUpsertRequest,
} from "@/api/endpoints/deviceGroups";
import { qk } from "@/api/queryKeys";

/** 设备组列表（AdminGuard）。 */
export function useDeviceGroups(params: DeviceGroupListParams, enabled = true) {
  return useQuery({
    queryKey: qk.deviceGroups(params),
    queryFn: () => listDeviceGroups(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 设备组详情。 */
export function useDeviceGroup(guid: string, enabled = true) {
  return useQuery({
    queryKey: qk.deviceGroup(guid),
    queryFn: () => getDeviceGroup(guid),
    enabled: enabled && guid.length > 0,
  });
}

/** 组内设备分页。 */
export function useDeviceGroupDevices(guid: string, current: number, pageSize: number, enabled = true) {
  return useQuery({
    queryKey: [...qk.deviceGroup(guid), "devices", { current, pageSize }],
    queryFn: () => listDeviceGroupDevices(guid, { current, pageSize }),
    enabled: enabled && guid.length > 0,
    placeholderData: (prev) => prev,
  });
}

/** 创建设备组 → 失效设备组前缀。 */
export function useCreateDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DeviceGroupUpsertRequest) => createDeviceGroup(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
    },
  });
}

/** 更新设备组。 */
export function useUpdateDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: DeviceGroupUpsertRequest }) =>
      updateDeviceGroup(vars.guid, vars.body),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
      void queryClient.invalidateQueries({ queryKey: qk.deviceGroup(vars.guid) });
    },
  });
}

/** 删除设备组。 */
export function useDeleteDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteDeviceGroup(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
    },
  });
}

/** 批量加入设备（按 peer.id）。 */
export function useAddDeviceGroupDevices(guid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => addDeviceGroupDevices(guid, ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

/** 批量移出设备（按 peer.id）。 */
export function useRemoveDeviceGroupDevices(guid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => removeDeviceGroupDevices(guid, ids),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["device-groups"] });
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
