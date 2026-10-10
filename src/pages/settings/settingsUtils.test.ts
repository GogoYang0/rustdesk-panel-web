/**
 * 设置域掩码兜底函数单测（M4-T06）。
 */
import { describe, expect, it } from "vitest";
import { MASKED_VALUE, isMasked, stripMasked } from "@/api/endpoints/settings";

describe("isMasked", () => {
  it("掩码值判定为 true", () => {
    expect(isMasked("******")).toBe(true);
    expect(isMasked(MASKED_VALUE)).toBe(true);
  });

  it("非掩码值判定为 false", () => {
    expect(isMasked("real-password")).toBe(false);
    expect(isMasked("***")).toBe(false);
    expect(isMasked("")).toBe(false);
  });

  it("undefined / null 判定为 false", () => {
    expect(isMasked(undefined)).toBe(false);
    expect(isMasked(null)).toBe(false);
  });
});

describe("stripMasked", () => {
  it("普通口令原样保留", () => {
    expect(stripMasked("secret-123")).toBe("secret-123");
  });

  it("掩码值归一为 undefined（不回传）", () => {
    expect(stripMasked("******")).toBeUndefined();
  });

  it("空串 / 纯空白归一为 undefined", () => {
    expect(stripMasked("")).toBeUndefined();
    expect(stripMasked("   ")).toBeUndefined();
  });

  it("undefined / null 归一为 undefined", () => {
    expect(stripMasked(undefined)).toBeUndefined();
    expect(stripMasked(null)).toBeUndefined();
  });
});
