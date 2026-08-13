/**
 * TanStack Query 查询键约定（M4-T02）。
 *
 * ⚠️ 共享知识 13：命名规范 `[域, 视图 | 子资源, 参数对象]`；
 * **所有** queryKey 从本模块取，**禁止**在页面内字面量写 key；
 * 失效一律用**前缀**匹配（`invalidateQueries({ queryKey: ["users", "list"] })`）。
 *
 * 参数对象为**查询入参原样**（含 `current`/`pageSize` 等契约字段），保证不同分页/筛选缓存独立。
 */

/** 查询入参的通用形态：任意可序列化参数对象。 */
export type QueryParams = Record<string, unknown>;

/**
 * 全部查询键构造器。
 *
 * 无参键用 `as const` 常量；带参键用工厂函数，末位参数对象缺省为 `{}`。
 */
export const qk = {
  // ---------- 会话与权限（session 域）----------
  /** 会话根前缀 */
  session: ["session"] as const,
  /** 当前用户（POST /api/currentUser） */
  currentUser: ["session", "currentUser"] as const,
  /** 生效权限快照（GET /api/permissions/me） */
  permissions: ["session", "permissions"] as const,
  /** 前端公开配置（GET /api/settings/frontend） */
  frontend: ["settings", "frontend"] as const,

  // ---------- 设备域 ----------
  devices: (p: QueryParams = {}) => ["devices", "list", p] as const,
  device: (guid: string) => ["devices", "detail", guid] as const,
  deviceGroups: (p: QueryParams = {}) => ["device-groups", "list", p] as const,
  deviceGroup: (guid: string) => ["device-groups", "detail", guid] as const,
  peers: (p: QueryParams = {}) => ["peers", "list", p] as const,

  // ---------- 用户 / 用户组 / 角色 ----------
  users: (p: QueryParams = {}) => ["users", "list", p] as const,
  adminUsers: (p: QueryParams = {}) => ["users", "admin", p] as const,
  user: (guid: string) => ["users", "detail", guid] as const,
  userGroups: (p: QueryParams = {}) => ["user-groups", "list", p] as const,
  userGroup: (guid: string) => ["user-groups", "detail", guid] as const,
  userGroupMembers: (guid: string, p: QueryParams = {}) => ["user-groups", guid, "members", p] as const,
  roles: (p: QueryParams = {}) => ["roles", "list", p] as const,
  role: (guid: string) => ["roles", "detail", guid] as const,
  userRoles: (guid: string) => ["roles", "user", guid] as const,
  permissionsCatalog: ["roles", "permissions", "catalog"] as const,

  // ---------- 通讯录 ----------
  addressBooks: (p: QueryParams = {}) => ["address-book", "list", p] as const,
  abPeers: (guid: string, p: QueryParams = {}) => ["address-book", guid, "peers", p] as const,
  abTags: (guid: string) => ["address-book", guid, "tags"] as const,
  abRules: (guid: string) => ["address-book", "rules", guid] as const,
  sharedBooks: (p: QueryParams = {}) => ["address-book", "shared", p] as const,

  // ---------- 审计 ----------
  connAudits: (p: QueryParams = {}) => ["audits", "conn", p] as const,
  activeConns: () => ["audits", "conn", "active"] as const,
  fileAudits: (p: QueryParams = {}) => ["audits", "file", p] as const,
  alarmAudits: (p: QueryParams = {}) => ["audits", "alarm", p] as const,
  consoleAudits: (p: QueryParams = {}) => ["audits", "console", p] as const,

  // ---------- 策略 / 服务器 ----------
  strategies: (p: QueryParams = {}) => ["strategies", "list", p] as const,
  strategy: (guid: string) => ["strategies", "detail", guid] as const,
  servers: () => ["servers"] as const,
  serverPeers: (node: string) => ["servers", node, "peers"] as const,
  serverSessions: (node: string) => ["servers", node, "sessions"] as const,
  serverLogs: (node: string, service: string) => ["servers", node, "logs", service] as const,
  serverBans: (node: string) => ["servers", node, "bans"] as const,

  // ---------- nexus ----------
  nexusBindStatus: ["nexus", "bind-status"] as const,
  nexusBuilds: (p: QueryParams = {}) => ["nexus", "builds", p] as const,
  nexusBuildFiles: (uuid: string) => ["nexus", "builds", uuid, "files"] as const,

  // ---------- 仪表盘 ----------
  dashboard: () => ["dashboard", "overview"] as const,
  dashboardTrends: (range: string) => ["dashboard", "trends", range] as const,

  // ---------- 设置 ----------
  generalSettings: () => ["settings", "general"] as const,
  smtpSettings: () => ["settings", "smtp"] as const,
  ldapSettings: () => ["settings", "ldap"] as const,
  oidcProviders: (p: QueryParams = {}) => ["settings", "oidc-providers", p] as const,
  oidcProvider: (guid: string) => ["settings", "oidc-providers", guid] as const,
  updateCheck: (v?: string) => ["settings", "update-check", v ?? "-"] as const,
} as const;

/** 查询键类型（供 hook 泛型约束使用）。 */
export type QueryKeys = typeof qk;
