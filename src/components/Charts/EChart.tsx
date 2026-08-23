/**
 * ECharts 通用容器组件（M4-T04，OQ-7 自封装）。
 *
 * 职责：把「容器 div + 主题联动 + 实例生命周期」收敛为单一组件，
 * 业务图表组件（`TrendChart` / `GaugePanel`）只负责组装 `option`。
 *
 * ★ React 19：禁用 `forwardRef`，`ref` 直接作为 prop（本组件透传到容器 div）。
 */
import { useChartTheme, useEChart, type EChartsCoreOption } from "@/components/Charts/useEChart";

/** `EChart` 属性。 */
export interface EChartProps {
  /** ECharts 配置项 */
  option: EChartsCoreOption;
  /** 图表高度（Tailwind 类名或像素值，默认 280px） */
  height?: number;
  /** 无障碍标签（图表语义描述） */
  ariaLabel?: string;
  /** 容器附加类名 */
  className?: string;
}

/**
 * ECharts 通用容器。
 *
 * @param props 配置项、高度与无障碍标签
 * @returns 图表容器
 */
export function EChart({ option, height = 280, ariaLabel, className }: EChartProps) {
  // ★ 与 theme-mode 联动：mode 变化 → useEChart 重建实例 → 图表配色跟随暗色
  const { mode } = useChartTheme();
  const { containerRef } = useEChart(option, mode);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className={className}
      style={{ width: "100%", height }}
    />
  );
}
