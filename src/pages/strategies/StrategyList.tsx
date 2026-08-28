/**
 * 策略列表页（M4-T05，设计 §5.2 `/strategies`，路由门槛 strategies.view）。
 *
 * 行内操作：详情（strategies.view）、编辑（strategies.edit）、
 * 删除（strategies.delete）——策略为全局域，无组上下文。
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { Form, Notification, Popconfirm } from "@douyinfe/semi-ui";
import { IconPlus } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import type { StrategyView } from "@/api/endpoints/strategies";
import {
  useCreateStrategy,
  useDeleteStrategy,
  useStrategies,
  useUpdateStrategy,
} from "@/api/hooks/strategies";
import { toDisplayMessage } from "@/api/error";
import { useTableQuery } from "@/hooks/useTableQuery";

/** 表单值形态。 */
interface StrategyFormValues {
  name: string;
  note?: string;
}

/**
 * 策略列表页。
 *
 * @returns 搜索栏 + 策略表格（CRUD 按全局权限码显隐）
 */
export function StrategyList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const navigate = useNavigate();
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [editing, setEditing] = useState<StrategyView | null>(null);
  const [creating, setCreating] = useState(false);

  const query = useStrategies({ ...pageParams, name: state.keyword || undefined });
  const createStrategy = useCreateStrategy();
  const updateStrategy = useUpdateStrategy();
  const deleteStrategy = useDeleteStrategy();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<StrategyView>[] = [
    { title: t("strategies.field.name"), dataIndex: "name" },
    {
      title: t("strategies.field.note"),
      dataIndex: "note",
      render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")),
    },
    {
      title: t("strategies.field.configOptions"),
      dataIndex: "config_options",
      render: (v: Record<string, string>) => `${Object.keys(v ?? {}).length}`,
    },
    { title: t("strategies.field.updatedAt"), dataIndex: "updated_at", width: 180 },
    {
      title: tc("table.actions"),
      width: 250,
      render: (_v: unknown, row: StrategyView) => (
        <div className="flex items-center gap-1">
          <PermissionButton
            size="small"
            theme="borderless"
            code="strategies.view"
            onClick={() => navigate(`/strategies/${row.guid}`)}
          >
            {t("strategies.action.detail")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="strategies.edit"
            onClick={() => setEditing(row)}
          >
            {t("strategies.action.edit")}
          </PermissionButton>
          <Popconfirm
            title={t("strategies.deleteConfirm")}
            onConfirm={() =>
              deleteStrategy.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("strategies.deleted") }),
                onError,
              })
            }
          >
            <PermissionButton size="small" theme="borderless" type="danger" code="strategies.delete">
              {t("strategies.action.delete")}
            </PermissionButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:strategies"
        extra={
          <PermissionButton icon={<IconPlus />} theme="solid" code="strategies.create" onClick={() => setCreating(true)}>
            {t("strategies.action.create")}
          </PermissionButton>
        }
      />

      <SearchBar placeholder={t("strategies.filter.name")} onSearch={setKeyword} />

      <DataTable<StrategyView>
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

      <FormModal<StrategyFormValues>
        visible={creating || editing !== null}
        title={editing !== null ? t("strategies.editTitle") : t("strategies.createTitle")}
        initialValues={
          editing !== null ? { name: editing.name, note: editing.note } : { name: "", note: "" }
        }
        submitting={createStrategy.isPending || updateStrategy.isPending}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={(values) => {
          if (editing !== null) {
            updateStrategy.mutate(
              { guid: editing.guid, body: { name: values.name, note: values.note ?? "" } },
              {
                onSuccess: () => {
                  Notification.success({ content: t("strategies.updated") });
                  setEditing(null);
                },
                onError,
              },
            );
          } else {
            createStrategy.mutate(
              { name: values.name, note: values.note ?? "", config_options: {} },
              {
                onSuccess: (created) => {
                  Notification.success({ content: t("strategies.created") });
                  setCreating(false);
                  navigate(`/strategies/${created.guid}`);
                },
                onError,
              },
            );
          }
        }}
      >
        <Form.Input field="name" label={t("strategies.field.name")} rules={[{ required: true }]} />
        <Form.Input field="note" label={t("strategies.field.note")} />
      </FormModal>
    </div>
  );
}
