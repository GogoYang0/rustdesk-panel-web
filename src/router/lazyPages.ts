/**
 * 页面懒加载集中出口（M4-T03 建立，T04 起逐个落地）。
 *
 * 路由级 `React.lazy` 入口：所有页面组件在此以 `lazy(() => import(...))` 声明，
 * 由 `routes.tsx` 引用，配合路由级 `<Suspense>` 骨架。
 *
 * T04 已落地：登录 / 两步验证 / 邀请接受 / 个人中心 / 仪表盘。
 * 其余功能域（T05~T06）暂指向占位组件，保证路由表引用完整、可构建、可导航。
 */
import { lazy } from "react";
import { makePlaceholder } from "@/router/placeholderFactory";

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

// ---------- 功能域占位（T05~T06 逐个替换为 lazy(() => import(...))）----------
/** 服务器。 */
export const ServerListPlaceholder = makePlaceholder("servers");
/** 设备。 */
export const DeviceListPlaceholder = makePlaceholder("devices");
/** 设备组。 */
export const DeviceGroupListPlaceholder = makePlaceholder("deviceGroups");
/** 我的通讯录。 */
export const AbPersonalPlaceholder = makePlaceholder("abPersonal");
/** 共享通讯录。 */
export const AbSharedPlaceholder = makePlaceholder("abShared");
/** 自定义通讯录。 */
export const AbCustomPlaceholder = makePlaceholder("abCustom");
/** 用户。 */
export const UserListPlaceholder = makePlaceholder("users");
/** 用户组。 */
export const UserGroupListPlaceholder = makePlaceholder("userGroups");
/** 角色。 */
export const RoleListPlaceholder = makePlaceholder("roles");
/** 策略。 */
export const StrategyListPlaceholder = makePlaceholder("strategies");
/** 连接审计。 */
export const AuditConnPlaceholder = makePlaceholder("auditConn");
/** 活跃连接。 */
export const AuditActivePlaceholder = makePlaceholder("auditActive");
/** 文件审计。 */
export const AuditFilePlaceholder = makePlaceholder("auditFile");
/** 告警审计。 */
export const AuditAlarmPlaceholder = makePlaceholder("auditAlarm");
/** 控制台审计。 */
export const AuditConsolePlaceholder = makePlaceholder("auditConsole");
/** Nexus 构建。 */
export const NexusPlaceholder = makePlaceholder("nexus");
/** 通用设置。 */
export const SettingsGeneralPlaceholder = makePlaceholder("settingsGeneral");
/** 邮件设置。 */
export const SettingsSmtpPlaceholder = makePlaceholder("settingsSmtp");
/** 单点登录。 */
export const SettingsOidcPlaceholder = makePlaceholder("settingsOidc");
/** LDAP 设置。 */
export const SettingsLdapPlaceholder = makePlaceholder("settingsLdap");
/** 前端设置。 */
export const SettingsFrontendPlaceholder = makePlaceholder("settingsFrontend");
