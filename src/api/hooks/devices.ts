/**
 * 设备域 React Query hooks（M4-T05）。
 *
 * 约定：queryKey 一律取 `qk`；失效用**前缀**匹配；页面不直接调 `api.*`。
 * `DeviceView.deviceGroupGuid` 保持 `string | null` 原样透传，禁止归一化
 * （设备域按钮按组二次判定依赖真实 null 语义）。
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteDevice,
  disconnectDevice,
  getDeviceById,
  listDevices,
  updateDevice,
  updateDeviceStatus,
  type DeviceListParams,
  type UpdateDeviceRequest,
} from "@/api/endpoints/devices";
import { qk } from "@/api/queryKeys";

/** 设备列表（分页 + 筛选）。 */
export function useDevices(params: DeviceListParams, enabled = true) {
  return useQuery({
    queryKey: qk.devices(params),
    queryFn: () => listDevices(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}

/** 设备详情（GET /api/devices?id=…）。 */
export function useDevice(id: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.devices({ id }), "detail"],
    queryFn: () => getDeviceById(id),
    enabled: enabled && id.length > 0,
  });
}

/** 批量更新设备状态 → 失效设备/peer 前缀。 */
export function useUpdateDeviceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guids: readonly string[]; status: "enabled" | "disabled" }) =>
      updateDeviceStatus({ guids: [...vars.guids], status: vars.status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["peers"] });
    },
  });
}

/** 更新设备（备注/绑定变更）→ 失效设备前缀。 */
export function useUpdateDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { guid: string; body: UpdateDeviceRequest }) =>
      updateDevice(vars.guid, vars.body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["peers"] });
    },
  });
}

/** 删除设备 → 失效设备前缀。 */
export function useDeleteDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guid: string) => deleteDevice(guid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["peers"] });
    },
  });
}

/** 断开设备连接 → 失效设备前缀。 */
export function useDisconnectDevice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uuid: string) => disconnectDevice(uuid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
      void queryClient.invalidateQueries({ queryKey: ["peers"] });
    },
  });
}
