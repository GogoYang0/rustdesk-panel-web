/**
 * E2E mock 数据工厂（M4-T07）。
 *
 * ⚠️ 契约保真：mock 载荷形状与 `src/types/api-types.ts`（openapi.yaml 生成）对齐：
 * - `UserPayload` snake_case（`display_name` / `is_admin` / `tfa_enabled`）；
 * - `EffectivePermissions` = `{permissions, scopes}`（scopes.device_group 分档）；
 * - 分页响应 = `{data, total}`；成功响应为裸对象（openapi-fetch data 原样返回）。
 *
 * 数据为纯测试夹具，不复制任何参考项目实现。
 */

/** mock 用户载荷（UserPayload snake_case 子集，多余字段被应用忽略）。 */
export interface MockUser {
  id: number;
  guid: string;
  name: string;
  display_name: string;
  email: string;
  is_admin: boolean;
  tfa_enabled: boolean;
  avatar: string | null;
}

/** 生效权限快照形状（EffectivePermissions）。 */
export interface MockPermissions {
  permissions: string[];
  scopes: {
    device_group?: Record<string, string[]>;
    [key: string]: Record<string, string[]> | undefined;
  };
}

/** 超管用户。 */
export const adminUser: MockUser = {
  id: 1,
  guid: "guid-admin-0001",
  name: "admin",
  display_name: "管理员",
  email: "admin@example.com",
  is_admin: true,
  tfa_enabled: false,
  avatar: null,
};

/** 仅设备只读 + g1 组分档的受限用户。 */
export const scopedUser: MockUser = {
  id: 2,
  guid: "guid-scoper-0002",
  name: "operator",
  display_name: "运维员",
  email: "operator@example.com",
  is_admin: false,
  tfa_enabled: false,
  avatar: null,
};

/** 超管权限（is_admin 短路，permissions 仍给出全量快照形态）。 */
export const adminPermissions: MockPermissions = {
  permissions: ["users.view", "devices.view", "servers.view", "audit.view", "address_books.view"],
  scopes: {},
};

/** 受限权限：devices.view 平铺 + g1 组仅 devices.view 分档（无 disconnect/status/delete）。 */
export const scopedPermissions: MockPermissions = {
  permissions: ["devices.view", "address_books.view"],
  scopes: {
    device_group: {
      g1: ["devices.view"],
    },
  },
};

/** 设备视图（DeviceView 形状；deviceGroupGuid 与契约一致区分 null）。 */
export interface MockDevice {
  guid: string;
  id: string;
  info: { device_name: string; username: string; os: string };
  user_name: string;
  device_group_name: string;
  is_online: boolean;
  status: number;
  last_online: string;
  deviceGroupGuid: string | null;
}

/** 两行设备：有组（g1）/ 无组（null）——用于行级权限按钮判定。 */
export const mockDevices: MockDevice[] = [
  {
    guid: "device-g1-aaaa",
    id: "1001",
    info: { device_name: "win-pc-g1", username: "alice", os: "Windows 11" },
    user_name: "alice",
    device_group_name: "组一",
    is_online: true,
    status: 1,
    last_online: "2026-09-04T10:00:00+08:00",
    deviceGroupGuid: "g1",
  },
  {
    guid: "device-null-bbbb",
    id: "1002",
    info: { device_name: "win-pc-loose", username: "bob", os: "Windows 10" },
    user_name: "bob",
    device_group_name: "",
    is_online: false,
    status: 1,
    last_online: "2026-09-03T18:00:00+08:00",
    deviceGroupGuid: null,
  },
];

/** 通用单行分页载荷。 */
export function paged(rows: unknown[]): { data: unknown[]; total: number } {
  return { data: rows, total: rows.length };
}
