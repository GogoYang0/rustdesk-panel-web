/**
 * 用户列表页（M4-T06，路由门槛 users.view）。
 *
 * 契约要点：
 * - 管理员分页走 `GET /api/admin/users`（10 过滤参数）；
 * - 行内操作按字段分权：编辑 users.edit、启停 users.status、安全/重置口令 users.security、
 *   强制下线 users.force_logout、删除 users.delete、角色指派 roles.assign；
 * - 批量操作（启停/安全/下线）为**部分成功** `BatchResult`，页面必须展示 succeeded/failed 明细；
 * - 前端权限只做 UI 显隐，后端每次实时查库为准。
 *
 * 组件选型（Semi 已查证）：Table / Form / Modal / Select / Popconfirm / Tag / Notification / Descriptions / Switch。
 */
import { useMemo, useState } from "react";
import {
  Banner,
  Descriptions,
  Form,
  Modal,
  Notification,
  Popconfirm,
  Select,
  Tag,
  Typography,
} from "@douyinfe/semi-ui";
import { IconPlus, IconRefresh, IconSend } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import { StatusTag } from "@/components/StatusTag";
import { toDisplayMessage } from "@/api/error";
import {
  useAdminUsers,
  useBatchForceUserLogout,
  useBatchUpdateUserSecurity,
  useBatchUpdateUserStatus,
  useCreateUser,
  useDeleteUser,
  useForceUserLogout,
  useInviteUser,
  useReplaceUserRoles,
  useUpdateUser,
  useUpdateUserSecurity,
  type AdminUserRow,
  type EligibilityRow,
  type InviteResult,
} from "@/api/hooks/users";
import { useUserGroups } from "@/api/hooks/userGroups";
import { useUserRoles, useUserRoleEligibility } from "@/api/hooks/users";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";
import { UserDevicesDrawer } from "@/pages/users/UserDevicesDrawer";

/** 用户状态过滤值。 */
type StatusFilter = "1" | "0" | "-1" | "";

/** 部分成功结果的统一展示（验收项：批量操作部分成功结果展示）。 */
function notifyBatchResult(
  t: (key: string, opts?: Record<string, unknown>) => string,
  title: string,
  result: { total: number; succeededCount: number; failed: { guid: string; reason: string }[] },
): void {
  const summary = t("users.batchSummary", {
    total: result.total,
    success: result.succeededCount,
    failed: result.failed.length,
  });
  if (result.failed.length === 0) {
    Notification.success({ content: `${title}：${summary}`, duration: 4 });
    return;
  }
  const detail = result.failed.map((f) => `${f.guid.slice(0, 8)}…: ${f.reason}`).join("\n");
  Notification.warning({ content: `${title}：${summary}\n${detail}`, duration: 6 });
}

/**
 * 用户列表页。
 *
 * @returns 筛选栏 + 用户表格 + 批量操作 + 详情/编辑/安全/角色弹窗
 */
export function UserList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { can, isAdmin } = usePermission();
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [selectedGuids, setSelectedGuids] = useState<readonly string[]>([]);

  // 弹窗态：detail / edit / security / roles
  const [detailRow, setDetailRow] = useState<AdminUserRow | null>(null);
  // GAP2：用户名下设备抽屉（users.view 只读反查）。
  const [devicesRow, setDevicesRow] = useState<AdminUserRow | null>(null);
  const [editRow, setEditRow] = useState<AdminUserRow | null>(null);
  const [securityRow, setSecurityRow] = useState<AdminUserRow | null>(null);
  const [rolesRow, setRolesRow] = useState<AdminUserRow | null>(null);
  const [batchSecurityOpen, setBatchSecurityOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteDone, setInviteDone] = useState<InviteResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = useAdminUsers({
    ...pageParams,
    status: statusFilter === "" ? undefined : statusFilter,
    name: state.keyword.length > 0 ? state.keyword : undefined,
  });

  // 用户组下拉（需 user_groups.view；无权限时不请求）
  const canViewGroups = isAdmin || can("user_groups.view");
  const groupsQuery = useUserGroups(canViewGroups);

  const updateUser = useUpdateUser();
  const removeUser = useDeleteUser();
  const updateSecurity = useUpdateUserSecurity();
  const forceLogout = useForceUserLogout();
  const replaceRoles = useReplaceUserRoles();
  const batchStatus = useBatchUpdateUserStatus();
  const batchSecurity = useBatchUpdateUserSecurity();
  const batchSessions = useBatchForceUserLogout();
  const createUser = useCreateUser();
  const inviteUserMutation = useInviteUser();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const rows = query.data?.data ?? [];
  const statusText = (v: number): "enabled" | "disabled" | "active" =>
    v === 1 ? "enabled" : v === 0 ? "disabled" : "active";

  const columns: ColumnProps<AdminUserRow>[] = [
    { title: t("users.field.username"), dataIndex: "username", width: 140 },
    {
      title: t("users.field.displayName"),
      dataIndex: "display_name",
      width: 120,
      render: (v: string | undefined) => v || tc("state.noDescription"),
    },
    {
      title: t("users.field.email"),
      dataIndex: "email",
      width: 180,
      render: (v: string | undefined) => v || tc("state.noDescription"),
    },
    {
      title: t("users.field.userGroup"),
      dataIndex: "user_group_name",
      width: 130,
      render: (v: string | undefined) => v || tc("state.noDescription"),
    },
    {
      title: t("users.field.roles"),
      dataIndex: "role_names",
      width: 160,
      render: (v: string[] | undefined, row: AdminUserRow) =>
        row.is_admin || (v !== undefined && v.length > 0) ? (
          <div className="flex flex-wrap gap-1">
            {row.is_admin ? <Tag color="violet">{t("users.field.superAdmin")}</Tag> : null}
            {(v ?? []).map((name) => (
              <Tag key={name} color="blue">
                {name}
              </Tag>
            ))}
          </div>
        ) : (
          tc("state.noDescription")
        ),
    },
    {
      title: t("users.field.status"),
      dataIndex: "status",
      width: 90,
      render: (v: number) => <StatusTag status={statusText(v)} />,
    },
    {
      title: t("users.field.protected"),
      dataIndex: "is_protected",
      width: 90,
      render: (v: boolean) =>
        v ? <Tag color="orange">{t("users.field.protectedYes")}</Tag> : tc("state.noDescription"),
    },
    {
      title: tc("table.actions"),
      width: 330,
      render: (_v: unknown, row: AdminUserRow) => (
        <div className="flex items-center gap-1">
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.view"
            onClick={() => setDetailRow(row)}
          >
            {t("users.action.detail")}
          </PermissionButton>
          {/* GAP2：查看该用户名下设备（users.view） */}
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.view"
            onClick={() => setDevicesRow(row)}
          >
            {t("users.action.devices")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.edit"
            onClick={() => setEditRow(row)}
          >
            {t("users.action.edit")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.status"
            onClick={() =>
              updateUser.mutate(
                { guid: row.guid, body: { status: row.status === 1 ? 0 : 1 } },
                {
                  onSuccess: () => Notification.success({ content: t("users.statusUpdated") }),
                  onError,
                },
              )
            }
          >
            {row.status === 1 ? t("users.action.disable") : t("users.action.enable")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.security"
            onClick={() => setSecurityRow(row)}
          >
            {t("users.action.security")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="roles.assign"
            onClick={() => setRolesRow(row)}
          >
            {t("users.action.roles")}
          </PermissionButton>
          <PermissionButton
            size="small"
            theme="borderless"
            code="users.force_logout"
            onClick={() =>
              forceLogout.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("users.forcedLogout") }),
                onError,
              })
            }
          >
            {t("users.action.forceLogout")}
          </PermissionButton>
          <Popconfirm
            title={t("users.deleteConfirm")}
            onConfirm={() =>
              removeUser.mutate(row.guid, {
                onSuccess: () => Notification.success({ content: t("users.deleted") }),
                onError,
              })
            }
          >
            <PermissionButton size="small" theme="borderless" type="danger" code="users.delete">
              {t("users.action.delete")}
            </PermissionButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  /** 编辑提交（按字段分权：display_name/email/note → users.edit；status → users.status；组 → membership）。 */
  const submitEdit = (values: Record<string, unknown>): void => {
    if (!editRow) return;
    setSubmitting(true);
    updateUser.mutate(
      {
        guid: editRow.guid,
        body: {
          display_name: typeof values.display_name === "string" ? values.display_name : undefined,
          email:
            typeof values.email === "string" && values.email.length > 0 ? values.email : undefined,
          note: typeof values.note === "string" ? values.note : undefined,
          status: typeof values.status === "number" ? (values.status as -1 | 0 | 1) : undefined,
          user_group_guid:
            typeof values.user_group_guid === "string" && values.user_group_guid.length > 0
              ? values.user_group_guid
              : undefined,
        },
      },
      {
        onSuccess: () => {
          Notification.success({ content: t("users.updated") });
          setSubmitting(false);
          setEditRow(null);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };

  /** 新增用户提交（users.create；契约必填 username/email/name/password）。 */
  const submitCreate = (values: Record<string, unknown>): void => {
    setSubmitting(true);
    createUser.mutate(
      {
        username: String(values.username ?? ""),
        name: String(values.name ?? ""),
        email: String(values.email ?? ""),
        password: String(values.password ?? ""),
        note: typeof values.note === "string" && values.note.length > 0 ? values.note : undefined,
        user_group_guid:
          typeof values.user_group_guid === "string" && values.user_group_guid.length > 0
            ? values.user_group_guid
            : undefined,
      },
      {
        onSuccess: () => {
          Notification.success({ content: t("users.created") });
          setSubmitting(false);
          setCreating(false);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };
  /** 邀请用户提交（users.create 语义 + 组内成员资格；成功展示 message / 降级 token 链接）。 */
  const submitInvite = (values: Record<string, unknown>): void => {
    setSubmitting(true);
    inviteUserMutation.mutate(
      {
        email: String(values.email ?? ""),
        name: String(values.name ?? ""),
        display_name:
          typeof values.display_name === "string" && values.display_name.length > 0
            ? values.display_name
            : undefined,
        note: typeof values.note === "string" && values.note.length > 0 ? values.note : undefined,
        user_group_guid:
          typeof values.user_group_guid === "string" && values.user_group_guid.length > 0
            ? values.user_group_guid
            : undefined,
      },
      {
        onSuccess: (result) => {
          setSubmitting(false);
          setInviteDone(result);
          void query.refetch();
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };

  /** 安全设置提交（重置口令 / 2FA 强制 / 邮箱验证）。 */
  const submitSecurity = (values: Record<string, unknown>): void => {
    if (!securityRow) return;
    setSubmitting(true);
    updateSecurity.mutate(
      {
        guid: securityRow.guid,
        body: {
          new_password:
            typeof values.new_password === "string" && values.new_password.length > 0
              ? values.new_password
              : undefined,
          tfa_enforce: typeof values.tfa_enforce === "boolean" ? values.tfa_enforce : undefined,
          email_verification:
            typeof values.email_verification === "boolean" ? values.email_verification : undefined,
        },
      },
      {
        onSuccess: () => {
          Notification.success({ content: t("users.securityUpdated") });
          setSubmitting(false);
          setSecurityRow(null);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:users"
        extra={
          <div className="flex items-center gap-2">
            <PermissionButton
              icon={<IconPlus />}
              theme="solid"
              code="users.create"
              onClick={() => setCreating(true)}
            >
              {t("users.action.create")}
            </PermissionButton>
            <PermissionButton
              icon={<IconSend />}
              theme="light"
              code="users.create"
              onClick={() => {
                setInviteDone(null);
                setInviting(true);
              }}
            >
              {t("users.action.invite")}
            </PermissionButton>
            <PermissionButton
              icon={<IconRefresh />}
              theme="borderless"
              code="users.view"
              onClick={() => void query.refetch()}
            >
              {tc("action.refresh")}
            </PermissionButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("users.filter.name")} onSearch={setKeyword} />
        <Select
          value={statusFilter}
          style={{ width: 140 }}
          aria-label={t("users.field.status")}
          onChange={(v) => setStatusFilter(v as StatusFilter)}
          optionList={[
            { value: "", label: t("users.status.all") },
            { value: "1", label: t("users.status.active") },
            { value: "0", label: t("users.status.disabled") },
            { value: "-1", label: t("users.status.unverified") },
          ]}
        />
        {selectedGuids.length > 0 ? (
          <Tag color="blue">{t("users.selectedCount", { count: selectedGuids.length })}</Tag>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PermissionButton
          size="small"
          code="users.status"
          fallback="disable"
          disabled={selectedGuids.length === 0}
          onClick={() =>
            batchStatus.mutate(
              { guids: [...selectedGuids], status: 1 },
              { onSuccess: (r) => notifyBatchResult(t, t("users.batchEnableDone"), r), onError },
            )
          }
        >
          {t("users.action.batchEnable")}
        </PermissionButton>
        <PermissionButton
          size="small"
          code="users.status"
          fallback="disable"
          disabled={selectedGuids.length === 0}
          onClick={() =>
            batchStatus.mutate(
              { guids: [...selectedGuids], status: 0 },
              { onSuccess: (r) => notifyBatchResult(t, t("users.batchDisableDone"), r), onError },
            )
          }
        >
          {t("users.action.batchDisable")}
        </PermissionButton>
        <PermissionButton
          size="small"
          code="users.security"
          fallback="disable"
          disabled={selectedGuids.length === 0}
          onClick={() => setBatchSecurityOpen(true)}
        >
          {t("users.action.batchSecurity")}
        </PermissionButton>
        <PermissionButton
          size="small"
          code="users.force_logout"
          fallback="disable"
          disabled={selectedGuids.length === 0}
          onClick={() =>
            batchSessions.mutate([...selectedGuids], {
              onSuccess: () => Notification.success({ content: t("users.batchLogoutDone") }),
              onError,
            })
          }
        >
          {t("users.action.batchForceLogout")}
        </PermissionButton>
      </div>

      <DataTable<AdminUserRow>
        columns={columns}
        dataSource={rows}
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

      {/* 详情弹窗 */}
      <Modal
        title={t("users.detailTitle")}
        visible={detailRow !== null}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={560}
      >
        {detailRow !== null ? (
          <Descriptions
            data={[
              { key: t("users.field.username"), value: detailRow.username },
              {
                key: t("users.field.displayName"),
                value: detailRow.display_name || tc("state.noDescription"),
              },
              { key: t("users.field.email"), value: detailRow.email || tc("state.noDescription") },
              { key: t("users.field.guid"), value: detailRow.guid },
              {
                key: t("users.field.userGroup"),
                value: detailRow.user_group_name || tc("state.noDescription"),
              },
              {
                key: t("users.field.strategy"),
                value: detailRow.strategy_name || tc("state.noDescription"),
              },
              {
                key: t("users.field.roles"),
                value: detailRow.is_admin
                  ? t("users.field.superAdmin")
                  : detailRow.role_names.length > 0
                    ? detailRow.role_names.join(", ")
                    : tc("state.noDescription"),
              },
              {
                key: t("users.field.status"),
                value: <StatusTag status={statusText(detailRow.status)} />,
              },
              {
                key: t("users.field.protected"),
                value: detailRow.is_protected
                  ? t("users.field.protectedYes")
                  : tc("state.noDescription"),
              },
              {
                key: t("users.field.createdAt"),
                value: detailRow.created_at || tc("state.unknown"),
              },
            ]}
          />
        ) : null}
      </Modal>

      {/* 新增用户弹窗（契约：POST /api/users，required = username/email/name/password） */}
      <FormModal
        visible={creating}
        title={t("users.createTitle")}
        submitting={submitting}
        onClose={() => setCreating(false)}
        onSubmit={submitCreate}
        initialValues={{
          username: "",
          name: "",
          email: "",
          password: "",
          note: "",
          user_group_guid: "",
        }}
      >
        <Form.Input
          field="username"
          label={t("users.field.username")}
          maxLength={50}
          rules={[
            { required: true, message: t("users.error.usernameRequired") },
            { min: 3, message: t("users.error.usernameMin") },
          ]}
        />
        <Form.Input
          field="name"
          label={t("users.field.displayName")}
          maxLength={100}
          rules={[{ required: true, message: t("users.error.nameRequired") }]}
        />
        <Form.Input
          field="email"
          label={t("users.field.email")}
          type="email"
          rules={[{ required: true, message: t("users.error.emailRequired") }]}
        />
        <Form.Input
          field="password"
          label={t("users.field.password")}
          mode="password"
          placeholder={t("users.field.passwordPlaceholder")}
          rules={[
            { required: true, message: t("users.error.passwordRequired") },
            { min: 6, message: t("users.error.passwordMin") },
          ]}
        />
        <Form.TextArea field="note" label={t("users.field.note")} rows={2} maxCount={255} />
        <Form.Select
          field="user_group_guid"
          label={t("users.field.userGroup")}
          style={{ width: "100%" }}
          showClear
          optionList={(groupsQuery.data?.data ?? []).map((g) => ({ value: g.guid, label: g.name }))}
          placeholder={t("users.field.userGroupCreatePlaceholder")}
        />
      </FormModal>

      {/* 邀请用户弹窗（契约：POST /api/users/invite；邮件失败降级返回 token 明文） */}
      <FormModal
        visible={inviting && inviteDone === null}
        title={t("users.inviteTitle")}
        submitting={submitting}
        onClose={() => setInviting(false)}
        onSubmit={submitInvite}
        initialValues={{ name: "", display_name: "", email: "", note: "", user_group_guid: "" }}
      >
        <Banner
          type="info"
          closeIcon={null}
          description={t("users.inviteHint")}
          className="!mb-2"
        />
        <Form.Input
          field="name"
          label={t("users.field.username")}
          maxLength={100}
          rules={[
            { required: true, message: t("users.error.usernameRequired") },
            { min: 3, message: t("users.error.usernameMin") },
          ]}
        />
        <Form.Input field="display_name" label={t("users.field.displayName")} maxLength={100} />
        <Form.Input
          field="email"
          label={t("users.field.email")}
          type="email"
          rules={[{ required: true, message: t("users.error.emailRequired") }]}
        />
        <Form.TextArea field="note" label={t("users.field.note")} rows={2} maxCount={255} />
        <Form.Select
          field="user_group_guid"
          label={t("users.field.userGroup")}
          style={{ width: "100%" }}
          showClear
          optionList={(groupsQuery.data?.data ?? []).map((g) => ({ value: g.guid, label: g.name }))}
          placeholder={t("users.field.userGroupCreatePlaceholder")}
        />
      </FormModal>

      {/* 邀请结果弹窗（邮件发送失败时降级展示邀请链接供手动转交） */}
      <Modal
        title={t("users.inviteTitle")}
        visible={inviting && inviteDone !== null}
        onCancel={() => setInviting(false)}
        footer={null}
        width={560}
      >
        {inviteDone !== null ? (
          <div className="flex flex-col gap-3">
            <Banner type="success" closeIcon={null} description={inviteDone.message} />
            {typeof inviteDone.token === "string" && inviteDone.token.length > 0 ? (
              <div className="flex flex-col gap-1">
                <Typography.Text type="secondary">{t("users.inviteLinkHint")}</Typography.Text>
                <Typography.Text
                  copyable={{
                    content: `${window.location.origin}/invite/accept?token=${inviteDone.token}`,
                  }}
                >
                  {t("users.inviteLink")}
                </Typography.Text>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* 编辑弹窗 */}
      <FormModal
        visible={editRow !== null}
        title={t("users.editTitle")}
        submitting={submitting}
        onClose={() => setEditRow(null)}
        onSubmit={submitEdit}
        initialValues={
          editRow !== null
            ? {
                display_name: editRow.display_name ?? "",
                email: editRow.email ?? "",
                note: editRow.note ?? "",
                status: editRow.status,
                user_group_guid: editRow.user_group_guid ?? "",
              }
            : undefined
        }
      >
        <Form.Input field="display_name" label={t("users.field.displayName")} maxLength={64} />
        <Form.Input field="email" label={t("users.field.email")} type="email" />
        <Form.TextArea field="note" label={t("users.field.note")} rows={2} maxCount={255} />
        <Form.Select
          field="status"
          label={t("users.field.status")}
          style={{ width: "100%" }}
          optionList={[
            { value: 1, label: t("users.status.active") },
            { value: 0, label: t("users.status.disabled") },
            { value: -1, label: t("users.status.unverified") },
          ]}
        />
        <Form.Select
          field="user_group_guid"
          label={t("users.field.userGroup")}
          style={{ width: "100%" }}
          showClear
          optionList={(groupsQuery.data?.data ?? []).map((g) => ({ value: g.guid, label: g.name }))}
          placeholder={t("users.field.userGroupPlaceholder")}
        />
      </FormModal>

      {/* 安全设置弹窗 */}
      <FormModal
        visible={securityRow !== null}
        title={t("users.securityTitle", { name: securityRow?.username ?? "" })}
        submitting={submitting}
        onClose={() => setSecurityRow(null)}
        onSubmit={submitSecurity}
        initialValues={{ tfa_enforce: false, email_verification: false }}
      >
        <Form.Input
          field="new_password"
          label={t("users.field.newPassword")}
          mode="password"
          placeholder={t("users.field.newPasswordPlaceholder")}
        />
        <div className="flex items-center justify-between py-1">
          <span>{t("users.field.tfaEnforce")}</span>
          <Form.Switch field="tfa_enforce" aria-label={t("users.field.tfaEnforce")} />
        </div>
        <div className="flex items-center justify-between py-1">
          <span>{t("users.field.emailVerification")}</span>
          <Form.Switch field="email_verification" aria-label={t("users.field.emailVerification")} />
        </div>
      </FormModal>

      {/* 角色指派弹窗 */}
      {rolesRow !== null ? (
        <RolesAssignModal
          row={rolesRow}
          onClose={() => setRolesRow(null)}
          onSubmit={(assignments) => {
            replaceRoles.mutate(
              { guid: rolesRow.guid, body: { assignments } },
              {
                onSuccess: () => {
                  Notification.success({ content: t("users.rolesUpdated") });
                  setRolesRow(null);
                },
                onError,
              },
            );
          }}
        />
      ) : null}

      {/* 批量安全设置弹窗（部分成功结果展示） */}
      <FormModal
        visible={batchSecurityOpen}
        title={t("users.batchSecurityTitle", { count: selectedGuids.length })}
        submitting={submitting}
        onClose={() => setBatchSecurityOpen(false)}
        initialValues={{ tfa_enforce: false, email_verification: false }}
        onSubmit={(values: Record<string, unknown>) => {
          setSubmitting(true);
          batchSecurity.mutate(
            {
              guids: [...selectedGuids],
              new_password:
                typeof values.new_password === "string" && values.new_password.length > 0
                  ? values.new_password
                  : undefined,
              tfa_enforce: typeof values.tfa_enforce === "boolean" ? values.tfa_enforce : undefined,
              email_verification:
                typeof values.email_verification === "boolean"
                  ? values.email_verification
                  : undefined,
            },
            {
              onSuccess: () => {
                setSubmitting(false);
                setBatchSecurityOpen(false);
                Notification.success({ content: t("users.batchSecurityDone") });
              },
              onError: (err) => {
                onError(err);
                setSubmitting(false);
              },
            },
          );
        }}
      >
        <Form.Input
          field="new_password"
          label={t("users.field.newPassword")}
          mode="password"
          placeholder={t("users.field.newPasswordPlaceholder")}
        />
        <div className="flex items-center justify-between py-1">
          <span>{t("users.field.tfaEnforce")}</span>
          <Form.Switch field="tfa_enforce" aria-label={t("users.field.tfaEnforce")} />
        </div>
        <div className="flex items-center justify-between py-1">
          <span>{t("users.field.emailVerification")}</span>
          <Form.Switch field="email_verification" aria-label={t("users.field.emailVerification")} />
        </div>
      </FormModal>

      {/* GAP2：用户名下设备抽屉（关闭即清空目标，避免缓存按旧 guid 拉取） */}
      <UserDevicesDrawer
        user={devicesRow !== null ? { guid: devicesRow.guid, username: devicesRow.username } : null}
        onClose={() => setDevicesRow(null)}
      />
    </div>
  );
}

/** 角色指派弹窗属性。 */
interface RolesAssignModalProps {
  /** 目标用户行 */
  row: AdminUserRow;
  /** 关闭回调 */
  onClose: () => void;
  /** 提交回调（全量替换 assignments） */
  onSubmit: (
    assignments: {
      role_guid: string;
      scope_type: "global" | "device_group";
      device_group_guids?: string[];
    }[],
  ) => void;
}

/**
 * 角色指派弹窗。
 *
 * 依据资格矩阵（eligibility）展示可勾选角色；
 * device_group scope 的角色在此按 global 语义提交（组级分档由后端越权防护链复核）。
 */
function RolesAssignModal({ row, onClose, onSubmit }: RolesAssignModalProps) {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const rolesQuery = useUserRoles(row.guid);
  const eligibilityQuery = useUserRoleEligibility(row.guid);
  const [selected, setSelected] = useState<readonly string[]>([]);

  const currentRoles = useMemo(
    () => (rolesQuery.data?.data ?? []).map((a) => a.role_guid),
    [rolesQuery.data],
  );
  const effective = useMemo(
    () => (selected.length > 0 ? [...selected] : currentRoles),
    [selected, currentRoles],
  );

  return (
    <FormModal
      visible
      title={t("users.rolesTitle", { name: row.username })}
      onClose={onClose}
      okText={tc("action.submit")}
      onSubmit={() => {
        onSubmit(
          effective.map((roleGuid) => {
            // 资格矩阵缺行时保守按 global 提交（后端越权防护链兜底复核）
            return { role_guid: roleGuid, scope_type: "global" as const };
          }),
        );
      }}
    >
      <DataTable<EligibilityRow>
        columns={[
          { title: t("users.field.roleName"), dataIndex: "role_name" },
          {
            title: t("users.field.protected"),
            dataIndex: "protected_account",
            render: (v: boolean) =>
              v ? <Tag color="orange">{t("users.field.protectedYes")}</Tag> : "—",
          },
          {
            title: t("users.field.eligible"),
            dataIndex: "eligible",
            render: (v: boolean, r) =>
              v ? (
                <Tag color="green">{t("users.eligible.ok")}</Tag>
              ) : (
                <Tag color="red">{t(`users.eligible.${r.reason_code}`)}</Tag>
              ),
          },
        ]}
        dataSource={eligibilityQuery.data?.data}
        loading={eligibilityQuery.isLoading}
        rowKey="role_guid"
        rowSelection={{
          selectedRowKeys: [...effective],
          onChange: (keys) => setSelected(keys as string[]),
        }}
      />
    </FormModal>
  );
}
