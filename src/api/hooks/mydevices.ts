/**
 * GAP2 设备个人归属 hooks。
 *
 * 约定：queryKey 一律取 `qk`；失效用**前缀**匹配（devices/users 双域）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignDevice,
  listMyDevices,
  listUserDevices,
  type DeviceAssignRequest,
  type MyDeviceListParams,
} from "@/api/endpoints/devices";
import type { PageParams } from "@/api/pagination";
import { qk } from "@/api/queryKeys";

/** 我的设备列表（GET /api/users/me/devices；auth 档）。 */
export function useMyDevices(params: MyDeviceListParams, enabled = true) {
  return useQuery({
    queryKey: qk.myDevices(params),
    queryFn: () => listMyDevices(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 按用户查设备（GET /api/users/{guid}/devices；users.view）。 */
export function useUserDevices(guid: string, params: PageParams, enabled = true) {
  return useQuery({
    queryKey: qk.userDevices(guid, { ...params }),
    queryFn: () => listUserDevices(guid, params),
    enabled: enabled && guid.length > 0,
    placeholderData: (prev) => prev,
  });
}

/**
 * 分配/转移/解绑设备个人归属（PATCH /api/devices/{guid}/assign）。
 *
 * 成功后失效设备/peer/user 设备前缀（列表、详情、我的设备、用户设备抽屉）。
 */
export function useAssignDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body?: DeviceAssignRequest }) =>
      assignDevice(vars.guid, vars.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["peers"] });
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
