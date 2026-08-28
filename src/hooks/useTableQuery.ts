/**
 * 表格查询状态 Hook（M4-T05，DataTable 配套）。
 *
 * ★ OQ-9 铁律：UI 态用 `page` / `pageSize`，**唯一**映射点在
 * `api/pagination.ts#toPageParams`；本 Hook 的 `pageParams` 直接产出契约参数
 * （`current` / `pageSize`），任何调用方**禁止**再自行改名字段。
 */
import { useCallback, useMemo, useState } from "react";
import { toPageParams, type PageParams } from "@/api/pagination";

/** 表格查询状态（UI 形态）。 */
export interface TableQueryState {
  /** 页码（1 起） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 关键字搜索（防抖由调用方决定；回车/点击搜索才生效） */
  keyword: string;
}

/**
 * 表格查询状态管理。
 *
 * @param initial 初始态（默认第 1 页、20 条）
 * @returns 状态 + setter + 契约分页参数 + 重置
 */
export function useTableQuery(initial: Partial<TableQueryState> = {}) {
  const [state, setState] = useState<TableQueryState>({
    page: initial.page ?? 1,
    pageSize: initial.pageSize ?? 20,
    keyword: initial.keyword ?? "",
  });

  const setPage = useCallback((page: number) => {
    setState((prev) => (prev.page === page ? prev : { ...prev, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    // 改每页条数回第 1 页（避免越界空页）
    setState((prev) => ({ ...prev, page: 1, pageSize }));
  }, []);

  const setKeyword = useCallback((keyword: string) => {
    setState((prev) => (prev.keyword === keyword ? prev : { ...prev, page: 1, keyword }));
  }, []);

  const reset = useCallback(() => {
    setState({ page: initial.page ?? 1, pageSize: initial.pageSize ?? 20, keyword: initial.keyword ?? "" });
    // initial 仅作初值，不进入依赖（刻意：reset 恒回首次初值）
     
  }, []);

  /** 契约分页参数（唯一映射点：toPageParams）。 */
  const pageParams: PageParams = useMemo(
    () => toPageParams({ page: state.page, pageSize: state.pageSize }),
    [state.page, state.pageSize],
  );

  return { state, setPage, setPageSize, setKeyword, reset, pageParams } as const;
}
