/**
 * 单测：useTableQuery（M4-T05）。
 *
 * ★ OQ-9 验收项：UI `page` → 契约 `current` 的唯一映射经 `toPageParams`，
 *   本用例锁定映射行为与翻页语义（改 pageSize 回第 1 页、改关键字回第 1 页）。
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTableQuery } from "@/hooks/useTableQuery";

describe("useTableQuery —— 分页映射（OQ-9）", () => {
  it("★ UI page/pageSize 映射为契约 current/pageSize（唯一映射点 toPageParams）", () => {
    const { result } = renderHook(() => useTableQuery({ page: 1, pageSize: 20 }));
    expect(result.current.state).toEqual({ page: 1, pageSize: 20, keyword: "" });
    expect(result.current.pageParams).toEqual({ current: 1, pageSize: 20 });

    act(() => result.current.setPage(3));
    expect(result.current.pageParams).toEqual({ current: 3, pageSize: 20 });
    // 关键：产出的是 current 而非 page
    expect(result.current.pageParams).not.toHaveProperty("page");
  });

  it("setPageSize 回到第 1 页；setKeyword 回到第 1 页", () => {
    const { result } = renderHook(() => useTableQuery());
    act(() => result.current.setPage(5));
    act(() => result.current.setPageSize(50));
    expect(result.current.state.page).toBe(1);
    expect(result.current.state.pageSize).toBe(50);
    expect(result.current.pageParams).toEqual({ current: 1, pageSize: 50 });

    act(() => result.current.setPage(7));
    act(() => result.current.setKeyword("abc"));
    expect(result.current.state.page).toBe(1);
    expect(result.current.state.keyword).toBe("abc");
  });

  it("setPage 同值不变更状态；reset 回到初始值", () => {
    const { result } = renderHook(() => useTableQuery({ page: 2, pageSize: 10 }));
    act(() => result.current.setPage(4));
    act(() => result.current.setPage(4)); // 同值：引用不变（避免多余请求）
    expect(result.current.state.page).toBe(4);
    act(() => result.current.reset());
    expect(result.current.state).toEqual({ page: 2, pageSize: 10, keyword: "" });
    expect(result.current.pageParams).toEqual({ current: 2, pageSize: 10 });
  });
});
