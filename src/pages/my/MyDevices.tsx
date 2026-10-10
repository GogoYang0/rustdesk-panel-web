/**
 * 我的设备页（GAP2 设计 §2.5；路由 /my-devices，仅登录）。
 *
 * 契约：GET /api/users/me/devices（auth 档，登录即用）；精简 MyDeviceView
 * （OQ-4：uuid/id/note/status/isOnline/lastHeartbeat/deviceGroupGuid）。
 */
import { useMemo } from "react";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { StatusTag } from "@/components/StatusTag";
import type { MyDeviceView } from "@/api/endpoints/devices";
import { useMyDevices } from "@/api/hooks/mydevices";
import { useTableQuery } from "@/hooks/useTableQuery";
import { useTranslation } from "react-i18next";

/**
 * 我的设备页。
 *
 * @returns 当前用户名下设备表格（精简视图 + 在线状态）
 */
export function MyDevices() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setPage, setPageSize, pageParams } = useTableQuery();

  const query = useMyDevices({
    current: pageParams.current,
    pageSize: pageParams.pageSize,
  });

  const columns = useMemo<ColumnProps<MyDeviceView>[]>(
    () => [
      { title: t("myDevices.field.id"), dataIndex: "id", width: 140 },
      { title: t("myDevices.field.uuid"), dataIndex: "uuid", width: 200 },
      {
        title: t("myDevices.field.note"),
        dataIndex: "note",
        render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")),
      },
      {
        title: t("myDevices.field.online"),
        dataIndex: "isOnline",
        width: 100,
        render: (v: boolean) => <StatusTag status={v ? "online" : "offline"} />,
      },
      {
        title: t("myDevices.field.status"),
        dataIndex: "status",
        width: 100,
        render: (v: number) => <StatusTag status={v === 1 ? "enabled" : "disabled"} />,
      },
      {
        title: t("myDevices.field.lastHeartbeat"),
        dataIndex: "lastHeartbeat",
        width: 170,
        render: (v: string | null) =>
          v ? new Date(v).toLocaleString() : tc("state.noDescription"),
      },
    ],
    [t, tc],
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:myDevices" description={t("myDevices.desc")} />
      <DataTable<MyDeviceView>
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isLoading}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="uuid"
      />
    </div>
  );
}
