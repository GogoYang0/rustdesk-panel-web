/**
 * 分页契约统一封装（M4-T02）。
 *
 * ⚠️ OQ-9 铁律：契约分页参数为 **camelCase** `current`（1~100000，默认 1）与 `pageSize`（1~100，默认 20），
 * **契约明确禁止规范化**。UI 层表格态用 `page` / `pageSize`，出网前**必须**映射回 `current`。
 *
 * ★ 唯一映射点：`toPageParams` 是 UI `page` → 契约 `current` 的**唯一**映射处。
 *   任何其它位置出现 `current` 的改写 / 规范化即视为违规（评审铁律）。
 */
import type { PageParams, Paged, UiPageParams } from "@/types/domain";

export type { PageParams, Paged, UiPageParams };

/** 契约分页默认值（camelCase，禁止规范化）。 */
export const DEFAULT_PAGE_PARAMS: Readonly<PageParams> = Object.freeze({ current: 1, pageSize: 20 });

/** 页码下限（契约 minimum: 1）。 */
export const MIN_CURRENT = 1;
/** 页码上限（契约 maximum: 100000）。 */
export const MAX_CURRENT = 100000;
/** 每页条数下限（契约 minimum: 1）。 */
export const MIN_PAGE_SIZE = 1;
/** 每页条数上限（契约 maximum: 100）。 */
export const MAX_PAGE_SIZE = 100;

/**
 * 夹取页码到契约合法区间 `[1, 100000]`。
 *
 * @param value 原始页码
 * @returns 合法页码
 */
export function clampCurrent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_PARAMS.current;
  const int = Math.trunc(value);
  return Math.min(MAX_CURRENT, Math.max(MIN_CURRENT, int));
}

/**
 * 夹取每页条数到契约合法区间 `[1, 100]`。
 *
 * @param value 原始每页条数
 * @returns 合法每页条数
 */
export function clampPageSize(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_PAGE_PARAMS.pageSize;
  const int = Math.trunc(value);
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, int));
}

/**
 * ★ UI 分页态 → 契约分页参数（**唯一**映射点）。
 *
 * 仅做字段名重映射（`page` → `current`）与区间夹取，**值语义不变**。
 *
 * @param ui UI 层分页入参（`page` / `pageSize`，均可选）
 * @returns 契约分页参数（`current` / `pageSize`，camelCase）
 *
 * @example
 * toPageParams({ page: 2, pageSize: 50 }) // → { current: 2, pageSize: 50 }
 * toPageParams({})                        // → { current: 1, pageSize: 20 }
 */
export function toPageParams(ui: UiPageParams = {}): PageParams {
  return {
    current: clampCurrent(ui.page ?? DEFAULT_PAGE_PARAMS.current),
    pageSize: clampPageSize(ui.pageSize ?? DEFAULT_PAGE_PARAMS.pageSize),
  };
}

/**
 * 契约分页参数 → UI 分页态（反向映射，仅供表格回显）。
 *
 * @param params 契约分页参数
 * @returns UI 层分页入参
 */
export function toUiPageParams(params: PageParams): Required<UiPageParams> {
  return {
    page: params.current,
    pageSize: params.pageSize,
  };
}

/**
 * 归一化任意分页响应为 `{data, total}`（对各域分页 schema 统一形状做防御处理）。
 *
 * @param raw 后端分页响应（可能字段缺失）
 * @returns 归一化后的 `Paged<T>`
 */
export function normalizePaged<T>(raw: { data?: T[] | null; total?: number | null } | null | undefined): Paged<T> {
  return {
    data: Array.isArray(raw?.data) ? raw!.data : [],
    total: typeof raw?.total === "number" && Number.isFinite(raw.total) ? raw.total : 0,
  };
}
