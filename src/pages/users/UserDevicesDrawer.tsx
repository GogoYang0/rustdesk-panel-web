/**
 * 用户设备抽屉（GAP2 设计 §2.5；UserList 行操作「查看设备」）。
 *
 * 契约：GET /api/users/{guid}/devices（users.view 只读反查，OQ-8）；
 * 行形状复用 DeviceView 分页。
 */
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { SideSheet, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/DataTable";
import { StatusTag } from "@/components/StatusTag";
import type { DeviceView } from "@/api/endpoints/devices";
import { useUserDevices } from "@/api/hooks/mydevices";
import { useTableQuery } from "@/hooks/useTableQuery";

/**
 * 用户设备抽屉属性。
 */
export interface UserDevicesDrawerProps {
  /** 目标用户（null = 关闭） */
  user: { guid: string; username: string } | null;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 用户名下设备侧滑抽屉。
 *
 * @param props user + onClose
 * @returns 设备分页抽屉
 */
export function UserDevicesDrawer({ user, onClose }: UserDevicesDrawerProps) {
  const { t } = useTranslation("pages");
  const { state, setPage, setPageSize, pageParams } = useTableQuery();

  const query = useUserDevices(
    user?.guid ?? "",
    { current: pageParams.current, pageSize: pageParams.pageSize },
    user !== null,
  );

  const columns: ColumnProps<DeviceView>[] = [
    { title: t("devices.field.id"), dataIndex: "id", width: 130 },
    {
      title: t("devices.field.deviceName"),
      dataIndex: "guid",
      render: (_v: unknown, row: DeviceView) => row.info.device_name || row.guid,
    },
    {
      title: t("devices.field.os"),
      dataIndex: "guid",
      width: 110,
      render: (_v, row) => row.info.os,
    },
    {
      title: t("devices.field.online"),
      dataIndex: "is_online",
      width: 90,
      render: (v: boolean) => <StatusTag status={v ? "online" : "offline"} />,
    },
    {
      title: t("devices.field.status"),
      dataIndex: "status",
      width: 90,
      render: (v: number) => <StatusTag status={v === 1 ? "enabled" : "disabled"} />,
    },
  ];

  return (
    <SideSheet
      title={t("users.devicesTitle", { name: user?.username ?? "" })}
      visible={user !== null}
      onCancel={onClose}
      width={640}
    >
      <div className="flex flex-col gap-3">
        <Tag color="blue">{t("users.devicesCount", { count: query.data?.total ?? 0 })}</Tag>
        <DataTable<DeviceView>
          columns={columns}
          dataSource={query.data?.data ?? []}
          loading={user !== null && query.isLoading}
          total={query.data?.total ?? 0}
          page={state.page}
          pageSize={state.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowKey="guid"
        />
      </div>
    </SideSheet>
  );
}
