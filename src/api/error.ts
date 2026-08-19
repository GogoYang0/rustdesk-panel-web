/**
 * 统一错误包络处理（M4-T02；i18n 化：M4-T02/T03 修复批次 DEV-02 附带项）。
 *
 * ⚠️ 契约：后端统一错误包络为 `{statusCode, message, error}`（`components/schemas/Error`）。
 * `message` 存在**三种形态**：
 *   ① 字符串（纯文本业务文案）；
 *   ② 字符串数组（class-validator 校验错误）；
 *   ③ 业务对象（结构化错误详情）。
 * 本模块把三形态**归一化为可展示文本** `ApiError.display`（共享知识 15）。
 *
 * ★ i18n：本模块属**非 React 上下文**（自定义 Error 类 + 请求层），无法使用
 *   `useTranslation` Hook，故通过 i18next 实例 `i18n.t()` 直接取文案。
 *   locale 资源：`common:apiError.*`；i18next 未初始化时 `t()` 会返回 key 字面量，
 *   故此处对「返回 key 原文」的情况回退为中性英文文案，避免界面暴露 key。
 */
import i18n from "@/i18n";

/** 后端错误包络（`{statusCode, message, error}`）。 */
export interface ApiEnvelope {
  /** HTTP 状态码 */
  statusCode?: number;
  /** 错误信息，三形态：字符串 / 字符串数组 / 业务对象 */
  message?: unknown;
  /** 错误名（如 `Bad Request`） */
  error?: string;
}

/**
 * 取翻译文案；若 i18next 未就绪（返回 key 字面量）则回退给定默认值。
 *
 * @param key i18n key（`common` 命名空间）
 * @param fallback 未就绪时的英文兜底文案
 * @returns 展示文案
 */
function translate(key: string, fallback: string): string {
  try {
    const text = i18n.t(key, { ns: "common", defaultValue: fallback });
    return typeof text === "string" && text.length > 0 && text !== key ? text : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 从 HTTP 状态码推导兜底展示文案。
 *
 * @param statusCode HTTP 状态码
 * @returns 本地化兜底文案
 */
function fallbackMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return translate("apiError.badRequest", "Bad request (400)");
    case 401:
      return translate("apiError.unauthorized", "Not authenticated or session expired (401)");
    case 403:
      return translate("apiError.forbidden", "You do not have permission to perform this action (403)");
    case 404:
      return translate("apiError.notFound", "Resource not found (404)");
    case 409:
      return translate("apiError.conflict", "Resource conflict (409)");
    case 429:
      return translate("apiError.tooManyRequests", "Too many requests, please try again later (429)");
    case 500:
      return translate("apiError.serverError", "Internal server error (500)");
    default:
      return i18n.t("apiError.requestFailed", { ns: "common", statusCode, defaultValue: `Request failed (${statusCode})` });
  }
}

/**
 * 把错误包络的 `message` 三形态归一化为可展示文本。
 *
 * - 字符串：原样返回；
 * - 字符串数组：以「；」连接（校验错误）；
 * - 业务对象：`JSON.stringify`（结构化错误）；
 * - 其它：回退 `error` 字段，再回退状态码兜底文案。
 *
 * @param payload 错误包络（可能不完整）
 * @param statusCode HTTP 状态码
 * @returns 可展示文本
 */
export function normalizeMessage(payload: ApiEnvelope | null | undefined, statusCode: number): string {
  const message = payload?.message;
  if (typeof message === "string") {
    // ① 纯文本形态
    return message;
  }
  if (Array.isArray(message)) {
    // ② 校验字符串数组形态（过滤非字符串项后连接）
    const parts = message.filter((item): item is string => typeof item === "string");
    if (parts.length > 0) {
      return parts.join("；");
    }
    // 空数组 / 无字符串项：继续向下回退（勿把空数组当对象序列化）
  } else if (message !== null && typeof message === "object") {
    // ③ 业务对象形态
    try {
      return JSON.stringify(message);
    } catch {
      // 循环引用等情况：回退兜底
      return payload?.error ?? fallbackMessage(statusCode);
    }
  }
  return payload?.error && payload.error.length > 0 ? payload.error : fallbackMessage(statusCode);
}

/**
 * 请求层统一错误类型。
 *
 * 所有经 `unwrap()` 的请求失败均抛出 `ApiError`；UI 展示一律用 `err.display`。
 */
export class ApiError extends Error {
  /** HTTP 状态码 */
  public readonly statusCode: number;
  /** 原始错误包络（可能不完整，非 Error 响应时为空对象） */
  public readonly payload: ApiEnvelope;
  /** 原始 Response（用于读取 headers / status 等） */
  public readonly raw: Response;

  /**
   * @param statusCode HTTP 状态码
   * @param payload 错误包络（`{statusCode, message, error}`）
   * @param raw 原始 Response
   */
  constructor(statusCode: number, payload: ApiEnvelope, raw: Response) {
    super(normalizeMessage(payload, statusCode));
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.payload = payload;
    this.raw = raw;
  }

  /** 归一化后的可展示文本（message 三形态）。 */
  get display(): string {
    return normalizeMessage(this.payload, this.statusCode);
  }
}

/**
 * 从 openapi-fetch 的结果统一解包：有 `error` 抛 `ApiError`，否则返回 `data`。
 *
 * @param res openapi-fetch 返回的 `{data, error, response}`
 * @returns 成功数据
 * @throws {ApiError} 当 `res.error` 存在时
 */
export function unwrap<T>(res: { data?: T; error?: unknown; response: Response }): T {
  if (res.error !== undefined) {
    const payload: ApiEnvelope =
      res.error !== null && typeof res.error === "object" ? (res.error as ApiEnvelope) : { message: res.error };
    throw new ApiError(res.response.status, payload, res.response);
  }
  return res.data as T;
}

/** 报告错误是否为 `ApiError`。 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

/**
 * 从未知异常提取可展示文案（用于 `catch (e)` 的兜底展示）。
 *
 * @param err 未知异常
 * @returns 可展示文本
 */
export function toDisplayMessage(err: unknown): string {
  if (err instanceof ApiError) {
    return err.display;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return translate("state.unknownError", "Unknown error");
}
