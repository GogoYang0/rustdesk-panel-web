/**
 * 设备组列表页（M4-T05，设计 §5.2 `/device-groups`，路由门槛 devices.view）。
 *
 * 权限语义（对齐后端 AdminGuard）：设备组的创建 / 编辑 / 删除为**管理员语义**
 * （无独立权限码），入口用 `is_admin` 显隐；详情路由仍为 devices.view。
 * 策略候选（GET /api/device-groups/strategy-targets）走 Perm(strategies.assign)。
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { Form, Notification, Popconfirm, Typography } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@douyinfe/semi-ui";
import { SearchBar } from "@/components/SearchBar";
import type { DeviceGroupView } from "@/api/endpoints/deviceGroups";
import {
  useCreateDeviceGroup,
  useDeleteDeviceGroup,
  useDeviceGroups,
  useUpdateDeviceGroup,
} from "@/api/hooks/deviceGroups";
import { toDisplayMessage } from "@/api/error";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";

/** 表单值形态。 */
interface GroupFormValues {
  name: string;
  note?: string;
}

/**
 * 设备组列表页。
 *
 * @returns 搜索栏 + 设备组表格（CRUD 入口按 is_admin 显隐）
 */
export function DeviceGroupList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { isAdmin } = usePermission();
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [editing, setEditing] = useState<DeviceGroupView | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useDeviceGroups({ ...pageParams, name: state.keyword || undefined });
  const createGroup = useCreateDeviceGroup();
  const updateGroup = useUpdateDeviceGroup();
  const removeGroup = useDeleteDeviceGroup();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<DeviceGroupView>[] = [
    { title: t("deviceGroups.field.name"), dataIndex: "name" },
    {
      title: t("deviceGroups.field.note"),
      dataIndex: "note",
      render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")),
    },
    {
      title: t("deviceGroups.field.strategy"),
      dataIndex: "strategy_guid",
      width: 140,
      render: (v: string | null) =>
        v === null ? (
          t("deviceGroups.strategyNone")
        ) : (
          <Typography.Text ellipsis={{ showTooltip: true }} style={{ maxWidth: 120 }}>
            {v}
          </Typography.Text>
        ),
    },
    { title: t("deviceGroups.field.deviceCount"), dataIndex: "device_count", width: 100 },
    { title: t("deviceGroups.field.updatedAt"), dataIndex: "updated_at", width: 180 },
    {
      title: tc("table.actions"),
      width: 240,
      render: (_v: unknown, row: DeviceGroupView) => (
        <div className="flex items-center gap-1">
          <Button size="small" theme="borderless" onClick={() => navigate(`/device-groups/${row.guid}`)}>
            {t("deviceGroups.action.detail")}
          </Button>
          {isAdmin ? (
            <>
              <Button size="small" theme="borderless" onClick={() => setEditing(row)}>
                {t("deviceGroups.action.edit")}
              </Button>
              <Popconfirm
                title={t("deviceGroups.deleteConfirm")}
                onConfirm={() =>
                  removeGroup.mutate(row.guid, {
                    onSuccess: () => Notification.success({ content: t("deviceGroups.deleted") }),
                    onError,
                  })
                }
              >
                <Button size="small" theme="borderless" type="danger">
                  {t("deviceGroups.action.delete")}
                </Button>
              </Popconfirm>
            </>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:deviceGroups"
        extra={
          isAdmin ? (
            <Button icon={<IconPlus />} theme="solid" onClick={() => setCreating(true)}>
              {t("deviceGroups.action.create")}
            </Button>
          ) : null
        }
      />

      <SearchBar placeholder={t("deviceGroups.filter.name")} onSearch={setKeyword} />

      <DataTable<DeviceGroupView>
        columns={columns}
        dataSource={query.data?.data}
        loading={query.isLoading}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="guid"
      />

      {/* 新建 / 编辑共用表单弹窗（AdminGuard 语义，入口已按 is_admin 显隐） */}
      <FormModal<GroupFormValues>
        visible={creating || editing !== null}
        title={editing !== null ? t("deviceGroups.editTitle") : t("deviceGroups.createTitle")}
        initialValues={
          editing !== null ? { name: editing.name, note: editing.note } : { name: "", note: "" }
        }
        submitting={createGroup.isPending || updateGroup.isPending}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(values) => {
          const body = { name: values.name, note: values.note ?? "" };
          if (editing !== null) {
            updateGroup.mutate(
              { guid: editing.guid, body },
              {
                onSuccess: () => {
                  Notification.success({ content: t("deviceGroups.updated") });
                  setEditing(null);
                },
                onError,
              },
            );
          } else {
            createGroup.mutate(body, {
              onSuccess: () => {
                Notification.success({ content: t("deviceGroups.created") });
                setCreating(false);
              },
              onError,
            });
          }
        }}
      >
        <Form.Input field="name" label={t("deviceGroups.field.name")} rules={[{ required: true }]} />
        <Form.Input field="note" label={t("deviceGroups.field.note")} />
      </FormModal>
    </div>
  );
}
