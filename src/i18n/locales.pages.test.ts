/**
 * 单测：T04/T05 新增命名空间的 i18n 对齐（M4-T04/T05 验收项）。
 *
 * 约束（第 1 批 QA 曾因硬编码中文判 Major，故此处为**防回归闸门**）：
 * 1. `pages` 命名空间：`zh-CN` 与 `en-US` 的 key 结构必须**完全对齐**；
 * 2. `errors` 命名空间：同上；
 * 3. `en-US` 的 pages/errors 不得含中文字符（除语言自标外无例外）；
 * 4. 两个语言包均不得存在空字符串文案；
 * 5. T04/T05 关键 key 必须齐备（登录/邀请/资料/仪表盘/设备/设备组/策略/服务器/
 *    服务器错误码映射），防止页面新增文案时漏补另一侧语言。
 */
import { describe, expect, it } from "vitest";
import enErrors from "@/i18n/locales/en-US/errors.json";
import enPages from "@/i18n/locales/en-US/pages.json";
import zhErrors from "@/i18n/locales/zh-CN/errors.json";
import zhPages from "@/i18n/locales/zh-CN/pages.json";

/** 拍平嵌套对象为 `a.b.c` 路径集合。 */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

/** 递归收集含中文字符的叶子路径。 */
function findCjkLeaves(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return CJK.test(value) ? [prefix] : [];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    findCjkLeaves(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

/** 中日韩统一表意文字（含全角标点）。 */
const CJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/;

/** 收集空字符串叶子路径。 */
function findEmptyLeaves(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") return value.trim().length === 0 ? [prefix] : [];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    findEmptyLeaves(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

/** T04/T05 必须齐备的关键 key（按域分组）。 */
const REQUIRED_KEYS: readonly string[] = [
  // ---- T04 认证域 ----
  "login.title",
  "login.tabs.password",
  "login.tabs.passkey",
  "login.account.username",
  "login.account.password",
  "login.account.submit",
  "login.tfa.title",
  "login.tfa.codeLabel",
  "login.tfa.submit",
  "login.tfa.missingSecret",
  "login.passkey.submit",
  "login.oidc.title",
  "login.error.credentialsRequired",
  "login.error.tfaCodeRequired",
  "login.error.loginFailed",
  // ---- T04 邀请 ----
  "invite.title",
  "invite.submit",
  "invite.activated",
  "invite.error.passwordMismatch",
  "invite.error.Invalid invitation token",
  "invite.error.Invitation has already been used",
  "invite.error.Invitation has expired",
  // ---- T04 个人中心 ----
  "profile.tabs.profile",
  "profile.tabs.password",
  "profile.tabs.security",
  "profile.tabs.sessions",
  "profile.avatar.hint",
  "profile.tfa.title",
  "profile.passkey.title",
  "profile.session.revoke",
  // ---- T04 仪表盘 ----
  "dashboard.users",
  "dashboard.devices",
  "dashboard.range",
  "dashboard.range_7d",
  "dashboard.connectionTrend",
  "dashboard.adminOnly",
  "dashboard.cpu",
  "dashboard.memory",
  "dashboard.disk",
  // ---- T05 设备域 ----
  "devices.title",
  "devices.detailTitle",
  "devices.field.deviceName",
  "devices.action.disconnect",
  "devices.deleteConfirm",
  "devices.empty",
  // ---- T05 设备组 ----
  "deviceGroups.title",
  "deviceGroups.action.addDevices",
  "deviceGroups.action.removeDevices",
  "deviceGroups.devicesAdded",
  "deviceGroups.devicesRemoved",
  "deviceGroups.strategyNone",
  // ---- T05 策略 ----
  "strategies.title",
  "strategies.action.assign",
  "strategies.assignTitle",
  "strategies.target.device",
  "strategies.target.user",
  "strategies.target.device_group",
  "strategies.partialResult",
  // ---- T05 服务器 ----
  "servers.title",
  "servers.detailTitle",
  "servers.tabs.config",
  "servers.action.restart",
  "servers.service.hbbs",
  "servers.service.hbbr",
  "servers.unreachable",
];

/** T05 服务器错误码映射 key（验收项）。 */
const SERVER_ERROR_KEYS: readonly string[] = [
  "server.400",
  "server.404",
  "server.502",
  "server.503",
  "server.504",
  "serverUnreachable",
];

describe("i18n —— pages 命名空间对齐（T04/T05）", () => {
  it("zh-CN 与 en-US 的 pages key 集合完全一致", () => {
    expect(flattenKeys(zhPages).sort()).toEqual(flattenKeys(enPages).sort());
  });

  it("pages 关键 key 齐备（T04 认证/邀请/资料/仪表盘 + T05 设备/组/策略/服务器）", () => {
    const keys = new Set(flattenKeys(zhPages));
    const missing = REQUIRED_KEYS.filter((key) => !keys.has(key));
    expect(missing, `zh-CN pages 缺少 key: ${missing.join(", ")}`).toEqual([]);

    const enKeys = new Set(flattenKeys(enPages));
    const missingEn = REQUIRED_KEYS.filter((key) => !enKeys.has(key));
    expect(missingEn, `en-US pages 缺少 key: ${missingEn.join(", ")}`).toEqual([]);
  });

  it("en-US pages 不含中文字符（防硬编码中文回归）", () => {
    expect(findCjkLeaves(enPages)).toEqual([]);
  });

  it("pages 两语言包均无空字符串文案", () => {
    expect(findEmptyLeaves(zhPages), "zh-CN pages 存在空文案").toEqual([]);
    expect(findEmptyLeaves(enPages), "en-US pages 存在空文案").toEqual([]);
  });
});

describe("i18n —— errors 命名空间对齐（T05 服务器错误映射）", () => {
  it("zh-CN 与 en-US 的 errors key 集合完全一致", () => {
    expect(flattenKeys(zhErrors).sort()).toEqual(flattenKeys(enErrors).sort());
  });

  it("★ 服务器错误码映射 key 齐备（400/404/502/503/504 + unreachable）", () => {
    const zhKeys = new Set(flattenKeys(zhErrors));
    const missing = SERVER_ERROR_KEYS.filter((key) => !zhKeys.has(key));
    expect(missing, `zh-CN errors 缺少 key: ${missing.join(", ")}`).toEqual([]);

    const enKeys = new Set(flattenKeys(enErrors));
    const missingEn = SERVER_ERROR_KEYS.filter((key) => !enKeys.has(key));
    expect(missingEn, `en-US errors 缺少 key: ${missingEn.join(", ")}`).toEqual([]);
  });

  it("★ 错误码文案含 `{{message}}` 占位符（保留后端原文透出）", () => {
    /** `errors.server` 子树的取值助手（避免整体强转导致 TS 报错）。 */
    const serverOf = (pack: unknown, code: string): string => {
      const server = (pack as { server?: Record<string, string> }).server ?? {};
      return server[code] ?? "";
    };
    for (const code of ["400", "404", "502", "503", "504"] as const) {
      const zh = serverOf(zhErrors, code);
      const en = serverOf(enErrors, code);
      expect(zh, `zh-CN server.${code} 缺少 {{message}}`).toContain("{{message}}");
      expect(en, `en-US server.${code} 缺少 {{message}}`).toContain("{{message}}");
    }
  });

  it("en-US errors 不含中文字符", () => {
    expect(findCjkLeaves(enErrors)).toEqual([]);
  });
});
