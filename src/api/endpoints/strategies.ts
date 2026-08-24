/**
 * 策略域端点（M4-T05）。
 *
 * 契约保真：
 * - CRUD：GET/POST /api/strategies、GET/PATCH/DELETE /api/strategies/{guid}；
 * - `StrategyUpsertRequest.config_options` 为 `Record<string,string>`（DB TEXT 存 JSON）；
 * - 候选：GET /api/strategies/candidates、/api/strategies/target-candidates?target_type=device|user；
 * - 指派记录：GET /api/strategies/{guid}/assignments?target_type=device|user|device_group；
 * - 指派/解绑：POST /api/strategies/{guid}/assign、/unassign，body `AssignRequest`；
 *   响应 `AssignResult` 为**部分成功**（success[] + errors[{target_guid,reason}]）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { PageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** 策略视图。 */
export type StrategyView = components["schemas"]["StrategyView"];
/** 策略 upsert 请求。 */
export type StrategyUpsertRequest = components["schemas"]["StrategyUpsertRequest"];
/** 指派目标类型。 */
export type AssignTargetType = components["schemas"]["AssignRequest"]["target_type"];
/** 指派请求。 */
export type AssignRequest = components["schemas"]["AssignRequest"];
/** 指派结果（部分成功）。 */
export type AssignResult = components["schemas"]["AssignResult"];

/** 策略列表查询参数。 */
export interface StrategyListParams extends PageParams {
  /** 索引签名（满足 qk QueryParams 结构约束） */
  [key: string]: unknown;
  /** 名称筛选 */
  name?: string;
}

/** 策略列表（GET /api/strategies）。 */
export async function listStrategies(params: StrategyListParams): Promise<components["schemas"]["StrategyPage"]> {
  const res = await api.GET("/api/strategies", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 策略详情（GET /api/strategies/{guid}）。 */
export async function getStrategy(guid: string): Promise<StrategyView> {
  const res = await api.GET("/api/strategies/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 创建策略（POST /api/strategies）。 */
export async function createStrategy(body: StrategyUpsertRequest): Promise<StrategyView> {
  const res = await api.POST("/api/strategies", { body });
  return unwrap(res);
}

/** 更新策略（PATCH /api/strategies/{guid}）。 */
export async function updateStrategy(guid: string, body: StrategyUpsertRequest): Promise<StrategyView> {
  const res = await api.PATCH("/api/strategies/{guid}", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 删除策略（DELETE /api/strategies/{guid}）。 */
export async function deleteStrategy(guid: string): Promise<unknown> {
  const res = await api.DELETE("/api/strategies/{guid}", { params: { path: { guid } } });
  return unwrap(res);
}

/** 策略候选（GET /api/strategies/candidates；设备组编辑页选策略用）。 */
export async function listStrategyCandidates(
  params: PageParams,
): Promise<components["schemas"]["StrategyCandidatePage"]> {
  const res = await api.GET("/api/strategies/candidates", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 指派目标候选（GET /api/strategies/target-candidates?target_type=device|user）。 */
export async function listStrategyTargetCandidates(params: {
  target_type: "device" | "user";
  current: number;
  pageSize: number;
}): Promise<components["schemas"]["DeviceTargetPage"] | components["schemas"]["UserTargetPage"]> {
  const res = await api.GET("/api/strategies/target-candidates", { params: { query: { ...params } } });
  return unwrap(res);
}

/** 指派记录（GET /api/strategies/{guid}/assignments，target_type 决定 oneOf 分支）。 */
export async function listStrategyAssignments(
  guid: string,
  params: { target_type: AssignTargetType; current: number; pageSize: number },
): Promise<
  | components["schemas"]["DeviceTargetPage"]
  | components["schemas"]["UserTargetPage"]
  | components["schemas"]["DeviceGroupTargetPage"]
> {
  const res = await api.GET("/api/strategies/{guid}/assignments", {
    params: { path: { guid }, query: { ...params } },
  });
  return unwrap(res);
}

/**
 * 指派策略（POST /api/strategies/{guid}/assign）。
 *
 * ★ device_group scope：对设备组目标，前端须以该组上下文 `can("strategies.assign",
 * { deviceGroupGuid })` 二次判定（§4.4）；后端仍实时裁决。
 */
export async function assignStrategy(guid: string, body: AssignRequest): Promise<AssignResult> {
  const res = await api.POST("/api/strategies/{guid}/assign", { params: { path: { guid } }, body });
  return unwrap(res);
}

/** 解绑策略（POST /api/strategies/{guid}/unassign）。 */
export async function unassignStrategy(guid: string, body: AssignRequest): Promise<AssignResult> {
  const res = await api.POST("/api/strategies/{guid}/unassign", { params: { path: { guid } }, body });
  return unwrap(res);
}
