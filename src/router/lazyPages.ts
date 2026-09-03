/**
 * 页面懒加载集中出口（M4-T03 建立，T04 起逐个落地）。
 *
 * 路由级 `React.lazy` 入口：所有页面组件在此以 `lazy(() => import(...))` 声明，
 * 由 `routes.tsx` 引用，配合路由级 `<Suspense>` 骨架。
 *
 * T04~T06 全部功能域已落地为真实页面；错误页（403/404）同样由此出口。
 */
import { lazy } from "react";

/** 403 页面（路由级懒加载）。 */
export const ForbiddenPage = lazy(() =>
  import("@/pages/errors/Forbidden").then((m) => ({ default: m.Forbidden })),
);

/** 404 页面（路由级懒加载）。 */
export const NotFoundPage = lazy(() =>
  import("@/pages/errors/NotFound").then((m) => ({ default: m.NotFound })),
);

// ---------- T04：认证域 + 个人中心 + 仪表盘 ----------
/** 登录页（含 2FA / Passkey / OIDC 入口）。 */
export const LoginPage = lazy(() => import("@/pages/auth/Login").then((m) => ({ default: m.Login })));
/** 独立两步验证页。 */
export const TwoFactorPage = lazy(() =>
  import("@/pages/auth/TwoFactor").then((m) => ({ default: m.TwoFactor })),
);
/** 邀请接受页。 */
export const InviteAcceptPage = lazy(() =>
  import("@/pages/auth/InviteAccept").then((m) => ({ default: m.InviteAccept })),
);
/** 个人中心。 */
export const ProfilePage = lazy(() =>
  import("@/pages/profile/Profile").then((m) => ({ default: m.Profile })),
);
/** 仪表盘（SuperAdmin）。 */
export const DashboardPage = lazy(() =>
  import("@/pages/dashboard/Dashboard").then((m) => ({ default: m.Dashboard })),
);

// ---------- T05：设备域 + 设备组 + 策略 + 服务器 ----------
/** 设备列表。 */
export const DeviceListPage = lazy(() =>
  import("@/pages/devices/DeviceList").then((m) => ({ default: m.DeviceList })),
);
/** 设备详情。 */
export const DeviceDetailPage = lazy(() =>
  import("@/pages/devices/DeviceDetail").then((m) => ({ default: m.DeviceDetail })),
);
/** 设备组列表。 */
export const DeviceGroupListPage = lazy(() =>
  import("@/pages/device-groups/DeviceGroupList").then((m) => ({ default: m.DeviceGroupList })),
);
/** 设备组详情。 */
export const DeviceGroupDetailPage = lazy(() =>
  import("@/pages/device-groups/DeviceGroupDetail").then((m) => ({ default: m.DeviceGroupDetail })),
);
/** 策略列表。 */
export const StrategyListPage = lazy(() =>
  import("@/pages/strategies/StrategyList").then((m) => ({ default: m.StrategyList })),
);
/** 策略详情。 */
export const StrategyDetailPage = lazy(() =>
  import("@/pages/strategies/StrategyDetail").then((m) => ({ default: m.StrategyDetail })),
);
/** 服务器列表。 */
export const ServerListPage = lazy(() =>
  import("@/pages/servers/ServerList").then((m) => ({ default: m.ServerList })),
);
/** 服务器详情。 */
export const ServerDetailPage = lazy(() =>
  import("@/pages/servers/ServerDetail").then((m) => ({ default: m.ServerDetail })),
);

// ---------- T06：用户 / 用户组 / 角色 ----------
/** 用户列表。 */
export const UserListPage = lazy(() =>
  import("@/pages/users/UserList").then((m) => ({ default: m.UserList })),
);
/** 用户组列表。 */
export const UserGroupListPage = lazy(() =>
  import("@/pages/user-groups/UserGroupList").then((m) => ({ default: m.UserGroupList })),
);
/** 角色列表。 */
export const RoleListPage = lazy(() =>
  import("@/pages/roles/RoleList").then((m) => ({ default: m.RoleList })),
);

// ---------- T06 第 2 批：通讯录 + 审计 ----------
/** 我的通讯录。 */
export const PersonalAbPage = lazy(() =>
  import("@/pages/address-book/PersonalAb").then((m) => ({ default: m.PersonalAb })),
);
/** 共享通讯录。 */
export const SharedAbPage = lazy(() =>
  import("@/pages/address-book/SharedAb").then((m) => ({ default: m.SharedAb })),
);
/** 自定义通讯录。 */
export const CustomAbPage = lazy(() =>
  import("@/pages/address-book/CustomAb").then((m) => ({ default: m.CustomAb })),
);
/** 连接审计。 */
export const ConnAuditPage = lazy(() =>
  import("@/pages/audit/ConnAudit").then((m) => ({ default: m.ConnAudit })),
);
/** 活跃连接。 */
export const ActiveConnPage = lazy(() =>
  import("@/pages/audit/ActiveConn").then((m) => ({ default: m.ActiveConn })),
);
/** 文件审计。 */
export const FileAuditPage = lazy(() =>
  import("@/pages/audit/FileAudit").then((m) => ({ default: m.FileAudit })),
);
/** 告警审计。 */
export const AlarmAuditPage = lazy(() =>
  import("@/pages/audit/AlarmAudit").then((m) => ({ default: m.AlarmAudit })),
);
/** 控制台审计。 */
export const ConsoleAuditPage = lazy(() =>
  import("@/pages/audit/ConsoleAudit").then((m) => ({ default: m.ConsoleAudit })),
);

// ---------- T06 第 3 批：Nexus + 设置 ----------
/** Nexus 构建。 */
export const NexusPage = lazy(() =>
  import("@/pages/nexus/NexusPage").then((m) => ({ default: m.NexusPage })),
);
/** 通用设置。 */
export const SettingsGeneralPage = lazy(() =>
  import("@/pages/settings/SettingsGeneral").then((m) => ({ default: m.SettingsGeneral })),
);
/** 邮件设置。 */
export const SettingsSmtpPage = lazy(() =>
  import("@/pages/settings/SettingsSmtp").then((m) => ({ default: m.SettingsSmtp })),
);
/** 单点登录。 */
export const SettingsOidcPage = lazy(() =>
  import("@/pages/settings/SettingsOidc").then((m) => ({ default: m.SettingsOidc })),
);
/** LDAP 设置。 */
export const SettingsLdapPage = lazy(() =>
  import("@/pages/settings/SettingsLdap").then((m) => ({ default: m.SettingsLdap })),
);
/** 前端设置。 */
export const SettingsFrontendPage = lazy(() =>
  import("@/pages/settings/SettingsFrontend").then((m) => ({ default: m.SettingsFrontend })),
);
