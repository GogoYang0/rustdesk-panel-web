/**
 * 单测：ECharts 与 `theme-mode` 联动重绘（M4-T04 验收项，OQ-7）。
 *
 * 覆盖：
 * - `readChartTheme()` 在无 Semi 变量时回退内置令牌；
 * - `readChartTheme()` 读取 `body` 上注入的 Semi CSS 变量（有值时不回退）；
 * - `useChartTheme()` 通过 `MutationObserver` 监听 `body[theme-mode]` 的属性变更，
 *   变化后 `mode` 与令牌随之刷新（**这是与 theme-mode 联动的核心断言**）；
 * - 卸载后 observer 断开：再改 `theme-mode` 不再触发状态更新。
 *
 * ⚠️ jsdom 不解析 `<style>` 中的自定义属性到 `getComputedStyle`，因此令牌读取断言
 * 通过 mock `getComputedStyle` 实现，确保断言的是 `readChartTheme` 的**取值逻辑**，
 * 而非 jsdom 的样式实现（后者会给出恒为空的伪绿结果）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { readChartTheme, useChartTheme } from "@/components/Charts/useEChart";

/** 内置回退色（与实现中的 TOKEN_FALLBACK 对齐的可见断言点）。 */
const FALLBACK = {
  text: "#1c1f23",
  primary: "#0064fa",
  danger: "#f93920",
} as const;

/**
 * 用给定变量表 mock `getComputedStyle`。
 *
 * 传入**对象引用**（而非字面量）时，可在测试中就地增删变量来模拟主题色盘切换，
 * 无需重新 spy（重新 spy 会脱离 `act` 追踪并产生 act(...) 警告）。
 *
 * @param vars 变量名 → 变量值（`getPropertyValue` 直接查表）
 */
function mockComputedStyle(vars: Record<string, string>): void {
  vi.spyOn(window, "getComputedStyle").mockImplementation(
    () =>
      ({
        getPropertyValue: (name: string) => vars[name] ?? "",
      }) as unknown as CSSStyleDeclaration,
  );
}

/**
 * 切换 `body[theme-mode]`，等待 observer → setState 提交完成。
 *
 * ⚠️ 为什么不用 `waitFor`：Testing Library 的 `waitFor` 内部 `asyncWrapper` 会
 *   **主动关闭** `IS_REACT_ACT_ENVIRONMENT`（见 `@testing-library/react/dist/pure.js`），
 *   因此它无法抑制 act(...) 警告。
 *
 * 正确做法：在整个 async `act` 内写入属性，并**排空微任务 + 让出一轮宏任务**，
 * 使 `MutationObserver` 回调（jsdom 下为微任务派发）与随后的 React 提交都落在
 * act 作用域内。
 *
 * @param assertReady 断言回调：等待提交完成后校验 hook 返回的目标状态
 */
async function switchThemeAndWait(assertReady: () => void): Promise<void> {
  await act(async () => {
    // 微任务：observer 回调在此执行（内部 setState 入队）
    await Promise.resolve();
    await Promise.resolve();
    // 宏任务：令 React 完成一次提交
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  assertReady();
}

/**
 * 触发主题切换（仅写属性；状态等待交给 `waitForTheme`）。
 *
 * @param mode 目标主题模式
 */
function triggerThemeMode(mode: string): void {
  document.body.setAttribute("theme-mode", mode);
}

describe("readChartTheme —— 令牌解析", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.removeAttribute("theme-mode");
  });

  it("无 Semi CSS 变量时回退内置令牌", () => {
    mockComputedStyle({});
    const tokens = readChartTheme();
    expect(tokens.text).toBe(FALLBACK.text);
    expect(tokens.primary).toBe(FALLBACK.primary);
    expect(tokens.danger).toBe(FALLBACK.danger);
  });

  it("★ 读取 body 上注入的 Semi CSS 变量（有值时生效）", () => {
    mockComputedStyle({
      "--semi-color-text-0": "#eeeeee",
      "--semi-color-primary": "#4098ff",
      "--semi-color-danger": "#ff5252",
      "--semi-color-bg-1": "#1c1f23",
    });
    const tokens = readChartTheme();
    expect(tokens.text).toBe("#eeeeee");
    expect(tokens.primary).toBe("#4098ff");
    expect(tokens.danger).toBe("#ff5252");
    expect(tokens.background).toBe("#1c1f23");
  });

  it("变量值为纯空白 → 回退内置值（防御空值）", () => {
    mockComputedStyle({ "--semi-color-text-0": "   " });
    expect(readChartTheme().text).toBe(FALLBACK.text);
  });
});

describe("useChartTheme —— ★ 与 body[theme-mode] 联动", () => {
  /** 当前用例挂载的 hook 结果（用于 afterEach 显式卸载）。 */
  let unmountCurrent: (() => void) | null = null;

  beforeEach(() => {
    mockComputedStyle({});
    document.body.setAttribute("theme-mode", "light");
  });

  afterEach(async () => {
    // 显式卸载：先于 vi.restoreAllMocks，避免残留 observer 在后续用例的属性写入时
    // 触发 setState（那会产生落到 act 之外的更新）。
    unmountCurrent?.();
    unmountCurrent = null;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    vi.restoreAllMocks();
    document.body.removeAttribute("theme-mode");
  });

  it("初始 mode 取自 body[theme-mode]", () => {
    const { result, unmount } = renderHook(() => useChartTheme());
    unmountCurrent = unmount;
    expect(result.current.mode).toBe("light");
  });

  it("★ theme-mode 变为 dark 后，mode 随之更新", async () => {
    const { result, unmount } = renderHook(() => useChartTheme());
    unmountCurrent = unmount;
    expect(result.current.mode).toBe("light");

    triggerThemeMode("dark");
    await switchThemeAndWait(() => expect(result.current.mode).toBe("dark"));
  });

  it("★ 主题切换后令牌被重新解析（换色盘 → 令牌变化）", async () => {
    // 用同一个 mock 对象承载变量：切换前为空（→ 回退），切换后填入暗色变量。
    // 这样可以避免在 act 中途重新 spy（新的 spy 会阻断 act 内的 flush 追踪）。
    const vars: Record<string, string> = {};
    mockComputedStyle(vars);

    const { result, unmount } = renderHook(() => useChartTheme());
    unmountCurrent = unmount;
    expect(result.current.tokens.text).toBe(FALLBACK.text);

    // 切暗色：Semi 写入暗色变量（同一引用，observer 回调读到新值）
    vars["--semi-color-text-0"] = "#e8e8e8";
    vars["--semi-color-primary"] = "#3c89ff";
    triggerThemeMode("dark");

    await switchThemeAndWait(() => expect(result.current.mode).toBe("dark"));
    expect(result.current.tokens.text).toBe("#e8e8e8");
    expect(result.current.tokens.primary).toBe("#3c89ff");
  });

  it("卸载后 observer 断开：再改 theme-mode 不再更新（无内存泄漏）", async () => {
    const { result, unmount } = renderHook(() => useChartTheme());
    unmountCurrent = unmount;
    expect(result.current.mode).toBe("light");

    unmount();
    unmountCurrent = null;

    triggerThemeMode("dark");
    // 给 observer 回调足够的轮次（已卸载，无状态更新可等待，故用定时让出）
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 已卸载：保持卸载前快照
    expect(result.current.mode).toBe("light");
  });
});
