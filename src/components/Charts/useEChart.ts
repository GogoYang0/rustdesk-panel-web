/**
 * ECharts 自封装 Hook（M4-T04，OQ-7：**不引** `echarts-for-react`）。
 *
 * 设计要点：
 * 1. **按需引入**：仅 `echarts/core` + 需要的 chart/component + CanvasRenderer，
 *    避免整包打入 bundle；
 * 2. ★ **与 `theme-mode` 联动重绘**：通过 `MutationObserver` 监听
 *    `document.body[theme-mode]` 变化，变化时重新解析主题令牌并 `setOption`，
 *    使图表配色跟随暗色切换（OQ-7 的核心理由）；
 * 3. 组件卸载时 `dispose()`，并在容器尺寸变化时 `resize()`（`ResizeObserver`）。
 *
 * ⚠️ 本文件为 hook 实现（非组件），`EChart` 组件见 `src/components/Charts/EChart.tsx`。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { EChartsCoreOption } from "echarts/core";

// 按需注册（模块加载即执行一次，幂等）
echarts.use([
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

/** 图表可用的主题语义。 */
export interface ChartThemeTokens {
  /** 文本主色 */
  text: string;
  /** 次要文本色（坐标轴标签） */
  textTertiary: string;
  /** 分割线颜色 */
  splitLine: string;
  /** 坐标轴线颜色 */
  axisLine: string;
  /** 主色（折线 / 柱状） */
  primary: string;
  /** 成功色 */
  success: string;
  /** 警告色 */
  warning: string;
  /** 危险色 */
  danger: string;
  /** 面板背景色 */
  background: string;
}

/** 从 `getComputedStyle` 解析 Semi 主题令牌（随 `theme-mode` 变化）。 */
const TOKEN_FALLBACK: ChartThemeTokens = {
  text: "#1c1f23",
  textTertiary: "#8f959e",
  splitLine: "rgba(28, 31, 35, 0.08)",
  axisLine: "rgba(28, 31, 35, 0.15)",
  primary: "#0064fa",
  success: "#3bc273",
  warning: "#fc8800",
  danger: "#f93920",
  background: "transparent",
};

/**
 * 读取当前主题令牌。
 *
 * 读取 body 上的 CSS 自定义属性（Semi 在 `body[theme-mode]` 下切换色盘），
 * 无对应变量时回退内置值（jsdom 等无样式环境）。
 *
 * @returns 图表主题令牌
 */
export function readChartTheme(): ChartThemeTokens {
  if (typeof window === "undefined" || typeof getComputedStyle !== "function") {
    return TOKEN_FALLBACK;
  }
  const style = getComputedStyle(document.body);
  /**
   * 读取一个 CSS 变量。
   *
   * @param name 变量名（含 `--` 前缀）
   * @param fallback 回退值
   * @returns 变量值或回退值
   */
  const read = (name: string, fallback: string): string => {
    const value = style.getPropertyValue(name).trim();
    return value.length > 0 ? value : fallback;
  };
  return {
    text: read("--semi-color-text-0", TOKEN_FALLBACK.text),
    textTertiary: read("--semi-color-text-2", TOKEN_FALLBACK.textTertiary),
    splitLine: read("--semi-color-border", TOKEN_FALLBACK.splitLine),
    axisLine: read("--semi-color-border", TOKEN_FALLBACK.axisLine),
    primary: read("--semi-color-primary", TOKEN_FALLBACK.primary),
    success: read("--semi-color-success", TOKEN_FALLBACK.success),
    warning: read("--semi-color-warning", TOKEN_FALLBACK.warning),
    danger: read("--semi-color-danger", TOKEN_FALLBACK.danger),
    background: read("--semi-color-bg-1", TOKEN_FALLBACK.background),
  };
}

/**
 * 监听 `body[theme-mode]` 变化，返回随主题变化的令牌与当前模式。
 *
 * ★ OQ-7 落地：这是「ECharts 与 theme-mode 联动」的**唯一**来源；
 *   `MutationObserver` 的 `attributeFilter: ["theme-mode"]` 精确监听，成本极低。
 *
 * @returns 主题令牌与当前主题模式
 */
export function useChartTheme(): { tokens: ChartThemeTokens; mode: string } {
  const [mode, setMode] = useState<string>(() =>
    typeof document === "undefined" ? "light" : (document.body.getAttribute("theme-mode") ?? "light"),
  );

  useEffect(() => {
    if (typeof MutationObserver === "undefined" || typeof document === "undefined") return;
    const observer = new MutationObserver(() => {
      setMode(document.body.getAttribute("theme-mode") ?? "light");
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ["theme-mode"] });
    return () => {
      observer.disconnect();
    };
  }, []);

  // mode 变化即重算令牌（mode 参与依赖，确保令牌在主题切换后刷新）
  const tokens = useMemo(() => {
    void mode;
    return readChartTheme();
  }, [mode]);

  return { tokens, mode };
}

/** `useEChart` 的返回值。 */
export interface UseEChartResult {
  /** 绑定到容器 div 的 ref */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** ECharts 实例（挂载前为 null） */
  instance: echarts.ECharts | null;
}

/**
 * 初始化 / 维护一个 ECharts 实例。
 *
 * 生命周期：
 * 1. 挂载时 `echarts.init(container)`（复用已存在实例，防止 StrictMode 双挂载泄漏）；
 * 2. `option` 变化 → `setOption(option, { notMerge: true })`；
 * 3. `ResizeObserver` 监听容器尺寸 → `resize()`；
 * 4. 卸载 → `dispose()`。
 *
 * @param option ECharts 配置项
 * @param theme 主题名（`"light"` / `"dark"`；变化时重建实例以重绘配色）
 * @returns 容器 ref 与实例
 */
export function useEChart(
  option: EChartsCoreOption,
  theme: string,
): UseEChartResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [instance, setInstance] = useState<echarts.ECharts | null>(null);

  // 主题变化 → 重建实例（ECharts 的主题在 init 期固定，重建是最可靠的重绘方式）
  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    const chart = echarts.init(container, theme === "dark" ? "dark" : undefined, {
      renderer: "canvas",
    });
    setInstance(chart);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => chart.resize());
      observer.observe(container);
    }
    return () => {
      observer?.disconnect();
      chart.dispose();
      setInstance(null);
    };
  }, [theme]);

  // option 变化 → 更新（notMerge 保证系列数量变化时不残留旧系列）
  useEffect(() => {
    if (instance === null) return;
    instance.setOption(option, { notMerge: true });
  }, [instance, option]);

  return { containerRef, instance };
}

/** 导出核心 option 类型（供图表组件使用）。 */
export type { EChartsCoreOption };
