/**
 * 活跃连接页（M4-T06；路由 /audit/active，门槛 devices.disconnect）。
 *
 * 契约：`GET /api/audits/conn/active` 无分页；行内 `can_disconnect` 由后端
 * （scope ∩ active）给出，前端按其显隐断连按钮（二次守卫 devices.disconnect）；
 * 断连复用设备域 `DELETE /api/devices/{uuid}/disconnect`（conn_id 转 number）。
 */
import { Notification, Popconfirm, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { toDisplayMessage } from "@/api/error";
import { disconnectDevice } from "@/api/endpoints/devices";
import { useActiveConns } from "@/api/hooks/audits";
import type { ConnActiveRow } from "@/api/endpoints/audits";

/**
 * 活跃连接页。
 *
 * @returns 活跃连接表格（含断连操作）
 */
export function ActiveConn() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useActiveConns();

  const rows = query.data?.data ?? [];

  const disconnect = (row: ConnActiveRow): void => {
    const connId = Number(row.conn_id);
    disconnectDevice(row.device_uuid, Number.isFinite(connId) ? [connId] : undefined)
      .then(() => {
        Notification.success({ content: t("audit.disconnected") });
        return void query.refetch();
      })
      .catch((err: unknown) => Notification.error({ content: toDisplayMessage(err), duration: 4 }));
  };

  const columns: ColumnProps<ConnActiveRow>[] = [
    { title: t("audit.field.deviceId"), dataIndex: "device_id", width: 150 },
    { title: t("audit.field.ip"), dataIndex: "ip", width: 140,
      render: (v: string | undefined) => v || tc("state.unknown") },
    { title: t("audit.field.action"), dataIndex: "action", width: 120,
      render: (v: string) => <Tag color={v === "established" ? "green" : "blue"}>{v}</Tag> },
    { title: t("audit.field.establishedAt"), dataIndex: "established_at", width: 180,
      render: (v: string | undefined) => (v ? new Date(v).toLocaleString() : "—") },
    { title: t("audit.field.note"), dataIndex: "note",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    {
      title: tc("table.actions"),
      width: 120,
      render: (_v: unknown, row: ConnActiveRow) =>
        row.can_disconnect ? (
          <Popconfirm title={t("audit.disconnectConfirm")} onConfirm={() => disconnect(row)}>
            <PermissionButton size="small" theme="borderless" type="danger" code="devices.disconnect">
              {t("audit.action.disconnect")}
            </PermissionButton>
          </Popconfirm>
        ) : (
          <span className="text-xs text-[var(--semi-color-text-2)]">{t("audit.cannotDisconnect")}</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:auditActive" />
      <DataTable<ConnActiveRow>
        columns={columns}
        dataSource={rows}
        loading={query.isLoading}
        rowKey="id"
        empty={tc("state.empty")}
      />
    </div>
  );
}
