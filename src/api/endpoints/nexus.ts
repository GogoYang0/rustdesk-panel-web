/**
 * nexus 域端点（M4-T06，9 端点）。
 *
 * 契约保真：
 * - 绑定态 `NexusBindStatus`（未绑定 {bound:false}）；
 * - 设备码登录 `startNexusLogin` 载荷为开放对象（login_id/user_code/verification_uri…），
 *   `getNexusLoginStatus?login_id=` 轮询；
 * - ★ 状态码特例：提交构建 **201**（{uuid,status:'pending'}）、取消构建 **204**（无响应体）；
 * - 产物下载为文件流（octet-stream，parseAs:'blob'）。
 */
import { api } from "@/api/client";
import { unwrap } from "@/api/error";
import type { components } from "@/types/api-types";

/** nexus 绑定态。 */
export type NexusBindStatus = components["schemas"]["NexusBindStatus"];
/** 构建参数（os 仅 windows）。 */
export type NexusGenerateDto = components["schemas"]["NexusGenerateDto"];
/** 构建任务视图。 */
export type NexusBuildView = components["schemas"]["NexusBuildView"];
/** 构建产物清单。 */
export type BuildFiles = components["schemas"]["BuildFiles"];

/** 设备码登录载荷（上游透传，字段按 GitHub device flow 防御性解析）。 */
export interface NexusDeviceCodePayload {
  login_id?: string;
  user_code?: string;
  verification_uri?: string;
  [key: string]: unknown;
}

/** 登录轮询状态（上游透传，status 字段防御性解析）。 */
export interface NexusLoginStatusPayload {
  status?: string;
  [key: string]: unknown;
}

/** 查询 nexus 绑定态（JWT）。 */
export async function getNexusBindStatus(): Promise<NexusBindStatus> {
  const res = await api.GET("/api/nexus/auth/bind-status");
  return unwrap(res);
}

/** 发起 nexus GitHub 设备码登录（载荷为开放对象）。 */
export async function startNexusLogin(): Promise<NexusDeviceCodePayload> {
  const res = await api.POST("/api/nexus/auth/login");
  return (await unwrap(res)) as NexusDeviceCodePayload;
}

/** 轮询设备码授权态。 */
export async function getNexusLoginStatus(loginId: string): Promise<NexusLoginStatusPayload> {
  const res = await api.GET("/api/nexus/auth/status", { params: { query: { login_id: loginId } } });
  return (await unwrap(res)) as NexusLoginStatusPayload;
}

/** 解绑 nexus（删 nexus_tokens 行）。 */
export async function unbindNexus(): Promise<unknown> {
  const res = await api.DELETE("/api/nexus/auth/bind");
  return unwrap(res);
}

/** 构建列表（本库，当前用户，created_at DESC）。 */
export async function listNexusBuilds(): Promise<NexusBuildView[]> {
  const res = await api.GET("/api/nexus/builds");
  return unwrap(res);
}

/**
 * 提交构建（★ 契约 201；openapi-fetch 将 2xx 一律归入 data，unwrap 透传）。
 *
 * 上游映射：401→重新绑定、409→构建进行中 / 月度限额。
 */
export async function createNexusBuild(body: NexusGenerateDto): Promise<NexusBuildView> {
  const res = await api.POST("/api/nexus/builds", { body });
  return unwrap(res);
}

/**
 * 取消构建（★ 契约 204 无响应体；仅 pending/building 可取消）。
 *
 * @returns 204 时 data 为 undefined，仅以不抛错表示成功
 */
export async function cancelNexusBuild(uuid: string): Promise<void> {
  const res = await api.DELETE("/api/nexus/builds/{uuid}", { params: { path: { uuid } } });
  unwrap(res);
}

/** 构建产物清单（跨用户访问 404）。 */
export async function listNexusBuildFiles(uuid: string): Promise<BuildFiles> {
  const res = await api.GET("/api/nexus/builds/{uuid}/files", { params: { path: { uuid } } });
  return unwrap(res);
}

/**
 * 下载构建产物（文件流 → Blob）。
 *
 * @param uuid 构建 uuid
 * @param filename 产物文件名（服务端 safeJoin 防穿越）
 */
export async function downloadNexusBuildFile(uuid: string, filename: string): Promise<Blob> {
  const res = await api.GET("/api/nexus/builds/{uuid}/files/{filename}", {
    params: { path: { uuid, filename } },
    parseAs: "blob",
  });
  return unwrap(res);
}
