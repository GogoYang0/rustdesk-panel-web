/**
 * OIDC 提供者端点（M4-T06，8 端点）。
 *
 * 契约保真：
 * - 列表分页 {data,total}，priority ASC + name ASC；clientSecret 明文（admin 可见，契约即如此）；
 * - 创建 POST 200（非 201）；type/scope/enabled 缺省语义由后端补齐；
 * - ★ 排序 `PATCH /api/oidc-providers/sort` body = **guid 数组**（顺序即 priority，从 0 递增）；
 * - 启停 toggle、discovery 测试 test（{success,message,endpoints?}）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import { toPageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** OIDC 提供者。 */
export type OidcProviderDto = components["schemas"]["OidcProviderDto"];
/** 提供者分页。 */
export type OidcProviderPage = components["schemas"]["OidcProviderPage"];
/** 创建/更新请求。 */
export type OidcProviderUpsert = components["schemas"]["OidcProviderUpsert"];
/** 测试结果。 */
export type OidcTestResult = components["schemas"]["SettingsTestResult"];

/** 提供者分页列表（AdminGuard）。 */
export async function listOidcProviders(params?: { page?: number; pageSize?: number }): Promise<OidcProviderPage> {
  const res = await api.GET("/api/oidc-providers", {
    params: { query: params ? toPageParams(params) : undefined },
  });
  return unwrap(res);
}

/** 创建提供者（POST 200；重名 400）。 */
export async function createOidcProvider(body: OidcProviderUpsert): Promise<OidcProviderDto> {
  const res = await api.POST("/api/oidc-providers", { body });
  return unwrap(res);
}

/**
 * 提供者排序（guid 数组语义：数组顺序从 0 递增写 priority）。
 *
 * @param guids 按目标顺序排列的 guid 数组
 */
export async function sortOidcProviders(guids: string[]): Promise<unknown> {
  const res = await api.PATCH("/api/oidc-providers/sort", { body: guids });
  return unwrap(res);
}

/** 提供者详情。 */
export async function getOidcProvider(guid: string): Promise<OidcProviderDto> {
  const res = await api.GET("/api/oidc-providers/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 更新提供者（issuer 变更清 provider 缓存由后端处理）。 */
export async function updateOidcProvider(guid: string, body: OidcProviderUpsert): Promise<OidcProviderDto> {
  const res = await api.PATCH("/api/oidc-providers/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 删除提供者。 */
export async function deleteOidcProvider(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/oidc-providers/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 启停提供者（切换 enabled）。 */
export async function toggleOidcProvider(guid: string): Promise<OidcProviderDto> {
  const res = await api.PATCH("/api/oidc-providers/{guid}/toggle", { params: { path: { guid } } });
  return unwrap(res);
}

/** 提供者 discovery 测试（恒 200 {success,message,endpoints?}）。 */
export async function testOidcProvider(guid: string): Promise<OidcTestResult> {
  const res = await api.POST("/api/oidc-providers/{guid}/test", { params: { path: { guid } } });
  return unwrap(res);
}
