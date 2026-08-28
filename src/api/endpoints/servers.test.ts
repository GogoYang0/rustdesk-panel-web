/**
 * 单测：`describeServerError`（M4-T05 服务器域验收项）。
 *
 * 契约：服务器转发错误（400/404/502/503/504）的 message 需正确展示 ——
 * ① 后端包络带 `message` 时**原样展示**（message 优先）；
 * ② 缺 message 时按状态码走 i18n 兜底（pages:servers.error.*）；
 * ③ 完全未知形态时给出通用兜底文案。
 */
import { beforeEach, describe, expect, it } from "vitest";
import "@/i18n";
import { ApiError } from "@/api/error";
import { describeServerError } from "@/api/endpoints/servers";

/** 用 ApiError 构造真实错误形态（statusCode + payload 包络）。 */
function makeApiError(statusCode: number, payload: Record<string, unknown>): ApiError {
  return new ApiError(statusCode, payload as never, new Response(null, { status: statusCode }));
}

describe("describeServerError —— 服务器转发错误映射", () => {
  beforeEach(() => {
    // 回到中文语言，保证 i18n 兜底文案可断言
    void import("@/i18n").then((m) => m.default.changeLanguage("zh-CN"));
  });

  it("★ 503 且后端带 message：原样展示后端 message（message 优先）", () => {
    const err = makeApiError(503, { statusCode: 503, message: "服务不可用: hbbs 未就绪" });
    expect(describeServerError(err)).toBe("服务不可用: hbbs 未就绪");
  });

  it("★ 400 / 404 / 502 / 504 缺 message：按状态码走 i18n 兜底文案", () => {
    for (const status of [400, 404, 502, 503, 504]) {
      const err = makeApiError(status, { statusCode: status, message: "" });
      const text = describeServerError(err);
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(0);
      // 不得把 i18n key 字面量暴露给用户
      expect(text).not.toMatch(/servers\.error\./);
      // i18n 兜底文案不含英文兜底 Map 的格式（即走到了 i18n 分支）
      expect(text).not.toContain(`Request failed (${String(status)})`);
    }
  });

  it("message 为字符串数组：以「；」连接展示", () => {
    const err = makeApiError(400, { statusCode: 400, message: ["字段A不合法", "字段B缺失"] });
    expect(describeServerError(err)).toBe("字段A不合法；字段B缺失");
  });

  it("非 ApiError 的裸错误：给出通用兜底，不抛异常", () => {
    expect(typeof describeServerError(new Error("boom"))).toBe("string");
    expect(typeof describeServerError(null)).toBe("string");
    expect(typeof describeServerError(undefined)).toBe("string");
  });
});
