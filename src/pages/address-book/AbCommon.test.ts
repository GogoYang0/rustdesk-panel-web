/**
 * 单测：AbPeer.tags 兼容怪癖归一化（M4-T06 第 2 批验收项：legacy `'null'` 特例不崩）。
 */
import { describe, expect, it } from "vitest";
import { parseAbTags } from "@/pages/address-book/AbCommon";

describe("parseAbTags —— legacy 'null' 特例与多形态归一化", () => {
  it("★ legacy 字符串 'null' → 空数组（不崩溃、不产出 ['null']）", () => {
    expect(parseAbTags("null")).toEqual([]);
    expect(parseAbTags(" null ")).toEqual([]);
  });

  it("数组 → 过滤非字符串项后原样返回", () => {
    expect(parseAbTags(["a", "b"])).toEqual(["a", "b"]);
    expect(parseAbTags(["a", 1, null])).toEqual(["a"]);
  });

  it("JSON 编码串 → 解析为数组", () => {
    expect(parseAbTags('["tag1","tag2"]')).toEqual(["tag1", "tag2"]);
  });

  it("非数组 JSON（如 '\"x\"' / '123'）→ 空数组", () => {
    expect(parseAbTags('"x"')).toEqual([]);
    expect(parseAbTags("123")).toEqual([]);
  });

  it("undefined / null / 空串 / 非字符串非数组 → 空数组", () => {
    expect(parseAbTags(undefined)).toEqual([]);
    expect(parseAbTags(null)).toEqual([]);
    expect(parseAbTags("")).toEqual([]);
    expect(parseAbTags(42)).toEqual([]);
    expect(parseAbTags({})).toEqual([]);
  });

  it("非法 JSON 串 → 空数组（不抛异常）", () => {
    expect(parseAbTags("[not-json")).toEqual([]);
  });
});
