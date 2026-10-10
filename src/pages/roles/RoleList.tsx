/**
 * 角色列表页（M4-T06，路由门槛 roles.view）。
 *
 * 权限语义（OQ-10 批复）：
 * - 角色创建/更新/删除为 super administrator（roles.create/edit/delete 为 system_only 码，
 *   **不进 permissions 生效码**），前端用 `is_admin` 判定按钮可见性；
 * - 权限矩阵（36 码目录）：按 resource 分组勾选，**仅 assignable 码可勾选**
 *   （system_only 3 码置灰）；device_group scope 码仅作标注（实际生效分档由
 *   用户角色指派 + scopes.device_group 决定，角色层只存码集合）；
 * - 取消保护账号需 `confirm_protected_account_change=true`（二次确认后置位）；
 * - 删除前展示 protection-impact（受影响成员数）。
 */
import { useMemo, useState } from "react";
import { Button, Checkbox, Form, Modal, Notification, Popconfirm, Switch, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { toDisplayMessage } from "@/api/error";
import type { RoleView } from "@/api/endpoints/roles";
import { useCreateRole, useDeleteRole, usePermissionsCatalog, useRole, useRoles, useUpdateRole } from "@/api/hooks/roles";
import { useRoleProtectionImpact } from "@/api/hooks/users";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";
import { isDeviceGroupScoped, isSystemOnlyCode } from "@/types/permissions";

/** 权限矩阵编辑弹窗属性。 */
interface PermissionMatrixModalProps {
  /** 目标角色（null = 新建） */
  role: RoleView | null;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调（全量权限码集合） */
  onSubmit: (payload: {
    name: string;
    note?: string;
    protected_account: boolean;
    permissions: string[];
    confirm_protected_account_change?: boolean;
  }) => void;
  /** 提交中 */
  submitting: boolean;
}

/**
 * 从权限目录按 resource 分组（纯函数，供矩阵渲染与单测复用）。
 *
 * @param catalog 目录条目（contract PermissionDefinition 或静态元数据超集）
 * @returns 按资源名分组的有序组列表
 */
export function groupPermissionsByResource(
  catalog: readonly { code: string; resource: string; action: string; assignable?: boolean }[],
): { resource: string; codes: { code: string; action: string; assignable: boolean }[] }[] {
  const order: string[] = [];
  const map = new Map<string, { code: string; action: string; assignable: boolean }[]>();
  for (const item of catalog) {
    let group = map.get(item.resource);
    if (group === undefined) {
      group = [];
      map.set(item.resource, group);
      order.push(item.resource);
    }
    group.push({ code: item.code, action: item.action, assignable: item.assignable !== false });
  }
  return order.map((resource) => ({ resource, codes: map.get(resource) ?? [] }));
}

/**
 * 权限矩阵编辑弹窗（Table rowSelection 语义：选中行 = 已勾选码）。
 */
function PermissionMatrixModal({ role, onClose, onSubmit, submitting }: PermissionMatrixModalProps) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const catalogQuery = usePermissionsCatalog();
  const detailQuery = useRole(role?.guid ?? "", role !== null);

  const [name, setName] = useState(role?.name ?? "");
  const [note, setNote] = useState(role?.note ?? "");
  const [protectedAccount, setProtectedAccount] = useState(role?.protected_account ?? false);
  const [confirmChange, setConfirmChange] = useState(false);
  // 已勾选权限码（新建默认空；编辑默认为详情返回清单）
  const [selected, setSelected] = useState<readonly string[] | null>(null);

  const detailPermissions = detailQuery.data?.permissions ?? [];
  const effectiveSelected = selected ?? detailPermissions;

  const groups = useMemo(
    () => groupPermissionsByResource(catalogQuery.data?.data ?? []),
    [catalogQuery.data],
  );

  const canSubmit =
    name.trim().length > 0 &&
    // 取消保护必须勾选二次确认（仅编辑态）
    (role === null || protectedAccount || !role.protected_account || confirmChange);

  return (
    <Modal
      title={role !== null ? t("roles.editTitle", { name: role.name }) : t("roles.createTitle")}
      visible
      width={760}
      okText={tc("action.save")}
      cancelText={tc("action.cancel")}
      confirmLoading={submitting}
      okButtonProps={{ disabled: !canSubmit }}
      onCancel={onClose}
      onOk={() =>
        onSubmit({
          name: name.trim(),
          note: note.trim().length > 0 ? note.trim() : undefined,
          protected_account: protectedAccount,
          permissions: [...effectiveSelected],
          confirm_protected_account_change:
            role !== null && role.protected_account && !protectedAccount ? true : undefined,
        })
      }
      destroyOnClose
    >
      <div className="flex flex-col gap-3">
        <Form labelPosition="left" labelWidth={110}>
          <Form.Input field="name" label={t("roles.field.name")} initValue={name}
            onChange={(v: string) => setName(v)} rules={[{ required: true }]} maxLength={64} />
          <Form.Input field="note" label={t("roles.field.note")} initValue={note}
            onChange={(v: string) => setNote(v)} maxLength={255} />
          <div className="flex items-center gap-2">
            <span className="w-[110px] text-right">{t("roles.field.protected")}</span>
            <Switch checked={protectedAccount} onChange={(v: boolean) => setProtectedAccount(v)}
              aria-label={t("roles.field.protected")} />
            {role !== null && role.protected_account && !protectedAccount ? (
              <label className="flex items-center gap-1 text-sm">
                <Checkbox checked={confirmChange} onChange={(e: { target: { checked?: boolean } }) =>
                  setConfirmChange(e.target.checked === true)} />
                {t("roles.field.confirmUnprotect")}
              </label>
            ) : null}
          </div>
        </Form>
        <DataTable<{ code: string; action: string; assignable: boolean; resource: string }>
          columns={[
            { title: t("roles.field.permCode"), dataIndex: "code" },
            { title: t("roles.field.permAction"), dataIndex: "action", width: 140 },
            { title: t("roles.field.permScope"), dataIndex: "resource", width: 140,
              render: (_v: unknown, r) =>
                isDeviceGroupScoped(r.code)
                  ? <Tag color="cyan">{t("roles.field.scopeDeviceGroup")}</Tag>
                  : <Tag color="grey">{t("roles.field.scopeGlobal")}</Tag> },
          ]}
          dataSource={groups.flatMap((g) => g.codes.map((c) => ({ ...c, resource: g.resource })))}
          loading={catalogQuery.isLoading}
          rowKey="code"
          rowSelection={{
            selectedRowKeys: [...effectiveSelected],
            onChange: (keys) => setSelected(keys as string[]),
            // system_only 码不可选（assignable=false 置灰）
            getCheckboxProps: (record: { code: string }) => ({ disabled: isSystemOnlyCode(record.code) }),
          }}
          tableProps={{ size: "small" }}
        />
        <p className="text-xs text-[var(--semi-color-text-2)]">{t("roles.matrixHint")}</p>
      </div>
    </Modal>
  );
}

/**
 * 角色列表页。
 *
 * 列表门槛 roles.view；创建/编辑/删除按钮用 `is_admin` 判定（OQ-10 批复，
 * roles.create/edit/delete 为 system_only 码不入生效快照）。
 *
 * @returns 角色表格 + 权限矩阵编辑弹窗
 */
export function RoleList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { isAdmin } = usePermission();
  const { state, setKeyword } = useTableQuery();

  const [matrixRow, setMatrixRow] = useState<RoleView | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const query = useRoles(state.keyword.length > 0 ? { name: state.keyword } : undefined);

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  /** 矩阵提交（新建 / 更新统一入口）。 */
  const submitMatrix = (payload: {
    name: string;
    note?: string;
    protected_account: boolean;
    permissions: string[];
    confirm_protected_account_change?: boolean;
  }): void => {
    setSubmitting(true);
    if (matrixRow !== null) {
      updateRoleMutation.mutate(
        {
          guid: matrixRow.guid,
          body: {
            name: payload.name,
            note: payload.note,
            protected_account: payload.protected_account,
            permissions: payload.permissions,
            confirm_protected_account_change: payload.confirm_protected_account_change,
          },
        },
        {
          onSuccess: () => {
            Notification.success({ content: t("roles.updated") });
            setSubmitting(false);
            setMatrixRow(null);
          },
          onError: (err) => {
            onError(err);
            setSubmitting(false);
          },
        },
      );
    } else {
      createRoleMutation.mutate(
        {
          name: payload.name,
          note: payload.note,
          protected_account: payload.protected_account,
          permissions: payload.permissions,
        },
        {
          onSuccess: () => {
            Notification.success({ content: t("roles.created") });
            setSubmitting(false);
            setCreating(false);
          },
          onError: (err) => {
            onError(err);
            setSubmitting(false);
          },
        },
      );
    }
  };

  /** 删除确认（弹窗文案展示 protection-impact）。 */
  const confirmDelete = (row: RoleView): void => {
    deleteRoleMutation.mutate(row.guid, {
      onSuccess: () => Notification.success({ content: t("roles.deleted") }),
      onError,
    });
  };

  const columns: ColumnProps<RoleView>[] = [
    { title: t("roles.field.name"), dataIndex: "name", width: 180 },
    { title: t("roles.field.note"), dataIndex: "note",
      render: (v: string | undefined) => (v && v.length > 0 ? v : tc("state.noDescription")) },
    { title: t("roles.field.protected"), dataIndex: "protected_account", width: 100,
      render: (v: boolean) => (v ? <Tag color="orange">{t("roles.field.protectedYes")}</Tag> : "—") },
    { title: t("roles.field.createdAt"), dataIndex: "created_at", width: 180,
      render: (v: string | undefined) => v || tc("state.unknown") },
    {
      title: tc("table.actions"),
      width: 200,
      render: (_v: unknown, row: RoleView) => (
        <div className="flex items-center gap-1">
          {isAdmin ? (
            <Button size="small" theme="borderless" onClick={() => setMatrixRow(row)}>
              {t("roles.action.edit")}
            </Button>
          ) : null}
          {isAdmin ? (
            <Popconfirm
              title={t("roles.deleteConfirm")}
              content={<RoleImpactHint guid={row.guid} />}
              onConfirm={() => confirmDelete(row)}
            >
              <Button size="small" theme="borderless" type="danger">
                {t("roles.action.delete")}
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:roles"
        extra={
          <>
            <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
              {tc("action.refresh")}
            </Button>
            {isAdmin ? (
              <Button theme="solid" onClick={() => setCreating(true)}>
                {t("roles.action.create")}
              </Button>
            ) : null}
          </>
        }
      />

      <SearchBar placeholder={t("roles.filter.name")} onSearch={setKeyword} value={state.keyword} />

      <DataTable<RoleView>
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isLoading}
        rowKey="guid"
      />

      {matrixRow !== null ? (
        <PermissionMatrixModal
          role={matrixRow}
          submitting={submitting}
          onClose={() => setMatrixRow(null)}
          onSubmit={submitMatrix}
        />
      ) : null}
      {creating ? (
        <PermissionMatrixModal
          role={null}
          submitting={submitting}
          onClose={() => setCreating(false)}
          onSubmit={submitMatrix}
        />
      ) : null}
    </div>
  );
}

/** 删除确认中的影响面提示（protection-impact 懒加载，Popconfirm 展开时才请求）。 */
function RoleImpactHint({ guid }: { guid: string }) {
  const { t } = useTranslation("pages");
  const query = useRoleProtectionImpact(guid, guid.length > 0);
  const count = query.data?.affected_member_count ?? 0;
  return <span>{t("roles.deleteImpact", { count })}</span>;
}
