/**
 * 设备组域端点（M4-T05）。
 *
 * 契约保真：
 * - accessible 在 `/api/device-group/accessible**（单数），其余在 /api/device-groups（复数）；
 * - 组 CRUD 与加/移设备为 AdminGuard（后端）；strategy-targets 走 Perm(strategies.assign)；
 * - 加/移设备请求体为 `string[]`（peer.uuid 数组）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { PageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** 设备组视图。 */
export type DeviceGroupView = components["schemas"]["DeviceGroupView"];
/** 设备组分页。 */
export type DeviceGroupPage = components["schemas"]["DeviceGroupPage"];
/** 设备组 upsert 请求。 */
export type DeviceGroupUpsertRequest = components["schemas"]["DeviceGroupUpsertRequest"];

/** 设备组列表查询参数。 */
export interface DeviceGroupListParams extends PageParams {
  /** 索引签名（满足 qk QueryParams 结构约束） */
  [key: string]: unknown;
  /** 名称筛选 */
  name?: string;
}

/** 设备组列表（GET /api/device-groups，AdminGuard）。 */
export async function listDeviceGroups(params: DeviceGroupListParams): Promise<DeviceGroupPage> {
  const res = await api.GET("/api/device-groups", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 可及设备组（GET /api/device-group/accessible；仅需登录，权限内可见组）。 */
export async function listAccessibleGroups(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}): Promise<components["schemas"]["AccessibleGroupPage"]> {
  const res = await api.GET("/api/device-group/accessible", { params: { query: { ...params } } });
  return unwrap(res);
}

/**
 * 设备组详情。
 *
 * ⚠️ 契约无 GET /api/device-groups/{guid}（仅列表 / PATCH / DELETE / 加入设备），
 * 故以列表接口（pageSize=MAX）客户端按 guid 过滤实现；未命中返回 null。
 */
export async function getDeviceGroup(guid: string): Promise<DeviceGroupView | null> {
  const page = await listDeviceGroups({ current: 1, pageSize: 100 });
  return page.data.find((g) => g.guid === guid) ?? null;
}

/**
 * 组内设备分页。
 *
 * ⚠️ 契约的 GET /api/device-groups/{guid}/devices 不存在（该 path 仅 DELETE），
 * 改以 `GET /api/devices?device_group_guid=…` 实现（同一分页契约）。
 */
export async function listDeviceGroupDevices(
  guid: string,
  params: PageParams,
): Promise<components["schemas"]["DevicePage"]> {
  const res = await api.GET("/api/devices", {
    params: { query: { ...params, device_group_guid: guid } },
  });
  return unwrap(res);
}

/** 创建设备组（POST /api/device-groups）。 */
export async function createDeviceGroup(body: DeviceGroupUpsertRequest): Promise<DeviceGroupView> {
  const res = await api.POST("/api/device-groups", { body });
  return unwrap(res);
}

/** 更新设备组（PATCH /api/device-groups/{guid}）。 */
export async function updateDeviceGroup(
  guid: string,
  body: DeviceGroupUpsertRequest,
): Promise<DeviceGroupView> {
  const res = await api.PATCH("/api/device-groups/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 删除设备组（DELETE /api/device-groups/{guid}）。 */
export async function deleteDeviceGroup(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/device-groups/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 批量加入设备（POST /api/device-groups/{guid}，body 为 peer.uuid 数组）。 */
export async function addDeviceGroupDevices(
  guid: string,
  uuids: readonly string[],
): Promise<components["schemas"]["AddDevicesResult"]> {
  const res = await api.POST("/api/device-groups/{guid}", {
    params: { path: { guid } },
    body: [...uuids],
  });
  return unwrap(res);
}

/** 批量移出设备（DELETE /api/device-groups/{guid}/devices）。 */
export async function removeDeviceGroupDevices(
  guid: string,
  uuids: readonly string[],
): Promise<components["schemas"]["RemoveDevicesResult"]> {
  const res = await api.DELETE("/api/device-groups/{guid}/devices", {
    params: { path: { guid } },
    body: [...uuids],
  });
  return unwrap(res);
}

/** 策略分配候选设备组（GET /api/device-groups/strategy-targets，Perm strategies.assign）。 */
export async function listStrategyGroupTargets(
  params: PageParams,
): Promise<components["schemas"]["DeviceGroupTargetPage"]> {
  const res = await api.GET("/api/device-groups/strategy-targets", {
    params: { query: { ...params } },
  });
  return unwrap(res);
}
