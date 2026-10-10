/**
 * 系统 / 公开配置端点的 typed 请求函数（M4-T02 起步）。
 *
 * 薄封装：调用 api client → unwrap。失败抛 `ApiError`。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { FrontendSettings } from "@/types/domain";

/** 健康检查响应。 */
export interface HealthResponse {
  /** 状态（如 `ok`） */
  status: string;
  /** 服务版本 */
  version?: string;
  /** 服务时间（ISO 8601） */
  time?: string;
}

/**
 * 健康检查（GET /api/healthz，公开）。
 *
 * @returns 健康检查结果
 */
export async function healthz(): Promise<HealthResponse> {
  const res = await api.GET("/api/healthz");
  return unwrap(res);
}

/**
 * 获取前端公开设置（GET /api/settings/frontend，公开）。
 *
 * @returns `{watermarkEnabled, defaultLanguage, webauthnEnabled}`
 */
export async function getFrontendSettings(): Promise<FrontendSettings> {
  const res = await api.GET("/api/settings/frontend");
  return unwrap(res);
}
