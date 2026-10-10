/**
 * 设备组详情页（M4-T05，设计 §5.2 `/device-groups/:guid`，路由门槛 devices.view）。
 *
 * 职责：
 * - 展示组信息（名称 / 备注 / 关联策略 / 设备数）与组内设备分页；
 * - 加入设备（按 peer.id 批量，AdminGuard 语义 → is_admin 显隐）；
 * - 移出设备（同上）；
 * - 分配策略入口：PermissionButton code="strategies.assign"
 *   deviceGroupGuid={guid}（★ device_group scope 二次判定，§4.4）→ 跳策略详情。
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Banner, Button, Descriptions, Form, Modal, Notification, Spin, TextArea } from "@douyinfe/semi-ui";
import { IconArrowLeft } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { StatusTag } from "@/components/StatusTag";
import type { DeviceView } from "@/api/endpoints/devices";
import {
  useAddDeviceGroupDevices,
  useDeviceGroup,
  useDeviceGroupDevices,
  useRemoveDeviceGroupDevices,
} from "@/api/hooks/deviceGroups";
import { toDisplayMessage } from "@/api/error";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";

/**
 * 设备组详情页。
 *
 * @returns 组信息 + 组内设备表格 + 权限按钮
 */
export function DeviceGroupDetail() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { guid = "" } = useParams<{ guid: string }>();
  const navigate = useNavigate();
  const { isAdmin } = usePermission();
  const { state, setPage, setPageSize, pageParams } = useTableQuery();

  const group = useDeviceGroup(guid);
  const devices = useDeviceGroupDevices(guid, pageParams.current, pageParams.pageSize);
  const addDevices = useAddDeviceGroupDevices(guid);
  const removeDevices = useRemoveDeviceGroupDevices(guid);

  const [addOpen, setAddOpen] = useState(false);
  const [idsText, setIdsText] = useState("");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  if (group.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }
  if (group.data === null || group.data === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader titleKey="menu:deviceGroups" />
        <Banner type="warning" description={t("deviceGroups.empty")} closeIcon={null} />
      </div>
    );
  }

  const g = group.data;
  const columns = [
    { title: t("devices.field.id"), dataIndex: "id", width: 130 },
    { title: t("devices.field.deviceName"), dataIndex: "guid", render: (_v: unknown, row: DeviceView) => row.info.device_name || row.guid },
    { title: t("devices.field.username"), dataIndex: "guid", width: 110, render: (_v: unknown, row: DeviceView) => row.info.username },
    {
      title: t("devices.field.online"),
      dataIndex: "is_online",
      width: 90,
      render: (v: boolean) => <StatusTag status={v ? "online" : "offline"} />,
    },
    ...(isAdmin
      ? [
          {
            title: tc("table.actions"),
            width: 120,
            render: (_v: unknown, row: DeviceView) => (
              <Button
                size="small"
                theme="borderless"
                type="danger"
                onClick={() =>
                  removeDevices.mutate([row.id], {
                    onSuccess: (r) =>
                      Notification.success({
                        content: t("deviceGroups.devicesRemoved", { count: r.removed_count }),
                      }),
                    onError,
                  })
                }
              >
                {t("deviceGroups.action.removeDevices")}
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("deviceGroups.detailTitle")}
        description={g.name}
        extra={
          <Button icon={<IconArrowLeft />} theme="borderless" onClick={() => navigate("/device-groups")}>
            {t("deviceGroups.backToList")}
          </Button>
        }
      />

      <Descriptions
        align="left"
        data={[
          { key: t("deviceGroups.field.name"), value: g.name },
          { key: t("deviceGroups.field.note"), value: g.note.length > 0 ? g.note : tc("state.noDescription") },
          {
            key: t("deviceGroups.field.strategy"),
            value:
              g.strategy_guid === null ? (
                t("deviceGroups.strategyNone")
              ) : (
                <Button
                  size="small"
                  theme="borderless"
                  onClick={() => navigate(`/strategies/${g.strategy_guid as string}`)}
                >
                  {g.strategy_guid}
                </Button>
              ),
          },
          { key: t("deviceGroups.field.deviceCount"), value: String(g.device_count) },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2">
        {isAdmin ? (
          <Button theme="solid" onClick={() => setAddOpen(true)}>
            {t("deviceGroups.action.addDevices")}
          </Button>
        ) : null}
        {/* ★ device_group scope 二次判定：以本组 guid 为上下文判定 strategies.assign */}
        <PermissionButton
          code="strategies.assign"
          deviceGroupGuid={guid}
          onClick={() => navigate(`/strategies?assign=${guid}`)}
        >
          {t("strategies.action.assign")}
        </PermissionButton>
      </div>

      <DataTable<DeviceView>
        columns={columns}
        dataSource={devices.data?.data}
        loading={devices.isLoading}
        total={devices.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="guid"
        rowSelection={{
          selectedRowKeys: [...selectedIds],
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
      />

      {isAdmin && selectedIds.length > 0 ? (
        <Button
          type="danger"
          onClick={() =>
            removeDevices.mutate([...selectedIds], {
              onSuccess: (r) => {
                Notification.success({
                  content: t("deviceGroups.devicesRemoved", { count: r.removed_count }),
                });
                setSelectedIds([]);
              },
              onError,
            })
          }
        >
          {t("deviceGroups.action.removeDevices")}
        </Button>
      ) : null}

      <Modal
        title={t("deviceGroups.addDevicesTitle")}
        visible={addOpen}
        okText={tc("action.confirm")}
        cancelText={tc("action.cancel")}
        confirmLoading={addDevices.isPending}
        onOk={() => {
          const ids = idsText
            .split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          if (ids.length === 0) return;
          addDevices.mutate(ids, {
            onSuccess: (r) => {
              Notification.success({
                content: t("deviceGroups.devicesAdded", { count: r.added_count }),
              });
              setAddOpen(false);
              setIdsText("");
              void devices.refetch();
              void group.refetch();
            },
            onError,
          });
        }}
        onCancel={() => setAddOpen(false)}
      >
        <Form>
          <TextArea
            value={idsText}
            onChange={(v: string) => setIdsText(v)}
            rows={4}
          />
        </Form>
      </Modal>
    </div>
  );
}
