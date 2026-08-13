/**
 * 领域类型别名（M4-T02）。
 *
 * ⚠️ 共享知识 24：所有 API 类型从 `types/api-types.ts`（openapi-typescript 自动生成）派生；
 * 本文件仅做**只读别名**，**禁止**手写与契约重复的接口（避免契约漂移）。
 *
 * 契约保真提示：`UserPayload` 等为 **snake_case 契约**（`display_name`/`is_admin`/`tfa_enabled`），
 * **禁止**驼峰化；仅在前端展示层用 `utils/format` 做只读转换。
 */
import type { components, paths } from "@/types/api-types";

/** OpenAPI `components["schemas"]` 的类型别名（简写入口）。 */
export type Schemas = components["schemas"];

/** OpenAPI `paths` 的类型别名（简写入口）。 */
export type ApiPaths = paths;

/** HTTP 方法联合类型。 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/** 当前用户 payload（snake_case 契约）。 */
export type UserPayload = Schemas["UserPayload"];

/** 生效权限快照（平铺 permissions + scopes 分档）。 */
export type EffectivePermissions = Schemas["EffectivePermissions"];

/** 统一错误包络 `{statusCode, message, error}`。 */
export type ApiErrorEnvelope = Schemas["Error"];

/** 通用消息响应 `{message}`。 */
export type MessageResponse = Schemas["MessageResponse"];

/** 前端公开配置。 */
export type FrontendSettings = Schemas["FrontendSettings"];

/** 通用分页响应形状 `{data, total}`。 */
export interface Paged<T> {
  /** 当前页数据 */
  data: T[];
  /** 总条数 */
  total: number;
}

/** 通用分页请求参数（契约 camelCase：`current`/`pageSize`，禁止规范化）。 */
export interface PageParams {
  /** 页码（1 起，1~100000，默认 1） */
  current: number;
  /** 每页条数（1~100，默认 20） */
  pageSize: number;
}

/** UI 层分页入参（表格态用 `page`，出网前由 toPageParams 映射为契约 `current`）。 */
export interface UiPageParams {
  /** UI 页码（1 起） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/** 从操作类型中提取 200 成功响应的 data 类型的小工具。 */
export type OperationData<Op> = Op extends { responses: { 200: { content: { "application/json": infer D } } } }
  ? D
  : never;
