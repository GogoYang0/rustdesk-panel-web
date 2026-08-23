/**
 * 仪表盘（M4-T04，设计 §5.2 `/dashboard`，SuperAdmin 语义）。
 *
 * ★ OQ-8：可见性用 `UserPayload.is_admin` 判定（后端为 `RequireSuperAdmin`）；
 *   非超管访问 → 路由守卫已跳 `/403`，本页再做一次防御性渲染（不依赖守卫顺序）。
 *
 * 数据：
 * - `GET /api/dashboard` → `DashboardOverview`（users / devices / connections / files / counts / systemStatus）；
 * - `GET /api/dashboard/trends?range=7d|30d|90d` → `DashboardTrends`（三条逐日序列）。
 *
 * ★ React 19 落地：
 * - **`<Activity>`**：把「时间区间」筛选态包裹于 `<Activity>`，模式 hidden 时保活
 *   （切换主视图后区间选择不丢失，副作用暂停）；
 * - **`useEffectEvent`**：轮询回调中读取最新 `range`，不参与依赖数组（设计 §1.4、§6.2.4）。
 *
 * 图表：ECharts 自封装（OQ-7）见 `src/components/Charts/*`，与 `theme-mode` 联动重绘。
 * 组件选型：`Card` / `Descriptions` / `Tag` / `Select` / `Progress` / `Spin` / `Empty`（均经 Semi MCP 查证）。
 */
import { Activity, useEffectEvent, useState } from "react";
import { Button, Card, Empty, Progress, Select, Spin, Tag, Typography } from "@douyinfe/semi-ui";
import { IconRefresh, IconUserGroup } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { TrendRange } from "@/api/endpoints/dashboard";
import { useDashboardOverview, useDashboardTrends } from "@/api/hooks/auth";
import { usePolling } from "@/hooks/usePolling";
import { GaugePanel, type GaugeItem } from "@/components/Charts/GaugePanel";
import { TrendChart, type TrendPoint } from "@/components/Charts/TrendChart";
import { PageHeader } from "@/components/PageHeader";
import { useSessionStore } from "@/stores/sessionStore";

/** 可选区间。 */
const RANGES: readonly TrendRange[] = ["7d", "30d", "90d"];

/**
 * 仪表盘页面。
 *
 * @returns 总览 + 趋势
 */
export function Dashboard() {
  const { t } = useTranslation("pages");
  const isAdmin = useSessionStore((s) => s.user?.is_admin ?? false);
  const [range, setRange] = useState<TrendRange>("7d");
  const [showCharts, setShowCharts] = useState(true);

  const overview = useDashboardOverview();
  const trends = useDashboardTrends(range);

  // ★ useEffectEvent：轮询回调中读取最新 range，不进入依赖数组（设计 §1.4）
  const refreshOnTick = useEffectEvent(() => {
    void overview.refetch();
    void trends.refetch();
    void range;
  });
  usePolling(refreshOnTick, { interval: 60 * 1000 });

  // OQ-8：非超管防御性提示（守卫通常已拦截至 /403）
  if (!isAdmin) {
    return (
      <div className="p-0">
        <PageHeader titleKey="menu:dashboard" />
        <Empty description={t("dashboard.adminOnly")} />
      </div>
    );
  }

  const data = overview.data;
  const systemStatus = data?.systemStatus;
  const gaugeItems: GaugeItem[] = systemStatus
    ? [
        { name: t("dashboard.cpu"), percent: Number(systemStatus.cpu ?? 0), colorKey: "primary" },
        { name: t("dashboard.memory"), percent: Number(systemStatus.memory ?? 0), colorKey: "success" },
        { name: t("dashboard.disk"), percent: Number(systemStatus.disk ?? 0), colorKey: "warning" },
      ]
    : [];

  const connectionPoints: TrendPoint[] = (trends.data?.connectionTrend ?? []).map((p) => ({
    date: p.date,
    value: p.count,
  }));
  const newUserPoints: TrendPoint[] = (trends.data?.newUserTrend ?? []).map((p) => ({
    date: p.date,
    value: p.newUsers,
  }));
  const alarmPoints: TrendPoint[] = (trends.data?.alarmTrend ?? []).map((p) => ({
    date: p.date,
    value: p.count,
  }));

  return (
    <div className="flex flex-col gap-4 p-0">
      <PageHeader
        titleKey="menu:dashboard"
        extra={
          <>
            {/* ★ React 19 <Activity>：区间筛选态保活（隐藏时副作用暂停） */}
            <Activity mode={showCharts ? "visible" : "hidden"}>
              <Select
                value={range}
                onChange={(v) => setRange(v as TrendRange)}
                style={{ width: 120 }}
                aria-label={t("dashboard.range")}
                optionList={RANGES.map((r) => ({ value: r, label: t(`dashboard.range_${r}`) }))}
              />
            </Activity>
            <Button
              icon={<IconRefresh />}
              theme="borderless"
              onClick={() => {
                void overview.refetch();
                void trends.refetch();
                setShowCharts(true);
              }}
              aria-label={t("action.refresh")}
            >
              {t("action.refresh")}
            </Button>
          </>
        }
      />

      {overview.isLoading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : overview.isError ? (
        <Empty description={t("dashboard.loadFailed")} />
      ) : (
        <>
          {/* ---------- 计数卡片 ---------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <MetricCard
                title={t("dashboard.users")}
                value={data?.users.total ?? 0}
                extra={`${t("dashboard.adminCount")}: ${data?.users.admin ?? 0}`}
              />
            </Card>
            <Card>
              <MetricCard
                title={t("dashboard.devices")}
                value={data?.devices.total ?? 0}
                extra={`${t("dashboard.onlineCount")}: ${data?.devices.online ?? 0}`}
              />
            </Card>
            <Card>
              <MetricCard
                title={t("dashboard.connectionsToday")}
                value={data?.connections.today ?? 0}
                extra={`${t("dashboard.success")}: ${data?.connections.success ?? 0} / ${t("dashboard.failure")}: ${data?.connections.failure ?? 0}`}
              />
            </Card>
            <Card>
              <MetricCard
                title={t("dashboard.filesToday")}
                value={data?.files.today ?? 0}
                extra={`${t("dashboard.upload")}: ${data?.files.upload ?? 0}`}
              />
            </Card>
          </div>

          {/* ---------- 计数汇总 + 系统状态 ---------- */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title={t("dashboard.countsTitle")} headerExtraContent={<IconUserGroup />}>
              <div className="flex flex-wrap gap-2">
                <Tag color="blue">
                  {t("dashboard.count.addressBooks")}: {data?.counts.addressBooks ?? 0}
                </Tag>
                <Tag color="cyan">
                  {t("dashboard.count.groups")}: {data?.counts.groups ?? 0}
                </Tag>
                <Tag color="violet">
                  {t("dashboard.count.roles")}: {data?.counts.roles ?? 0}
                </Tag>
                <Tag color="green">
                  {t("dashboard.count.strategies")}: {data?.counts.strategies ?? 0}
                </Tag>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <Typography.Text type="tertiary">
                  {t("dashboard.uptime")}: {formatUptime(systemStatus?.uptime ?? 0)}
                </Typography.Text>
                <Progress
                  percent={Number((systemStatus?.cpu ?? 0).toFixed(1))}
                  stroke="var(--semi-color-primary)"
                  showInfo
                  aria-label={t("dashboard.cpu")}
                  style={{ width: 160 }}
                />
              </div>
            </Card>

            <Card title={t("dashboard.systemStatus")}>
              {trends.isLoading && gaugeItems.length === 0 ? (
                <div className="flex justify-center py-8">
                  <Spin />
                </div>
              ) : (
                <GaugePanel items={gaugeItems} />
              )}
            </Card>
          </div>

          {/* ---------- 趋势图（Activity 保活） ---------- */}
          <Activity mode={showCharts ? "visible" : "hidden"}>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <Card title={t("dashboard.connectionTrend")}>
                {trends.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <TrendChart
                    title={t("dashboard.connectionTrend")}
                    points={connectionPoints}
                    colorKey="primary"
                  />
                )}
              </Card>
              <Card title={t("dashboard.newUserTrend")}>
                {trends.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <TrendChart
                    title={t("dashboard.newUserTrend")}
                    points={newUserPoints}
                    colorKey="success"
                  />
                )}
              </Card>
              <Card title={t("dashboard.alarmTrend")}>
                {trends.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spin />
                  </div>
                ) : (
                  <TrendChart
                    title={t("dashboard.alarmTrend")}
                    points={alarmPoints}
                    colorKey="danger"
                  />
                )}
              </Card>
            </div>
          </Activity>
        </>
      )}
    </div>
  );
}

/** `MetricCard` 属性。 */
interface MetricCardProps {
  /** 标题 */
  title: string;
  /** 主数值 */
  value: number;
  /** 附属说明 */
  extra?: string;
}

/**
 * 指标卡片内容（数值 + 标题 + 附属说明）。
 *
 * @param props 标题、数值与附属说明
 * @returns 指标展示块
 */
function MetricCard({ title, value, extra }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1">
      <Typography.Text type="tertiary">{title}</Typography.Text>
      <Typography.Title heading={3} className="m-0">
        {value}
      </Typography.Title>
      {extra ? <Typography.Text type="quaternary">{extra}</Typography.Text> : null}
    </div>
  );
}

/**
 * 把秒数格式化为「Nd Nh Nm」。
 *
 * @param seconds 秒数
 * @returns 可读时长
 */
function formatUptime(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const days = Math.floor(safe / 86400);
  const hours = Math.floor((safe % 86400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}
