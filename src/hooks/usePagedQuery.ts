/**
 * 分页查询 Hook（M4-T05）。
 *
 * 包装 `useQuery`：`queryKey` 由调用方前缀 + 契约分页参数组成；
 * `enabled=false`（如无权限）时不发请求。页面不直接 `useQuery`。
 */
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import type { PageParams, Paged } from "@/api/pagination";

/** usePagedQuery 选项。 */
export interface UsePagedQueryOptions<T> {
  /** 查询键前缀（如 qk.devices(filters)），分页参数自动追加（保证缓存独立） */
  queryKey: readonly unknown[];
  /** 请求函数（入参为契约分页参数） */
  queryFn: (params: PageParams) => Promise<Paged<T>>;
  /** 契约分页参数（来自 useTableQuery().pageParams） */
  params: PageParams;
  /** 是否发请求（默认 true） */
  enabled?: boolean;
}

/**
 * 分页数据查询。
 *
 * @param options 查询键 / 请求函数 / 分页参数 / 启用开关
 * @returns TanStack Query 结果（data 已归一为 `{data,total}`）
 */
export function usePagedQuery<T>(options: UsePagedQueryOptions<T>): UseQueryResult<Paged<T>> {
  const { queryKey, queryFn, params, enabled = true } = options;
  return useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => queryFn(params),
    enabled,
    placeholderData: (prev) => prev,
  });
}
