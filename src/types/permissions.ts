/**
 * RBAC 权限码常量表（M4-T02）。
 *
 * ⚠️ 契约红线：本表逐条镜像后端 `internal/rbac/catalog.go` 的编译期目录，
 * **禁止遗漏、禁止臆造**。共 **37 条** = 34 可分配码 + 3 个 system_only 码（GAP2 增 devices.assign）。
 *
 * 作用域（scope）两档：
 * - `global`：全局域（users / user_groups / address_books / strategies / audit / roles / servers）；
 * - `device_group`：设备域（devices.* / strategies.assign），生效码按「设备组 guid」分档存储在
 *   `EffectivePermissions.scopes.device_group`，判定时必须做二次判定（见 usePermission）。
 *
 * ⚠️ 前端权限只做 UI 显隐/禁用，**不是安全边界**；后端每次请求实时查库为准。
 */

/** 权限作用域：全局 / 设备组。 */
export const PERMISSION_SCOPE = {
  GLOBAL: "global",
  DEVICE_GROUP: "device_group",
} as const;

export type PermissionScope = (typeof PERMISSION_SCOPE)[keyof typeof PERMISSION_SCOPE];

/** 单条权限码的静态元数据（镜像后端 PermissionDefinition）。 */
export interface PermissionCodeMeta {
  /** 权限码（resource.action），与后端逐字节一致 */
  readonly code: string;
  /** 资源名 */
  readonly resource: string;
  /** 动作名 */
  readonly action: string;
  /** 作用域 */
  readonly scope: PermissionScope;
  /** 是否可存储到角色（system_only 码为 false） */
  readonly assignable: boolean;
  /** 是否 system_only（永不进入 permissions 生效码） */
  readonly systemOnly: boolean;
}

/**
 * 权限码目录（37 条，定义顺序与后端 catalog.go 完全一致）。
 *
 * 命名规则 `resource.action`；requires 依赖关系由后端维护，前端守卫不做依赖推导
 * （实际生效码已由后端过滤，前端 `permissions` 即「依赖过滤后的并集」）。
 */
export const PERMISSION_CATALOG = [
  // ---------- users（global，7 条）----------
  {
    code: "users.view",
    resource: "users",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.create",
    resource: "users",
    action: "create",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.edit",
    resource: "users",
    action: "edit",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.status",
    resource: "users",
    action: "status",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.delete",
    resource: "users",
    action: "delete",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.security",
    resource: "users",
    action: "security",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "users.force_logout",
    resource: "users",
    action: "force_logout",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },

  // ---------- user_groups（global，5 条）----------
  {
    code: "user_groups.view",
    resource: "user_groups",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "user_groups.create",
    resource: "user_groups",
    action: "create",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "user_groups.edit",
    resource: "user_groups",
    action: "edit",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "user_groups.delete",
    resource: "user_groups",
    action: "delete",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "user_groups.membership",
    resource: "user_groups",
    action: "membership",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },

  // ---------- devices（device_group，6 条；GAP2 增 assign）----------
  {
    code: "devices.view",
    resource: "devices",
    action: "view",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "devices.edit",
    resource: "devices",
    action: "edit",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "devices.status",
    resource: "devices",
    action: "status",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "devices.delete",
    resource: "devices",
    action: "delete",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "devices.disconnect",
    resource: "devices",
    action: "disconnect",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "devices.assign",
    resource: "devices",
    action: "assign",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },

  // ---------- address_books（global，3 条）----------
  {
    code: "address_books.view",
    resource: "address_books",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "address_books.edit",
    resource: "address_books",
    action: "edit",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "address_books.share",
    resource: "address_books",
    action: "share",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },

  // ---------- strategies（view/create/edit/delete 为 global，assign 为 device_group，5 条）----------
  {
    code: "strategies.view",
    resource: "strategies",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "strategies.create",
    resource: "strategies",
    action: "create",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "strategies.edit",
    resource: "strategies",
    action: "edit",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "strategies.delete",
    resource: "strategies",
    action: "delete",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "strategies.assign",
    resource: "strategies",
    action: "assign",
    scope: "device_group",
    assignable: true,
    systemOnly: false,
  },

  // ---------- audit（global，1 条）----------
  {
    code: "audit.view",
    resource: "audit",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },

  // ---------- roles（view/assign 可分配；create/edit/delete 为 system_only，5 条）----------
  {
    code: "roles.view",
    resource: "roles",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "roles.assign",
    resource: "roles",
    action: "assign",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "roles.create",
    resource: "roles",
    action: "create",
    scope: "global",
    assignable: false,
    systemOnly: true,
  },
  {
    code: "roles.edit",
    resource: "roles",
    action: "edit",
    scope: "global",
    assignable: false,
    systemOnly: true,
  },
  {
    code: "roles.delete",
    resource: "roles",
    action: "delete",
    scope: "global",
    assignable: false,
    systemOnly: true,
  },

  // ---------- servers（global，5 条）----------
  {
    code: "servers.view",
    resource: "servers",
    action: "view",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "servers.control",
    resource: "servers",
    action: "control",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "servers.config",
    resource: "servers",
    action: "config",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "servers.disconnect",
    resource: "servers",
    action: "disconnect",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
  {
    code: "servers.ban",
    resource: "servers",
    action: "ban",
    scope: "global",
    assignable: true,
    systemOnly: false,
  },
] as const satisfies readonly PermissionCodeMeta[];

/** 全部权限码的联合类型（37 个字面量）。 */
export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];

/** system_only 权限码集合（3 条，永不进入 permissions 生效码）。 */
export const SYSTEM_ONLY_CODES = ["roles.create", "roles.edit", "roles.delete"] as const;

/** system_only 权限码联合类型。 */
export type SystemOnlyCode = (typeof SYSTEM_ONLY_CODES)[number];

/** device_group scope 权限码集合（7 条：devices.* + strategies.assign；GAP2 增 devices.assign）。 */
export const DEVICE_GROUP_CODES = [
  "devices.view",
  "devices.edit",
  "devices.status",
  "devices.delete",
  "devices.disconnect",
  "devices.assign",
  "strategies.assign",
] as const;

/** device_group scope 权限码联合类型。 */
export type DeviceGroupCode = (typeof DEVICE_GROUP_CODES)[number];

/** 权限码 → 元数据的索引（O(1) 查询）。 */
export const PERMISSION_META_MAP: ReadonlyMap<string, PermissionCodeMeta> = new Map(
  PERMISSION_CATALOG.map((meta) => [meta.code, meta]),
);

/** 目录总条数（应恒为 37，供自检与评审调用）。 */
export const PERMISSION_CODE_COUNT = PERMISSION_CATALOG.length;

/** 报告权限码是否为已知码。 */
export function isKnownPermissionCode(code: string): code is PermissionCode {
  return PERMISSION_META_MAP.has(code);
}

/** 报告权限码是否属于 device_group scope（需二次判定）。 */
export function isDeviceGroupScoped(code: string): boolean {
  return (DEVICE_GROUP_CODES as readonly string[]).includes(code);
}

/** 报告权限码是否为 system_only（不可存储到角色，需 is_admin 判定）。 */
export function isSystemOnlyCode(code: string): boolean {
  return (SYSTEM_ONLY_CODES as readonly string[]).includes(code);
}
