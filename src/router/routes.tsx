/**
 * 路由表 —— 菜单与守卫的**单一事实源**（M4-T03，设计 §5.2）。
 *
 * 路由模式：**声明式**（`BrowserRouter` + `Routes`，OQ-1 已批复，非数据模式）。
 * 每条路由声明：路径、页面组件、权限门槛、菜单元数据、面包屑标题。
 * `AppLayout` 的侧边菜单由本表派生（逐项权限过滤），杜绝「菜单可见但点进去 403」。
 *
 * 权限门槛语义（`codes`）：
 * - `[]`        公开（无需登录，如登录页）；
 * - `undefined` 仅需登录；
 * - `[ADMIN_GATE]` 需 `is_admin`（Semi 无对应权限码，如仪表盘 / 设置 / 角色 system_only）；
 * - 其它字符串数组 需对应权限码（`mode: "any"` 任一通过）。
 *
 * 说明：菜单可见性判定（`isMenuVisible` / `visibleMenu`）与类型定义抽取到
 * `menuFilter.ts`（纯函数、无 UI 依赖），本文件 re-export 以保持既有引用路径。
 */
import {
  CustomAbPage,
  PersonalAbPage,
  SharedAbPage,
  ActiveConnPage,
  AlarmAuditPage,
  ConnAuditPage,
  ConsoleAuditPage,
  FileAuditPage,
  DashboardPage,
  DeviceDetailPage,
  DeviceGroupDetailPage,
  DeviceGroupListPage,
  DeviceListPage,
  InviteAcceptPage,
  LoginPage,
  LoginAuditPage,
  MfaEnrollPage,
  MyDevicesPage,
  NexusPage,
  ProfilePage,
  RoleListPage,
  ServerDetailPage,
  ServerListPage,
  SettingsFrontendPage,
  SettingsGeneralPage,
  SettingsLdapPage,
  SettingsMfaPage,
  SettingsOidcPage,
  SettingsSmtpPage,
  StrategyDetailPage,
  StrategyListPage,
  TwoFactorPage,
  UserGroupListPage,
  UserListPage,
} from "@/router/lazyPages";
import { ADMIN_GATE, type RouteItem } from "@/router/menuFilter";

export { ADMIN_GATE, isMenuVisible, visibleMenu } from "@/router/menuFilter";
export type { RouteItem } from "@/router/menuFilter";

/**
 * 应用路由表（顶层）。
 *
 * 结构：`/` 下为受保护布局（含菜单），登录相关为无壳路由。
 */
export const appRoutes: readonly RouteItem[] = [
  {
    // 登录页：公开，无壳布局（由 AuthLayout 承载）
    path: "/login",
    element: LoginPage,
    codes: [],
  },
  {
    // 独立两步验证页：公开，仅持有后端签发的 secret 时可用（设计 §5.2）
    path: "/login/2fa",
    element: TwoFactorPage,
    codes: [],
  },
  {
    // 邀请接受页：公开，带 token（设计 §5.2）
    path: "/invite/accept",
    element: InviteAcceptPage,
    codes: [],
  },
  {
    // GAP2 强制 MFA 绑定页：公开（凭 mfa_enroll 步会话 secret，无 token 不可跳过）
    path: "/mfa-enroll",
    element: MfaEnrollPage,
    codes: [],
  },
  {
    // 仪表盘：SuperAdmin 语义（后端 RequireSuperAdmin），前端用 is_admin 判定（OQ-8）
    path: "/dashboard",
    element: DashboardPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:dashboard",
  },
  {
    path: "/profile",
    element: ProfilePage,
    // 仅需登录（自身）
    titleKey: "menu:profile",
  },
  {
    // GAP2 我的设备（auth 档：登录即用，不设权限码）
    path: "/my-devices",
    element: MyDevicesPage,
    titleKey: "menu:myDevices",
  },
  {
    path: "/servers",
    element: ServerListPage,
    codes: ["servers.view"],
    titleKey: "menu:servers",
  },
  {
    path: "/devices",
    element: DeviceListPage,
    // 设备域：路由门槛用 devices.view（行级按钮再按 scope 二次判定）
    codes: ["devices.view"],
    titleKey: "menu:devices",
  },
  {
    path: "/device-groups",
    element: DeviceGroupListPage,
    codes: ["devices.view"],
    titleKey: "menu:deviceGroups",
  },
  {
    // 设备详情（无菜单项，从列表跳入）
    path: "/devices/:guid",
    element: DeviceDetailPage,
    codes: ["devices.view"],
  },
  {
    // 设备组详情（无菜单项，从列表跳入）
    path: "/device-groups/:guid",
    element: DeviceGroupDetailPage,
    codes: ["devices.view"],
  },
  {
    // 策略详情（无菜单项，从列表跳入）
    path: "/strategies/:guid",
    element: StrategyDetailPage,
    codes: ["strategies.view"],
  },
  {
    // 服务器节点详情（无菜单项，从列表跳入）
    path: "/servers/:node",
    element: ServerDetailPage,
    codes: ["servers.view"],
  },
  {
    path: "/address-book/personal",
    element: PersonalAbPage,
    // 仅需登录（owner）
    titleKey: "menu:abPersonal",
  },
  {
    path: "/address-book/shared",
    element: SharedAbPage,
    // 共享通讯录需 address_books.view（页面级权限门槛，M4-T07 MIN-01 修复；
    // 行级 share/edit 按钮仍按权限码二次判定）
    codes: ["address_books.view"],
    titleKey: "menu:abShared",
  },
  {
    path: "/address-book/custom",
    element: CustomAbPage,
    // 自定义通讯录同上（M4-T07 MIN-01 修复）
    codes: ["address_books.view"],
    titleKey: "menu:abCustom",
  },
  {
    path: "/users",
    element: UserListPage,
    codes: ["users.view"],
    titleKey: "menu:users",
  },
  {
    path: "/user-groups",
    element: UserGroupListPage,
    codes: ["user_groups.view"],
    titleKey: "menu:userGroups",
  },
  {
    path: "/roles",
    element: RoleListPage,
    codes: ["roles.view"],
    titleKey: "menu:roles",
  },
  {
    path: "/strategies",
    element: StrategyListPage,
    codes: ["strategies.view"],
    titleKey: "menu:strategies",
  },
  {
    path: "/audit/connections",
    element: ConnAuditPage,
    codes: ["audit.view"],
    titleKey: "menu:auditConn",
  },
  {
    path: "/audit/active",
    element: ActiveConnPage,
    // 活跃连接需 disconnect 能力（设计 §5.2）
    codes: ["devices.disconnect"],
    titleKey: "menu:auditActive",
  },
  {
    path: "/audit/files",
    element: FileAuditPage,
    codes: ["audit.view"],
    titleKey: "menu:auditFile",
  },
  {
    path: "/audit/alarms",
    element: AlarmAuditPage,
    codes: ["audit.view"],
    titleKey: "menu:auditAlarm",
  },
  {
    path: "/audit/console",
    element: ConsoleAuditPage,
    codes: ["audit.view"],
    titleKey: "menu:auditConsole",
  },
  {
    // GAP2 登录审计（audit.view）
    path: "/audit/login",
    element: LoginAuditPage,
    codes: ["audit.view"],
    titleKey: "menu:auditLogin",
  },
  {
    path: "/nexus",
    element: NexusPage,
    // 仅需登录（自身）
    titleKey: "menu:nexus",
  },
  {
    path: "/settings/general",
    element: SettingsGeneralPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsGeneral",
  },
  {
    path: "/settings/smtp",
    element: SettingsSmtpPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsSmtp",
  },
  {
    path: "/settings/oidc",
    element: SettingsOidcPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsOidc",
  },
  {
    path: "/settings/ldap",
    element: SettingsLdapPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsLdap",
  },
  {
    // GAP2 强制 MFA 策略（AdminGuard）
    path: "/settings/mfa",
    element: SettingsMfaPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsMfa",
  },
  {
    path: "/settings/frontend",
    element: SettingsFrontendPage,
    codes: [ADMIN_GATE],
    titleKey: "menu:settingsFrontend",
  },
] as const;
