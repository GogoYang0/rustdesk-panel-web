/**
 * 设备域端点（M4-T05）。
 *
 * 契约保真：
 * - `GET /api/devices` 过滤参数 `status` / `is_online` 为字符串枚举 **"0" | "1"**；
 * - `PATCH /api/devices/status` 批量启停，body `{guids, status: "enabled"|"disabled"}`，
 *   响应为部分成功 `DeviceStatusUpdateResult`；
 * - `PATCH /api/devices/{guid}` 用 `UpdateDeviceRequest`（note / userName / deviceGroupName /
 *   strategyName，关联字段按名称匹配、需超管、空串解绑）；
 * - `POST /api/devices/{uuid}/disconnect`，body `DisconnectRequest {connIds:number[]}`；
 * - `DeviceView.deviceGroupGuid` 为 **`string | null`**（无组设备真实取值 null，禁止归一化）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { PageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** 设备视图（PeerView + userGuid + deviceGroupGuid）。 */
export type DeviceView = components["schemas"]["DeviceView"];
/** 设备分页。 */
export type DevicePage = components["schemas"]["DevicePage"];
/** 批量状态更新结果。 */
export type DeviceStatusUpdateResult = components["schemas"]["DeviceStatusUpdateResult"];
/** 设备更新请求。 */
export type UpdateDeviceRequest = components["schemas"]["UpdateDeviceRequest"];

/** 设备列表查询参数（契约形态；分页由调用方经 toPageParams 产出）。 */
export interface DeviceListParams extends PageParams {
  /** 索引签名（满足 qk QueryParams 结构约束） */
  [key: string]: unknown;
  /** 设备 ID（精确） */
  id?: string;
  /** 状态（"1"=正常 / "0"=停用） */
  status?: "0" | "1";
  /** 在线（"1"/"0"） */
  is_online?: "0" | "1";
  /** 主机名（LIKE sysinfos.hostname） */
  device_name?: string;
  /** 所属用户名 */
  user_name?: string;
  /** 设备组名（精确） */
  device_group_name?: string;
  /** 设备组 guid（精确） */
  device_group_guid?: string;
}

/** 设备列表（GET /api/devices）。 */
export async function listDevices(params: DeviceListParams): Promise<DevicePage> {
  const res = await api.GET("/api/devices", { params: { query: { ...params } } });
  return unwrap(res);
}

/** peer 列表查询参数。 */
export interface PeerListParams extends PageParams {
  /** 设备 ID（精确） */
  id?: string;
  status?: "0" | "1";
  is_online?: "0" | "1";
  user_name?: string;
  device_group_guid?: string;
  device_group_name?: string;
  os?: string;
}

/** peer 分页。 */
export type PeerPage = components["schemas"]["PeerPage"];

/** peer 列表（GET /api/peers；设备详情与分配候选共用）。 */
export async function listPeers(params: PeerListParams): Promise<PeerPage> {
  const res = await api.GET("/api/peers", { params: { query: { ...params } } });
  return unwrap(res);
}

/**
 * 按设备 ID 查详情（GET /api/peers?id=…；未命中返回 null）。
 *
 * @param id 设备 ID（peer.id，数字字符串）
 */
export async function getDeviceById(id: string): Promise<DeviceView | null> {
  const page = await listDevices({ id, current: 1, pageSize: 1 });
  return page.data[0] ?? null;
}

/**
 * 批量更新设备状态（PATCH /api/devices/status）。
 *
 * @param body `{guids, status}`（guids 为 peer.uuid 数组）
 */
export async function updateDeviceStatus(
  body: components["schemas"]["DeviceStatusUpdateRequest"],
): Promise<DeviceStatusUpdateResult> {
  const res = await api.PATCH("/api/devices/status", { body });
  return unwrap(res);
}

/**
 * 更新设备（PATCH /api/devices/{guid}）。
 *
 * @param guid 设备 guid（peer.uuid）
 * @param body note / userName / deviceGroupName / strategyName（名称匹配、需超管、空串解绑）
 */
export async function updateDevice(guid: string, body: UpdateDeviceRequest): Promise<DeviceView> {
  const res = await api.PATCH("/api/devices/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/**
 * 删除设备（DELETE /api/devices/{guid}）。
 *
 * @param guid 设备 guid
 */
export async function deleteDevice(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/devices/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/**
 * 断开设备连接（POST /api/devices/{uuid}/disconnect）。
 *
 * ⚠️ path 参数契约名为 `uuid`（取值 peer.uuid）；connIds 缺省由后端断开该设备全部连接。
 *
 * @param uuid 设备 uuid
 * @param connIds 连接 ID 数组（可选，缺省全部）
 */
export async function disconnectDevice(uuid: string, connIds?: number[]): Promise<unknown> {
  const res = await api.POST("/api/devices/{uuid}/disconnect", {
    params: { path: { uuid } },
    body: { connIds: connIds ?? [] },
  });
  return unwrap(res);
}
