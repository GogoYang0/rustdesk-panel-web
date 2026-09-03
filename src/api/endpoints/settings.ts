/**
 * 设置域端点（M4-T06：通用 / SMTP / LDAP / 前端公开设置 / 更新检查）。
 *
 * ★ 掩码回读保真（验收项）：
 * - `SmtpConfig.pass` 回读恒 `'******'`；`LdapConfig.bindCredentials` 回读恒 `'******'`；
 * - PUT 时命中掩码 `'******'` 由**后端**跳过更新，但前端仍以 `stripMasked` 兜底
 *   不回传掩码值（避免把掩码当真实口令写回）；
 * - SMTP/LDAP GET 404 =「尚未配置」，页面按空表单处理（不算错误）；
 * - 测试端点恒 200 `{success, message}`（连接失败也是 success:false）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { components } from "@/types/api-types";

/** 前端公开设置（三键）。 */
export type FrontendSettings = components["schemas"]["FrontendSettings"];
/** 通用设置嵌套 DTO。 */
export type GeneralSettings = components["schemas"]["GeneralSettings"];
/** 通用设置更新请求。 */
export type UpdateGeneralSettings = components["schemas"]["UpdateGeneralSettings"];
/** SMTP 配置。 */
export type SmtpConfig = components["schemas"]["SmtpConfig"];
/** LDAP 配置。 */
export type LdapConfig = components["schemas"]["LdapConfig"];
/** 测试结果（恒 200）。 */
export type SettingsTestResult = components["schemas"]["SettingsTestResult"];
/** 更新检查结果。 */
export type UpdateCheckResult = components["schemas"]["UpdateCheckResult"];

/** 契约掩码值（回读形态，不代表真实口令）。 */
export const MASKED_VALUE = "******";

/**
 * 判断值是否为掩码回读（前端保存兜底：掩码不回传）。
 *
 * @param value 配置字段原始值
 */
export function isMasked(value: string | undefined | null): boolean {
  return typeof value === "string" && value === MASKED_VALUE;
}

/**
 * 保存兜底：掩码 / 空串 / undefined 归一为 undefined（不回传，后端跳过更新）。
 *
 * @param value 用户输入的口令字段
 */
export function stripMasked(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== MASKED_VALUE ? trimmed : undefined;
}

/** 前端公开设置（Public；三键）。 */
export async function getFrontendSettings(): Promise<FrontendSettings> {
  const res = await api.GET("/api/settings/frontend");
  return unwrap(res);
}

/** 通用设置读取（AdminGuard；8 键嵌套 DTO）。 */
export async function getGeneralSettings(): Promise<GeneralSettings> {
  const res = await api.GET("/api/settings/general");
  return unwrap(res);
}

/** 通用设置更新（watermarkEnabled 必填；defaultLanguage ^[a-z]{2}-[A-Z]{2}$）。 */
export async function updateGeneralSettings(body: UpdateGeneralSettings): Promise<unknown> {
  const res = await api.PUT("/api/settings/general", { body });
  return unwrap(res);
}

/** SMTP 配置读取（无配置 404；pass 恒掩码）。 */
export async function getSmtpSettings(): Promise<SmtpConfig> {
  const res = await api.GET("/api/settings/smtp");
  return unwrap(res);
}

/** SMTP 配置更新（pass='******' 由后端跳过更新）。 */
export async function updateSmtpSettings(body: SmtpConfig): Promise<SmtpConfig> {
  const res = await api.PUT("/api/settings/smtp", { body });
  return unwrap(res);
}

/** SMTP 连通性测试（恒 200 {success,message}；body 可省略用已存配置）。 */
export async function testSmtpSettings(body?: SmtpConfig): Promise<SettingsTestResult> {
  const res = await api.POST("/api/settings/smtp/test", body === undefined ? {} : { body });
  return unwrap(res);
}

/** LDAP 配置读取（bindCredentials 恒掩码）。 */
export async function getLdapSettings(): Promise<LdapConfig> {
  const res = await api.GET("/api/settings/ldap");
  return unwrap(res);
}

/** LDAP 配置更新（bindCredentials='******' 由后端跳过更新）。 */
export async function updateLdapSettings(body: LdapConfig): Promise<LdapConfig> {
  const res = await api.PUT("/api/settings/ldap", { body });
  return unwrap(res);
}

/** LDAP 连通性测试（恒 200 {success,message}）。 */
export async function testLdapSettings(body?: LdapConfig): Promise<SettingsTestResult> {
  const res = await api.POST("/api/settings/ldap/test", body === undefined ? {} : { body });
  return unwrap(res);
}

/** 更新检查（AdminGuard；frontend_version 仅影响响应 frontend 分支比对）。 */
export async function getUpdateCheck(frontendVersion?: string): Promise<UpdateCheckResult> {
  const res = await api.GET("/api/update-check", {
    params: {
      query:
        frontendVersion !== undefined && frontendVersion.length > 0
          ? { frontend_version: frontendVersion }
          : undefined,
    },
  });
  return unwrap(res);
}
