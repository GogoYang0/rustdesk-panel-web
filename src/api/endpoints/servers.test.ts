/**
 * 单测：`describeServerError`（M4-T05 服务器域验收项；TD-04 缺陷修复回归矩阵）。
 *
 * 契约：服务器转发错误（400/404/502/503/504）的 message 需正确展示 ——
 * ① 后端包络带字符串 `message` 时**原样展示**（message 优先）；
 * ② 缺 message 时按状态码走 i18n 兜底（pages:servers.error.*），插值来源
 *    优先 `envelope.error`，为空回退 `servers.error.unknown`（zh「未知原因」/ en "unknown reason"）；
 * ③ 完全未知形态时给出通用兜底文案。
 *
 * TD-04 矩阵：5 状态码 × message 五形态（空串/null/缺失/数组/非字符串）× 双语言，
 * 每组断言：文案非空、不含 `{{` 字面量、不以冒号 / 空白结尾。
 */
import { beforeAll, describe, expect, it } from "vitest";
import i18n, { type i18n as I18n } from "i18next";
import "@/i18n";
import { ApiError } from "@/api/error";
import { describeServerError } from "@/api/endpoints/servers";

/** 被测的 5 个转发错误状态码。 */
const STATUSES = [400, 404, 502, 503, 504] as const;

/** 双语言。 */
const LANGUAGES = ["zh-CN", "en-US"] as const;

/** message 的五种形态（TD-04 矩阵维度）。 */
const MESSAGE_VARIANTS: ReadonlyArray<{ label: string; message?: unknown }> = [
  { label: "空字符串", message: "" },
  { label: "null", message: null },
  { label: "缺失", message: undefined },
  { label: "字符串数组", message: ["field A invalid", "field B missing"] },
  { label: "非字符串", message: 12345 },
];

/** 用 ApiError 构造真实错误形态（statusCode + payload 包络）。 */
function makeApiError(statusCode: number, payload: Record<string, unknown>): ApiError {
  return new ApiError(statusCode, payload as never, new Response(null, { status: statusCode }));
}

/** 通用产物断言：非空、无未插值占位符、不以冒号 / 空白结尾。 */
function assertDisplayable(text: string): void {
  expect(typeof text).toBe("string");
  expect(text.length).toBeGreaterThan(0);
  expect(text).not.toContain("{{");
  expect(text).not.toMatch(/[\s:：]$/u);
  expect(text).not.toMatch(/servers\.error\./);
}

describe("describeServerError —— 服务器转发错误映射", () => {
  beforeAll(async () => {
    await (i18n as unknown as I18n).changeLanguage("zh-CN");
  });

  it("★ 503 且后端带 message：原样展示后端 message（message 优先）", () => {
    const err = makeApiError(503, { statusCode: 503, message: "服务不可用: hbbs 未就绪" });
    expect(describeServerError(err)).toBe("服务不可用: hbbs 未就绪");
  });

  it("★ TD-04 矩阵：5 状态码 × message 五形态 × 双语言，产物均合规", async () => {
    for (const lang of LANGUAGES) {
      await i18n.changeLanguage(lang);
      for (const status of STATUSES) {
        for (const variant of MESSAGE_VARIANTS) {
          const err = makeApiError(status, { statusCode: status, message: variant.message });
          const text = describeServerError(err);
          assertDisplayable(`${lang}/${status}/${variant.label}: ${text}`);
        }
      }
    }
  });

  it("★ 插值来源优先级：envelope.error 存在时优先使用，否则用 i18n 中性词", async () => {
    await i18n.changeLanguage("zh-CN");
    const withError = makeApiError(503, { statusCode: 503, message: "", error: "Bad Gateway" });
    expect(describeServerError(withError)).toBe("服务器当前不可用：Bad Gateway");
    const withoutError = makeApiError(503, { statusCode: 503, message: null });
    expect(describeServerError(withoutError)).toBe("服务器当前不可用：未知原因");
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
