/**
 * 资源用量仪表盘（M4-T04，OQ-7 自封装）。
 *
 * 用于展示 CPU / 内存 / 磁盘三项系统状态百分比（`systemStatus.cpu|memory|disk`）。
 * 采用环形进度（`pie` + `roundCap`）而非 `gauge`，避免额外引入 GaugeChart 组件。
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EChart } from "@/components/Charts/EChart";
import { useChartTheme, type EChartsCoreOption } from "@/components/Charts/useEChart";

/** 单个用量指标。 */
export interface GaugeItem {
  /** 指标名（i18n 已翻译文本） */
  name: string;
  /** 百分比（0~100） */
  percent: number;
  /** 取色键 */
  colorKey: "primary" | "success" | "warning" | "danger";
}

/** `GaugePanel` 属性。 */
export interface GaugePanelProps {
  /** 指标列表 */
  items: readonly GaugeItem[];
  /** 图表高度（默认 220） */
  height?: number;
}

/**
 * 资源用量仪表盘（多环形）。
 *
 * @param props 指标列表与高度
 * @returns 图表容器
 */
export function GaugePanel({ items, height = 220 }: GaugePanelProps) {
  const { t } = useTranslation("pages");
  const { tokens } = useChartTheme();

  const option = useMemo<EChartsCoreOption>(() => {
    const safeItems = items.map((item) => ({
      ...item,
      percent: Math.min(100, Math.max(0, Number.isFinite(item.percent) ? item.percent : 0)),
    }));
    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        backgroundColor: tokens.background,
        borderColor: tokens.splitLine,
        textStyle: { color: tokens.text },
        formatter: "{b}: {c}%",
      },
      legend: {
        bottom: 0,
        textStyle: { color: tokens.textTertiary, fontSize: 11 },
      },
      series: safeItems.map((item, index) => ({
        name: item.name,
        type: "pie" as const,
        radius: ["58%", "72%"],
        center: [`${((index + 0.5) / safeItems.length) * 100}%`, "44%"],
        avoidLabelOverlap: false,
        silent: false,
        label: {
          show: true,
          position: "center" as const,
          color: tokens.text,
          fontSize: 14,
          fontWeight: "bold" as const,
          formatter: `${item.percent.toFixed(1)}%`,
        },
        emphasis: { scale: false, label: { show: true, fontSize: 14 } },
        itemStyle: { color: tokens[item.colorKey] },
        data: [
          { value: Number(item.percent.toFixed(1)), name: item.name },
          {
            value: Number((100 - item.percent).toFixed(1)),
            name: "",
            itemStyle: { color: tokens.splitLine },
            label: { show: false },
            emphasis: { disabled: true },
          },
        ],
      })),
    };
  }, [items, tokens]);

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-semi-color-text-2" style={{ height }}>
        {t("dashboard.noSystemStatus")}
      </div>
    );
  }

  return <EChart option={option} height={height} ariaLabel={t("dashboard.systemStatus")} />;
}
