/**
 * 服务器列表页（M4-T05，设计 §5.2 `/servers`，路由门槛 servers.view）。
 *
 * 契约：`GET /api/servers` 并发 /v1/status 握手；**不可达节点以 `reachable:false`
 * 出现在列表中而非整体失败** —— 页面展示「不可达」标签与 error 字段，不做请求级报错。
 */
import { useNavigate } from "react-router";
import { Button, Typography } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatusTag } from "@/components/StatusTag";
import type { NodeStatus } from "@/api/endpoints/servers";
import { useServerNodes } from "@/api/hooks/servers";
import { toDisplayMessage } from "@/api/error";
import { Notification } from "@douyinfe/semi-ui";

/**
 * 服务器列表页。
 *
 * @returns 节点状态表格（可达性 / 服务 / 版本 / 错误摘要）
 */
export function ServerList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();

  const query = useServerNodes();

  const columns: ColumnProps<NodeStatus>[] = [
    { title: t("servers.field.id"), dataIndex: "id", width: 200 },
    { title: t("servers.field.name"), dataIndex: "name", width: 160 },
    {
      title: t("servers.field.reachable"),
      dataIndex: "reachable",
      width: 110,
      render: (v: boolean) => <StatusTag status={v ? "online" : "offline"} />,
    },
    {
      title: t("servers.field.services"),
      dataIndex: "services",
      width: 160,
      render: (v: string[]) => (v.length > 0 ? v.join(" / ") : tc("state.noDescription")),
    },
    {
      title: t("servers.field.version"),
      dataIndex: "version",
      width: 140,
      render: (v: string | undefined) => v ?? tc("state.noDescription"),
    },
    {
      title: t("servers.field.error"),
      dataIndex: "error",
      render: (v: string | undefined) =>
        v === undefined || v.length === 0 ? (
          tc("state.noDescription")
        ) : (
          <Typography.Text type="danger" ellipsis={{ showTooltip: true }} style={{ maxWidth: 260 }}>
            {v}
          </Typography.Text>
        ),
    },
    {
      title: tc("table.actions"),
      width: 100,
      render: (_v: unknown, row: NodeStatus) => (
        <Button size="small" theme="borderless" onClick={() => navigate(`/servers/${row.id}`)}>
          {t("servers.action.detail")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:servers"
        extra={
          <Button
            icon={<IconRefresh />}
            theme="borderless"
            onClick={() => {
              query.refetch().catch((err: unknown) =>
                Notification.error({ content: toDisplayMessage(err), duration: 4 }),
              );
            }}
          >
            {tc("action.refresh")}
          </Button>
        }
      />
      <DataTable<NodeStatus>
        columns={columns}
        dataSource={query.data ?? []}
        loading={query.isLoading}
        rowKey="id"
      />
    </div>
  );
}
