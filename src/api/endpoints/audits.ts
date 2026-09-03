/**
 * 审计域端点（M4-T06）。
 *
 * 路径保真：上报（公开）走单数 `/api/audit/*`；查询走复数 `/api/audits/*`：
 * - `GET /api/audits/conn`（peer_id/uuid/type/start/end 过滤 + 分页）；
 * - `GET /api/audits/conn/active`（devices.disconnect 权限 + scope 过滤，行含 can_disconnect）；
 * - `PATCH /api/audits/conn/{id}`（SuperAdmin 改 note）；
 * - `GET /api/audits/file`（peer_id/uuid/type）、`GET /api/audits/alarm`（typ/uuid）、
 *   `GET /api/audits/console`（result/user_guid）。
 * 分页参数经 toPageParams 产出（current/pageSize camelCase，唯一映射点）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import { toPageParams } from "@/api/pagination";
import type { components } from "@/types/api-types";

/** 连接审计行。 */
export type ConnAuditRow = components["schemas"]["ConnAuditRow"];
/** 连接审计分页。 */
export type ConnAuditPage = components["schemas"]["ConnAuditPage"];
/** 活跃连接行（can_disconnect = scope ∩ active）。 */
export type ConnActiveRow = components["schemas"]["ConnActiveRow"];
/** 活跃连接列表。 */
export type ConnActiveList = components["schemas"]["ConnActiveList"];
/** 文件审计行。 */
export type FileAuditRow = components["schemas"]["FileAuditRow"];
/** 文件审计分页。 */
export type FileAuditPage = components["schemas"]["FileAuditPage"];
/** 告警审计行。 */
export type AlarmAuditRow = components["schemas"]["AlarmAuditRow"];
/** 告警审计分页。 */
export type AlarmAuditPage = components["schemas"]["AlarmAuditPage"];
/** 控制台审计行。 */
export type ConsoleAuditRow = components["schemas"]["ConsoleAuditRow"];
/** 控制台审计分页。 */
export type ConsoleAuditPage = components["schemas"]["ConsoleAuditPage"];

/** 连接审计查询参数（UI 形态 page + 过滤）。 */
export interface ConnAuditQuery extends Record<string, unknown> {
  page: number;
  pageSize: number;
  peer_id?: string;
  uuid?: string;
  type?: number;
  start?: string;
  end?: string;
}

/** 连接审计分页查询。 */
export async function listConnAudits(params: ConnAuditQuery): Promise<ConnAuditPage> {
  const { page, pageSize, ...filters } = params;
  const query: Record<string, unknown> = { ...toPageParams({ page, pageSize }) };
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") query[k] = v;
  }
  const res = await api.GET("/api/audits/conn", { params: { query: query as never } });
  return unwrap(res);
}

/** 活跃连接列表（无分页）。 */
export async function listActiveConns(): Promise<ConnActiveList> {
  const res = await api.GET("/api/audits/conn/active");
  return unwrap(res);
}

/** 更新连接审计备注（SuperAdmin；仅 note）。 */
export async function updateConnAuditNote(id: number, note: string): Promise<unknown> {
  const res = await api.PATCH("/api/audits/conn/{id}", { params: { path: { id } }, body: { note } });
  return unwrap(res);
}

/** 文件审计查询参数。 */
export interface FileAuditQuery extends Record<string, unknown> {
  page: number;
  pageSize: number;
  peer_id?: string;
  uuid?: string;
  /** 0=upload / 1=download */
  type?: number;
}

/** 文件审计分页查询。 */
export async function listFileAudits(params: FileAuditQuery): Promise<FileAuditPage> {
  const { page, pageSize, ...filters } = params;
  const query: Record<string, unknown> = { ...toPageParams({ page, pageSize }) };
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") query[k] = v;
  }
  const res = await api.GET("/api/audits/file", { params: { query: query as never } });
  return unwrap(res);
}

/** 告警审计查询参数。 */
export interface AlarmAuditQuery extends Record<string, unknown> {
  page: number;
  pageSize: number;
  typ?: number;
  uuid?: string;
}

/** 告警审计分页查询。 */
export async function listAlarmAudits(params: AlarmAuditQuery): Promise<AlarmAuditPage> {
  const { page, pageSize, ...filters } = params;
  const query: Record<string, unknown> = { ...toPageParams({ page, pageSize }) };
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") query[k] = v;
  }
  const res = await api.GET("/api/audits/alarm", { params: { query: query as never } });
  return unwrap(res);
}

/** 控制台审计查询参数。 */
export interface ConsoleAuditQuery extends Record<string, unknown> {
  page: number;
  pageSize: number;
  result?: "allowed" | "denied";
  user_guid?: string;
}

/** 控制台审计分页查询。 */
export async function listConsoleAudits(params: ConsoleAuditQuery): Promise<ConsoleAuditPage> {
  const { page, pageSize, ...filters } = params;
  const query: Record<string, unknown> = { ...toPageParams({ page, pageSize }) };
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== "") query[k] = v;
  }
  const res = await api.GET("/api/audits/console", { params: { query: query as never } });
  return unwrap(res);
}
