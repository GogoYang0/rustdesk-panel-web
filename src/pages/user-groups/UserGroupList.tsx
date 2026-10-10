/**
 * 用户组列表页（M4-T06，路由门槛 user_groups.view）。
 *
 * 契约要点：
 * - 删除响应 `DeleteUserGroupResult`：`moved_user_count`（成员回落默认组）+
 *   **deleted_rule_count**（级联删除的地址簿共享规则数），两者都必须提示（验收项）；
 * - 默认组禁删（按钮禁用 + 后端 400 兜底）；
 * - 成员管理：成员分页 + 「移动用户到组」（POST body {user_guids[]}，响应 moved_user_count）；
 *   移出成员 = 移动到其它组（契约无独立移除端点）。
 */
import { useMemo, useState } from "react";
import { Form, Modal, Notification, Popconfirm, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import { toDisplayMessage } from "@/api/error";
import { useAdminUsers } from "@/api/hooks/users";
import {
  useAddUserGroupMembers,
  useCreateUserGroup,
  useDeleteUserGroup,
  useUpdateUserGroup,
  useUserGroupMembers,
  useUserGroups,
  type MemberView,
  type UserGroupView,
} from "@/api/hooks/userGroups";
import { useTableQuery } from "@/hooks/useTableQuery";

/**
 * 用户组列表页。
 *
 * @returns 用户组表格 + 组 CRUD 弹窗 + 成员管理弹窗
 */
export function UserGroupList() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  // 用户组为全量列表（契约无分页参数），仅用关键字做客户端过滤
  const { state, setKeyword } = useTableQuery({ pageSize: 100 });

  const [editRow, setEditRow] = useState<UserGroupView | null>(null);
  const [creating, setCreating] = useState(false);
  const [membersRow, setMembersRow] = useState<UserGroupView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const query = useUserGroups();
  // 客户端按 name 过滤（契约列表端点无过滤参数）
  const rows = useMemo(() => {
    const all = query.data?.data ?? [];
    const kw = state.keyword.toLowerCase();
    return kw.length === 0 ? all : all.filter((g) => g.name.toLowerCase().includes(kw));
  }, [query.data, state.keyword]);

  const createGroup = useCreateUserGroup();
  const updateGroup = useUpdateUserGroup();
  const removeGroup = useDeleteUserGroup();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const submitUpsert = (values: Record<string, unknown>): void => {
    const body = {
      name: String(values.name ?? ""),
      note: typeof values.note === "string" ? values.note : undefined,
    };
    setSubmitting(true);
    if (editRow !== null) {
      updateGroup.mutate(
        { guid: editRow.guid, body },
        {
          onSuccess: () => {
            Notification.success({ content: t("userGroups.updated") });
            setSubmitting(false);
            setEditRow(null);
          },
          onError: (err) => {
            onError(err);
            setSubmitting(false);
          },
        },
      );
    } else {
      createGroup.mutate(body, {
        onSuccess: () => {
          Notification.success({ content: t("userGroups.created") });
          setSubmitting(false);
          setCreating(false);
        },
        onError: (err) => {
          onError(err);
          setSubmitting(false);
        },
      });
    }
  };

  const columns: ColumnProps<UserGroupView>[] = [
    { title: t("userGroups.field.name"), dataIndex: "name", width: 200 },
    { title: t("userGroups.field.note"), dataIndex: "note",
      render: (v: string) => (v.length > 0 ? v : tc("state.noDescription")) },
    { title: t("userGroups.field.isDefault"), dataIndex: "is_default", width: 110,
      render: (v: boolean) => (v ? <Tag color="blue">{t("userGroups.field.defaultYes")}</Tag> : "—") },
    { title: t("userGroups.field.userCount"), dataIndex: "user_count", width: 110 },
    {
      title: tc("table.actions"),
      width: 220,
      render: (_v: unknown, row: UserGroupView) => (
        <div className="flex items-center gap-1">
          <PermissionButton size="small" theme="borderless" code="user_groups.membership"
            onClick={() => setMembersRow(row)}>
            {t("userGroups.action.members")}
          </PermissionButton>
          <PermissionButton size="small" theme="borderless" code="user_groups.edit"
            onClick={() => setEditRow(row)}>
            {t("userGroups.action.edit")}
          </PermissionButton>
          <Popconfirm
            title={t("userGroups.deleteConfirm")}
            onConfirm={() =>
              removeGroup.mutate(row.guid, {
                onSuccess: (r) =>
                  Notification.success({
                    content: t("userGroups.deletedWithRules", {
                      moved: r.moved_user_count,
                      rules: r.deleted_rule_count,
                    }),
                    duration: 5,
                  }),
                onError,
              })
            }
          >
            <PermissionButton size="small" theme="borderless" type="danger"
              code="user_groups.delete" disabled={row.is_default}>
              {t("userGroups.action.delete")}
            </PermissionButton>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:userGroups"
        extra={
          <>
            <PermissionButton theme="borderless" code="user_groups.view"
              icon={<IconRefresh />} onClick={() => void query.refetch()}>
              {tc("action.refresh")}
            </PermissionButton>
            <PermissionButton theme="solid" code="user_groups.create" onClick={() => setCreating(true)}>
              {t("userGroups.action.create")}
            </PermissionButton>
          </>
        }
      />

      <SearchBar placeholder={t("userGroups.filter.name")} onSearch={setKeyword} value={state.keyword} />

      <DataTable<UserGroupView>
        columns={columns}
        dataSource={rows}
        loading={query.isLoading}
        rowKey="guid"
      />

      <FormModal
        visible={creating || editRow !== null}
        title={editRow !== null ? t("userGroups.editTitle") : t("userGroups.createTitle")}
        submitting={submitting}
        onClose={() => {
          setCreating(false);
          setEditRow(null);
        }}
        onSubmit={submitUpsert}
        initialValues={editRow !== null ? { name: editRow.name, note: editRow.note } : undefined}
      >
        <Form.Input field="name" label={t("userGroups.field.name")} rules={[{ required: true }]} maxLength={64} />
        <Form.TextArea field="note" label={t("userGroups.field.note")} rows={2} maxCount={255} />
      </FormModal>

      {membersRow !== null ? (
        <MembersModal group={membersRow} onClose={() => setMembersRow(null)} />
      ) : null}
    </div>
  );
}

/** 成员管理弹窗属性。 */
interface MembersModalProps {
  /** 目标用户组 */
  group: UserGroupView;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 成员管理弹窗：成员分页表 + 候选用户多选移入。
 */
function MembersModal({ group, onClose }: MembersModalProps) {
  const { t } = useTranslation("pages");
  const { state, setPage, setPageSize, setKeyword } = useTableQuery();

  const [candidates, setCandidates] = useState<readonly string[]>([]);

  const membersQuery = useUserGroupMembers(group.guid, {
    current: state.page,
    pageSize: state.pageSize,
    search: state.keyword.length > 0 ? state.keyword : undefined,
  });

  // 候选用户（管理员分页，一次拉 100 条供下拉选择；移动端点由后端 membership 复核）
  const candidatesQuery = useAdminUsers({ current: 1, pageSize: 100 });

  const moveMembers = useAddUserGroupMembers();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<MemberView>[] = [
    { title: t("userGroups.field.memberName"), dataIndex: "username", width: 140 },
    { title: t("users.field.displayName"), dataIndex: "display_name", width: 120 },
    { title: t("users.field.email"), dataIndex: "email" },
  ];

  return (
    <Modal title={t("userGroups.membersTitle", { name: group.name })} visible width={720}
      onCancel={onClose} footer={null}>
      <div className="flex flex-col gap-3">
        <SearchBar placeholder={t("userGroups.filter.member")} onSearch={setKeyword} value={state.keyword} />
        <DataTable<MemberView>
          columns={columns}
          dataSource={membersQuery.data?.data}
          loading={membersQuery.isLoading}
          total={membersQuery.data?.total ?? 0}
          page={state.page}
          pageSize={state.pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowKey="guid"
        />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{t("userGroups.candidateTitle")}</span>
          <Select multiple filter maxTagCount={4} style={{ minWidth: 320 }} placeholder={t("userGroups.candidatePlaceholder")}
            value={[...candidates]}
            onChange={(v) => setCandidates(v as string[])}
            optionList={(candidatesQuery.data?.data ?? []).map((u) => ({ value: u.guid, label: u.username }))}
          />
          <PermissionButton theme="solid" size="small" code="user_groups.membership"
            disabled={candidates.length === 0}
            onClick={() =>
              moveMembers.mutate(
                { guid: group.guid, userGuids: candidates },
                {
                  onSuccess: (r) => {
                    Notification.success({
                      content: t("userGroups.membersMoved", { count: r.moved_user_count }),
                    });
                    setCandidates([]);
                    void membersQuery.refetch();
                  },
                  onError,
                },
              )
            }>
            {t("userGroups.action.moveIn", { count: candidates.length })}
          </PermissionButton>
          <span className="text-sm text-[var(--semi-color-text-2)]">
            {t("userGroups.membersHint", { count: membersQuery.data?.total ?? 0 })}
          </span>
        </div>
      </div>
    </Modal>
  );
}
