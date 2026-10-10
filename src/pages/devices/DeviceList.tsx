/**
 * 设备列表页（M4-T05，设计 §5.2 `/devices`，路由门槛 devices.view）。
 *
 * ★★ device_group 二次判定（§4.4，T05 验收核心）：
 * 每一行的操作按钮以 **该行设备所属组** 为上下文判定：
 *   can("devices.disconnect", { deviceGroupGuid: row.deviceGroupGuid })
 * - `DeviceView.deviceGroupGuid` 契约类型为 `string | null`，**原样透传**；
 * - 无组设备（null / 空串）→ 保守隐藏（不回退平铺判定，防越权）；
 * - `is_admin` 短路放行（与后端 AdminGuard 语义一致）。
 *
 * 组件选型（Semi MCP 已查证）：Table / Select / Popconfirm / Tag / Notification。
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Notification, Popconfirm, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import { StatusTag } from "@/components/StatusTag";
import type { DeviceView } from "@/api/endpoints/devices";
import {
  useDeleteDevice,
  useDevices,
  useDisconnectDevice,
  useUpdateDeviceStatus,
} from "@/api/hooks/devices";
import { toDisplayMessage } from "@/api/error";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";
import { AssignUserModal } from "@/pages/devices/AssignUserModal";

/** 可选状态筛选。 */
type StatusFilter = "enabled" | "disabled" | "";
/** 可选在线筛选。 */
type OnlineFilter = "online" | "offline" | "";

/**
 * 设备列表页。
 *
 * @returns 筛选栏 + 设备表格（行内权限按设备组二次判定）
 */
export function DeviceList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { can, isAdmin } = usePermission();
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  // 筛选态（页面内会话态；与第 1 批列表页约定一致）
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>("");
  const [selectedGuids, setSelectedGuids] = useState<readonly string[]>([]);
  // GAP2：分配用户弹窗目标设备（null = 关闭）。
  const [assignTarget, setAssignTarget] = useState<DeviceView | null>(null);

  const query = useDevices({
    ...pageParams,
    id: /^\d+$/.test(state.keyword) ? state.keyword : undefined,
    device_name:
      state.keyword.length > 0 && !/^\d+$/.test(state.keyword) ? state.keyword : undefined,
    status: statusFilter === "" ? undefined : statusFilter === "enabled" ? "1" : "0",
    is_online: onlineFilter === "" ? undefined : onlineFilter === "online" ? "1" : "0",
  });

  const updateStatus = useUpdateDeviceStatus();
  const removeDevice = useDeleteDevice();
  const disconnect = useDisconnectDevice();

  /** ★ 行级二次判定：can(code, { deviceGroupGuid: 该行的组 guid（可 null） }) */
  const rowCan = useMemo(
    () => (code: string, row: DeviceView) =>
      can(code, { deviceGroupGuid: row.deviceGroupGuid ?? null }),
    [can],
  );

  /** 批量操作：所有选中行均通过其所在组的分档判定才可用（翻页残留行保守 false）。 */
  const batchAllowed = (code: string): boolean => {
    if (isAdmin) return true;
    const rows = query.data?.data ?? [];
    return (
      selectedGuids.length > 0 &&
      selectedGuids.every((guid) => {
        const row = rows.find((r) => r.guid === guid);
        return row !== undefined && rowCan(code, row);
      })
    );
  };

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<DeviceView>[] = [
    { title: t("devices.field.id"), dataIndex: "id", width: 130 },
    {
      title: t("devices.field.deviceName"),
      dataIndex: "guid",
      render: (_v: unknown, row: DeviceView) => row.info.device_name || row.guid,
    },
    {
      title: t("devices.field.username"),
      dataIndex: "guid",
      width: 110,
      render: (_v, row) => row.info.username,
    },
    {
      title: t("devices.field.os"),
      dataIndex: "guid",
      width: 100,
      render: (_v, row) => row.info.os,
    },
    {
      title: t("devices.field.user"),
      dataIndex: "user_name",
      width: 110,
      render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")),
    },
    {
      title: t("devices.field.group"),
      dataIndex: "device_group_name",
      width: 130,
      render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")),
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
    { title: t("devices.field.lastOnline"), dataIndex: "last_online", width: 170 },
    {
      title: tc("table.actions"),
      width: 250,
      render: (_v: unknown, row: DeviceView) => (
        <div className="flex items-center gap-1">
          <PermissionButton
            size="small"
            theme="borderless"
            code="devices.view"
            deviceGroupGuid={row.deviceGroupGuid ?? null}
            onClick={() => navigate(`/devices/${row.guid}`)}
          >
            {t("devices.action.detail")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="devices.disconnect"
            deviceGroupGuid={row.deviceGroupGuid ?? null}
            onClick={() =>
              disconnect.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("devices.disconnected") }),
                onError,
              })
            }
          >
            {t("devices.action.disconnect")}
          </PermissionButton>
          {/* GAP2：分配给用户（devices.assign；转移/解绑共用同一弹窗） */}
          <PermissionButton
            size="small"
            theme="borderless"
            code="devices.assign"
            deviceGroupGuid={row.deviceGroupGuid ?? null}
            onClick={() => setAssignTarget(row)}
          >
            {t("devices.action.assign")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="devices.status"
            deviceGroupGuid={row.deviceGroupGuid ?? null}
            onClick={() =>
              updateStatus.mutate(
                { guids: [row.guid], status: row.status === 1 ? "disabled" : "enabled" },
                {
                  onSuccess: () => Notification.success({ content: t("devices.statusUpdated") }),
                  onError,
                },
              )
            }
          >
            {row.status === 1 ? t("devices.action.disable") : t("devices.action.enable")}
          </PermissionButton>
          <Popconfirm
            title={t("devices.deleteConfirm")}
            onConfirm={() =>
              removeDevice.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("devices.deleted") }),
                onError,
              })
            }
          >
            {/* ★ 无组（null）设备：删除按钮同样按组判定，保守隐藏 */}
            <PermissionButton
              size="small"
              theme="borderless"
              type="danger"
              code="devices.delete"
              deviceGroupGuid={row.deviceGroupGuid ?? null}
            >
              {t("devices.action.delete")}
            </PermissionButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:devices"
        extra={
          <PermissionButton
            icon={<IconRefresh />}
            theme="borderless"
            code="devices.view"
            onClick={() => void query.refetch()}
          >
            {tc("action.refresh")}
          </PermissionButton>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("devices.filter.deviceName")} onSearch={setKeyword} />
        <Select
          value={statusFilter}
          style={{ width: 130 }}
          aria-label={t("devices.filter.status")}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          optionList={[
            { value: "", label: t("devices.status.all") },
            { value: "enabled", label: t("devices.status.enabled") },
            { value: "disabled", label: t("devices.status.disabled") },
          ]}
        />
        <Select
          value={onlineFilter}
          style={{ width: 130 }}
          aria-label={t("devices.filter.isOnline")}
          onChange={(v) => setOnlineFilter(v as OnlineFilter)}
          optionList={[
            { value: "", label: t("devices.status.all") },
            { value: "online", label: t("devices.status.online") },
            { value: "offline", label: t("devices.status.offline") },
          ]}
        />
        <div className="flex items-center gap-2">
          <PermissionButton
            size="small"
            code="devices.status"
            disabled={selectedGuids.length === 0 || !batchAllowed("devices.status")}
            fallback="disable"
            onClick={() =>
              updateStatus.mutate(
                { guids: selectedGuids, status: "enabled" },
                {
                  onSuccess: (r) =>
                    Notification.success({
                      content: `${t("devices.statusUpdated")} (${r.succeededCount}/${r.total})`,
                    }),
                  onError,
                },
              )
            }
          >
            {t("devices.action.batchEnable")}
          </PermissionButton>
          <PermissionButton
            size="small"
            code="devices.status"
            disabled={selectedGuids.length === 0 || !batchAllowed("devices.status")}
            fallback="disable"
            onClick={() =>
              updateStatus.mutate(
                { guids: selectedGuids, status: "disabled" },
                {
                  onSuccess: (r) =>
                    Notification.success({
                      content: `${t("devices.statusUpdated")} (${r.succeededCount}/${r.total})`,
                    }),
                  onError,
                },
              )
            }
          >
            {t("devices.action.batchDisable")}
          </PermissionButton>
          {selectedGuids.length > 0 ? (
            <Tag color="blue">{t("devices.selectedCount", { count: selectedGuids.length })}</Tag>
          ) : null}
        </div>
      </div>

      <DataTable<DeviceView>
        columns={columns}
        dataSource={query.data?.data}
        loading={query.isLoading}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="guid"
        rowSelection={{
          selectedRowKeys: [...selectedGuids],
          onChange: (keys) => setSelectedGuids(keys as string[]),
        }}
      />

      {/* GAP2：设备「分配给用户」弹窗（列表数据源随缓存前缀自动刷新） */}
      <AssignUserModal device={assignTarget} onClose={() => setAssignTarget(null)} />
    </div>
  );
}
