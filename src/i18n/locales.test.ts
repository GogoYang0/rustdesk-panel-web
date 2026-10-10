/**
 * 单测：i18n 语言包对齐（M4-T03，QA 报告 D1 回归 + DEF-02/DEF-03）。
 *
 * 约束：
 * 1. `zh-CN` 与 `en-US` 的 key 结构必须**完全对齐**（无单边 key）；
 * 2. 文案不得包含中文残留（en-US 全量、zh-CN 的 status 命名空间）；
 * 3. 修复批次新增的 key 必须存在（硬编码文案迁移的防回归闸门）。
 */
import { describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en-US/common.json";
import enMenu from "@/i18n/locales/en-US/menu.json";
import zhCommon from "@/i18n/locales/zh-CN/common.json";
import zhMenu from "@/i18n/locales/zh-CN/menu.json";

/** 拍平嵌套对象为 `a.b.c` 路径集合。 */
function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flattenKeys(child, prefix.length > 0 ? `${prefix}.${key}` : key),
  );
}

/** 中日韩统一表意文字（含全角标点）。 */
const CJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/;

/**
 * 递归收集「含中文字符」的 key 路径（用于 en-US 语言包的回归闸门）。
 *
 * @param value 待检查的子树
 * @param prefix 当前路径前缀
 * @param allowed 允许包含中文的 key 白名单
 * @returns 违规条目的 `key=value` 描述
 */
function findCjkLeaves(value: unknown, prefix = "", allowed: ReadonlySet<string> = new Set()): string[] {
  if (typeof value === "string") {
    return CJK.test(value) && !allowed.has(prefix) ? [`${prefix}=${value}`] : [];
  }
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    findCjkLeaves(child, prefix.length > 0 ? `${prefix}.${key}` : key, allowed),
  );
}

describe("i18n —— 语言包 key 对齐", () => {
  it("common：zh-CN 与 en-US key 集合完全一致", () => {
    expect(flattenKeys(zhCommon).sort()).toEqual(flattenKeys(enCommon).sort());
  });

  it("menu：zh-CN 与 en-US key 集合完全一致", () => {
    expect(flattenKeys(zhMenu).sort()).toEqual(flattenKeys(enMenu).sort());
  });

  it("common 不含空字符串值", () => {
    for (const [file, pack] of [
      ["zh-CN", zhCommon],
      ["en-US", enCommon],
    ] as const) {
      const empties = flattenKeys(pack).filter((key) => {
        const value = key.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)?.[k], pack);
        return typeof value === "string" && value.trim().length === 0;
      });
      expect(empties, `${file} 存在空文案`).toEqual([]);
    }
  });

  it("en-US 语言包不得含中文字符（DEF-02 回归闸门）", () => {
    // 例外：语言切换按钮自身需以「中文」标示目标语言（`layout.localeZhCN`）
    const allowed = new Set(["layout.localeZhCN"]);
    expect(findCjkLeaves(enCommon, "", allowed)).toEqual([]);
  });

  it("新增 key 齐备：errors.* / status.* / apiError.* / state.* / permission.checkFailed*", () => {
    const keys = flattenKeys(zhCommon);
    for (const required of [
      "action.retry",
      "action.backHome",
      "state.unauthenticated",
      "state.unknownError",
      "errors.notFoundTitle",
      "errors.notFoundDescription",
      "errors.renderFailedTitle",
      "errors.pagePending",
      "status.online",
      "status.offline",
      "status.enabled",
      "status.disabled",
      "status.active",
      "status.expired",
      "status.unknown",
      "permission.checkFailedTitle",
      "permission.checkFailed",
      "apiError.badRequest",
      "apiError.unauthorized",
      "apiError.forbidden",
      "apiError.notFound",
      "apiError.conflict",
      "apiError.tooManyRequests",
      "apiError.serverError",
      "apiError.requestFailed",
      "layout.localeZhCN",
      "layout.localeEnUS",
    ]) {
      expect(keys, `缺少 key: ${required}`).toContain(required);
    }
  });
});
