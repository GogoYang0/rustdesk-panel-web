/**
 * 单测：分页契约映射（M4-T02）。
 *
 * ⚠️ OQ-9 铁律：`toPageParams` 是 UI `page` → 契约 `current` 的**唯一**映射点；
 * 必须真实验证字段名重映射（page → current）与区间夹取。
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_PARAMS,
  MAX_CURRENT,
  MAX_PAGE_SIZE,
  clampCurrent,
  clampPageSize,
  normalizePaged,
  toPageParams,
  toUiPageParams,
} from "@/api/pagination";

describe("toPageParams —— UI page → 契约 current 唯一映射点", () => {
  it("page/pageSize 映射为 current/pageSize（camelCase，值不变）", () => {
    expect(toPageParams({ page: 2, pageSize: 50 })).toEqual({ current: 2, pageSize: 50 });
  });

  it("空对象回退默认值 current=1 / pageSize=20", () => {
    expect(toPageParams({})).toEqual({ current: 1, pageSize: 20 });
    expect(toPageParams()).toEqual({ current: 1, pageSize: 20 });
  });

  it("仅给 page 时 pageSize 用默认值", () => {
    expect(toPageParams({ page: 5 })).toEqual({ current: 5, pageSize: 20 });
  });

  it("仅给 pageSize 时 current 用默认值", () => {
    expect(toPageParams({ pageSize: 10 })).toEqual({ current: 1, pageSize: 10 });
  });

  it("★ 结果键名恒为 current/pageSize，绝不出现 page / page_size", () => {
    const result = toPageParams({ page: 3, pageSize: 15 });
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(["current", "pageSize"]);
    expect(Object.prototype.hasOwnProperty.call(result, "page")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(result, "page_size")).toBe(false);
  });
});

describe("clampCurrent —— 页码区间 [1, 100000]", () => {
  it("小于下限夹取为 1", () => {
    expect(clampCurrent(0)).toBe(1);
    expect(clampCurrent(-5)).toBe(1);
  });

  it("大于上限夹取为 100000", () => {
    expect(clampCurrent(MAX_CURRENT + 1)).toBe(MAX_CURRENT);
    expect(clampCurrent(999999)).toBe(MAX_CURRENT);
  });

  it("区间内原值返回（截断小数）", () => {
    expect(clampCurrent(7)).toBe(7);
    expect(clampCurrent(7.9)).toBe(7);
  });

  it("非法值（NaN / Infinity）回退默认页码", () => {
    expect(clampCurrent(Number.NaN)).toBe(DEFAULT_PAGE_PARAMS.current);
    expect(clampCurrent(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PAGE_PARAMS.current);
  });

  it("★ 经 toPageParams 后越界页码被夹取", () => {
    expect(toPageParams({ page: 0 }).current).toBe(1);
    expect(toPageParams({ page: 200000 }).current).toBe(MAX_CURRENT);
  });
});

describe("clampPageSize —— 每页条数区间 [1, 100]", () => {
  it("小于下限夹取为 1", () => {
    expect(clampPageSize(0)).toBe(1);
    expect(clampPageSize(-10)).toBe(1);
  });

  it("大于上限夹取为 100", () => {
    expect(clampPageSize(MAX_PAGE_SIZE + 1)).toBe(MAX_PAGE_SIZE);
    expect(clampPageSize(500)).toBe(MAX_PAGE_SIZE);
  });

  it("区间内原值返回（截断小数）", () => {
    expect(clampPageSize(50)).toBe(50);
    expect(clampPageSize(50.6)).toBe(50);
  });

  it("非法值（NaN）回退默认每页条数", () => {
    expect(clampPageSize(Number.NaN)).toBe(DEFAULT_PAGE_PARAMS.pageSize);
  });

  it("★ 经 toPageParams 后越界每页条数被夹取", () => {
    expect(toPageParams({ pageSize: 0 }).pageSize).toBe(1);
    expect(toPageParams({ pageSize: 1000 }).pageSize).toBe(MAX_PAGE_SIZE);
  });
});

describe("toUiPageParams —— 反向映射（表格回显）", () => {
  it("current/pageSize 映射回 page/pageSize", () => {
    expect(toUiPageParams({ current: 4, pageSize: 25 })).toEqual({ page: 4, pageSize: 25 });
  });

  it("★ 往返映射幂等：toUi(toPage(x)) === x", () => {
    const ui = { page: 3, pageSize: 40 };
    const roundTrip = toUiPageParams(toPageParams(ui));
    expect(roundTrip).toEqual(ui);
  });
});

describe("normalizePaged —— 分页响应防御性归一化", () => {
  it("正常响应原样返回", () => {
    const raw = { data: [{ id: 1 }, { id: 2 }], total: 2 };
    expect(normalizePaged(raw)).toEqual({ data: [{ id: 1 }, { id: 2 }], total: 2 });
  });

  it("data 为 null 时归一为空数组", () => {
    expect(normalizePaged({ data: null, total: 0 })).toEqual({ data: [], total: 0 });
  });

  it("total 缺失或非法时归一为 0", () => {
    expect(normalizePaged({ data: [], total: null })).toEqual({ data: [], total: 0 });
    expect(normalizePaged({ data: [] })).toEqual({ data: [], total: 0 });
  });

  it("入参为 null / undefined 时返回空页", () => {
    expect(normalizePaged(null)).toEqual({ data: [], total: 0 });
    expect(normalizePaged(undefined)).toEqual({ data: [], total: 0 });
  });
});
