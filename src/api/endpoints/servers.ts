/**
 * 服务器域端点的 typed 请求函数（M4-T05）。
 *
 * 契约保真：
 * - `GET /api/servers` 并发 /v1/status 握手；**不可达节点返回 `{reachable:false, services:[]}`
 *   而非整体失败**（页面不得把单节点不可达当请求错误）；
 * - peers / sessions / config / logs 为**上游 JSON 透传**（schema 为开放对象，前端防御性解析）；
 * - ★ 转发错误映射（验收项）：503（上游不可达）/ 400（参数）/ 404（节点不存在）/
 *   502（上游响应异常）/ 504（转发超时）——`message` 需正确展示；
 *   `describeServerError` 提供状态码 → i18n 文案（pages:servers.error.*）兜底映射。
 */
import { api } from "@/api/client";
import { unwrap, type ApiEnvelope } from "@/api/error";
import i18n from "@/i18n";
import type { Schemas } from "@/types/domain";

/** 节点状态（含不可达降级形态）。 */
export type NodeStatus = Schemas["NodeStatus"];

/** 服务配置透传（values: Record<string,string>）。 */
export type ServerConfigDto = Schemas["ServerConfigDto"];

/** 封禁名单（device_ids ≤10000，ips 标准 IP）。 */
export type ServerBansDto = Schemas["ServerBansDto"];

/** 可配置服务（契约枚举）。 */
export type ServerService = "hbbs" | "hbbr";

/** 服务动作（契约枚举）。 */
export type ServerServiceAction = "start" | "stop" | "restart" | "apply";

/**
 * 服务器节点列表（GET /api/servers）。
 *
 * @returns 节点状态数组（不可达节点 `reachable:false`，不抛错）
 */
export async function listServerNodes(): Promise<NodeStatus[]> {
  const res = await api.GET("/api/servers");
  return unwrap(res);
}

/**
 * 节点 peers（GET /api/servers/{node}/peers，上游 JSON 透传）。
 *
 * @param node 节点 id
 * @returns 上游原始 JSON（开放 schema，调用方防御性解析）
 */
export async function listServerPeers(node: string): Promise<unknown> {
  const res = await api.GET("/api/servers/{node}/peers", { params: { path: { node } } });
  return unwrap(res);
}

/**
 * 节点会话（GET /api/servers/{node}/sessions，上游 JSON 透传）。
 *
 * @param node 节点 id
 */
export async function listServerSessions(node: string): Promise<unknown> {
  const res = await api.GET("/api/servers/{node}/sessions", { params: { path: { node } } });
  return unwrap(res);
}

/**
 * 断开节点会话（DELETE /api/servers/{node}/sessions/{uuid}，Perm servers.disconnect）。
 *
 * @param node 节点 id
 * @param uuid 会话 uuid
 */
export async function disconnectServerSession(node: string, uuid: string): Promise<unknown> {
  const res = await api.DELETE("/api/servers/{node}/sessions/{uuid}", {
    params: { path: { node, uuid } },
  });
  return unwrap(res);
}

/**
 * 读取服务配置（GET /api/servers/{node}/services/{service}/config，Perm servers.config）。
 *
 * @param node 节点 id
 * @param service 服务名（hbbs/hbbr）
 */
export async function getServerServiceConfig(
  node: string,
  service: ServerService,
): Promise<ServerConfigDto> {
  const res = await api.GET("/api/servers/{node}/services/{service}/config", {
    params: { path: { node, service } },
  });
  return unwrap(res);
}

/**
 * 写入服务配置（PUT /api/servers/{node}/services/{service}/config，Perm servers.config）。
 *
 * @param node 节点 id
 * @param service 服务名
 * @param values 配置键值
 */
export async function updateServerServiceConfig(
  node: string,
  service: ServerService,
  values: Record<string, string>,
): Promise<unknown> {
  const res = await api.PUT("/api/servers/{node}/services/{service}/config", {
    params: { path: { node, service } },
    body: { values },
  });
  return unwrap(res);
}

/**
 * 服务日志（GET /api/servers/{node}/services/{service}/logs，Perm servers.view）。
 *
 * @param node 节点 id
 * @param service 服务名
 * @returns 上游原始 JSON
 */
export async function getServerServiceLogs(node: string, service: ServerService): Promise<unknown> {
  const res = await api.GET("/api/servers/{node}/services/{service}/logs", {
    params: { path: { node, service } },
  });
  return unwrap(res);
}

/**
 * 服务动作（POST /api/servers/{node}/services/{service}/{action}，Perm servers.control）。
 *
 * @param node 节点 id
 * @param service 服务名
 * @param action start / stop / restart / apply
 */
export async function runServerServiceAction(
  node: string,
  service: ServerService,
  action: ServerServiceAction,
): Promise<unknown> {
  const res = await api.POST("/api/servers/{node}/services/{service}/{action}", {
    params: { path: { node, service, action } },
  });
  return unwrap(res);
}

/**
 * 读取封禁名单（GET /api/servers/{node}/bans，Perm servers.ban）。
 *
 * @param node 节点 id
 */
export async function getServerBans(node: string): Promise<ServerBansDto> {
  const res = await api.GET("/api/servers/{node}/bans", { params: { path: { node } } });
  return unwrap(res);
}

/**
 * 更新封禁名单（PUT /api/servers/{node}/bans，Perm servers.ban）。
 *
 * @param node 节点 id
 * @param body `{device_ids, ips}`
 */
export async function updateServerBans(node: string, body: ServerBansDto): Promise<unknown> {
  const res = await api.PUT("/api/servers/{node}/bans", { params: { path: { node } }, body });
  return unwrap(res);
}

// ---------------------------------------------------------------------------
// ★ 转发错误映射（验收项：503 / 400 / 404 / 502 / 504 的 message 正确展示）
// ---------------------------------------------------------------------------

/** 服务器转发错误的兜底 i18n key（pages 命名空间 `servers.error.*`）。 */
export const SERVER_ERROR_KEYS: ReadonlyMap<number, string> = new Map([
  [400, "servers.error.400"],
  [404, "servers.error.404"],
  [502, "servers.error.502"],
  [503, "servers.error.503"],
  [504, "servers.error.504"],
]);

/** i18n 未就绪时的英文兜底（与 common:apiError 兜底策略一致）。 */
const SERVER_ERROR_FALLBACK: ReadonlyMap<number, string> = new Map([
  [400, "Invalid request parameters (400)"],
  [404, "Server node not found (404)"],
  [502, "Upstream server returned an invalid response (502)"],
  [503, "Server node is unreachable (503)"],
  [504, "Request to server node timed out (504)"],
]);

/**
 * 取错误插值明细：优先包络 `error` 字段（后端错误标识字符串），
 * 为空时回退 i18n 中性词 `pages:servers.error.unknown`（zh「未知原因」/ en "unknown reason"）。
 *
 * @param envelope 后端错误包络（可能为空）
 * @returns 非空、不以冒号 / 空白结尾的插值文本
 */
function errorDetail(envelope: ApiEnvelope | undefined): string {
  const errName = envelope?.error;
  if (typeof errName === "string" && errName.trim().length > 0) {
    return errName.trim();
  }
  try {
    const text = i18n.t("servers.error.unknown", {
      ns: "pages",
      defaultValue: "unknown reason",
    });
    if (typeof text === "string" && text.length > 0 && text !== "servers.error.unknown") {
      return text;
    }
  } catch {
    // i18n 未初始化：使用英文兜底
  }
  return "unknown reason";
}

/**
 * 归一化服务器转发错误的展示文案。
 *
 * 规则（映射矩阵验收）：
 * 1. 后端统一错误包络**带了字符串 message** → 原样展示（优先级最高）；
 * 2. message 缺失但命中 400/404/502/503/504 → 用 `pages:servers.error.*` 本地化兜底；
 * 3. 其它情况回退 `error` 字段或状态码通用文案。
 *
 * @param err 捕获的未知异常（通常为 ApiError）
 * @returns 可展示文案
 */
export function describeServerError(err: unknown): string {
  const envelope = (err as { payload?: ApiEnvelope } | null)?.payload;
  const status = (err as { statusCode?: number } | null)?.statusCode;
  const message = envelope?.message;
  // ① 后端带 message：三形态中最常见，直接展示
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }
  if (Array.isArray(message) && message.length > 0) {
    return message.map(String).join("；");
  }
  // ② 状态码本地化兜底（i18n 未就绪时回退英文，避免暴露 key 字面量）
  if (typeof status === "number" && SERVER_ERROR_KEYS.has(status)) {
    const key = SERVER_ERROR_KEYS.get(status) as string;
    // 插值来源优先级：包络 error 字段（后端错误标识）→ i18n 中性词「未知原因」
    const detail = errorDetail(envelope);
    try {
      const text = i18n.t(key, { ns: "pages", message: detail, defaultValue: "" });
      if (
        typeof text === "string" &&
        text.length > 0 &&
        text !== key &&
        // 插值必须生效：残留 `{{` 说明模板未渲染，回退英文兜底
        !text.includes("{{")
      ) {
        // 兜底防御：不得以冒号 / 空白结尾
        const trimmed = text.replace(/[\s:：]+$/u, "");
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    } catch {
      // i18n 未初始化：走英文兜底
    }
    return SERVER_ERROR_FALLBACK.get(status) ?? `Request failed (${String(status)})`;
  }
  // ③ 通用兜底
  const errName = envelope?.error;
  if (typeof errName === "string" && errName.length > 0) {
    return errName;
  }
  return err instanceof Error && !(err instanceof TypeError) ? err.message : "Request failed";
}
