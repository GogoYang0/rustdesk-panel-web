/**
 * 趋势折线图（M4-T04，OQ-7 自封装）。
 *
 * 用于仪表盘的连接 / 新增用户 / 告警三条逐日趋势序列。
 * 配色与坐标轴风格全部取自 `useChartTheme()` 解析的 Semi 主题令牌，
 * 随 `theme-mode` 切换自动重绘。
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EChart } from "@/components/Charts/EChart";
import { useChartTheme, type EChartsCoreOption } from "@/components/Charts/useEChart";

/** 单条趋势序列的点。 */
export interface TrendPoint {
  /** 日期（`YYYY-MM-DD`） */
  date: string;
  /** 数值 */
  value: number;
}

/** `TrendChart` 属性。 */
export interface TrendChartProps {
  /** 图表标题（i18n 已翻译文本） */
  title: string;
  /** 趋势点集 */
  points: readonly TrendPoint[];
  /** 折线区间取色（默认跟随主题主色） */
  colorKey?: "primary" | "success" | "warning" | "danger";
  /** 图表高度（默认 280） */
  height?: number;
}

/**
 * 趋势折线图。
 *
 * @param props 标题、点集、取色键与高度
 * @returns 折线图容器
 */
export function TrendChart({ title, points, colorKey = "primary", height = 280 }: TrendChartProps) {
  const { t } = useTranslation("pages");
  const { tokens } = useChartTheme();

  const option = useMemo<EChartsCoreOption>(() => {
    const lineColor = tokens[colorKey];
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        backgroundColor: tokens.background,
        borderColor: tokens.splitLine,
        textStyle: { color: tokens.text },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((p) => p.date),
        axisLabel: { color: tokens.textTertiary, fontSize: 11 },
        axisLine: { lineStyle: { color: tokens.axisLine } },
        axisTick: { show: false },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { color: tokens.textTertiary, fontSize: 11 },
        splitLine: { lineStyle: { color: tokens.splitLine } },
      },
      series: [
        {
          name: title,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: points.map((p) => p.value),
          lineStyle: { color: lineColor, width: 2 },
          itemStyle: { color: lineColor },
          areaStyle: { color: lineColor, opacity: 0.12 },
        },
      ],
    };
  }, [points, title, tokens, colorKey]);

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-semi-color-text-2"
        style={{ height }}
      >
        {t("dashboard.noTrendData")}
      </div>
    );
  }

  return <EChart option={option} height={height} ariaLabel={title} />;
}
