/**
 * 共享通讯录页（M4-T06；路由 /address-book/shared，address_books.view 语义由后端复核）。
 *
 * 主从布局：上方共享地址簿分页（owner/规则并集取最大 rule），选中后下方展示
 * 联系人区块（AbPeersSection，editable = is_owner 或 rule = FULL_CONTROL）；
 * 「被共享给我」列表（sharedOnly 形态）一并展示。新建/编辑/删除走
 * address_books.share / address_books.edit 守卫。
 */
import { useState } from "react";
import { Form, Notification, Popconfirm, Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { PermissionButton } from "@/components/PermissionButton";
import { SearchBar } from "@/components/SearchBar";
import { toDisplayMessage } from "@/api/error";
import type { SharedBookRow } from "@/api/endpoints/addressBook";
import { useAbBookMutation, useSharedBooks, useSharedWithMe } from "@/api/hooks/addressBook";
import { useTableQuery } from "@/hooks/useTableQuery";
import { AbPeersSection } from "@/pages/address-book/AbCommon";

/** 行 rule → 展示 key。 */
function ruleLabelKey(rule: SharedBookRow["rule"]): string {
  return rule === 3 ? "addressBook.rule.fullControl" : rule === 2 ? "addressBook.rule.readWrite" : "addressBook.rule.read";
}

/**
 * 共享通讯录页。
 *
 * @returns 书列表（master）+ 联系人区块（detail）+ 建书/编辑/删除弹窗
 */
export function SharedAb() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setKeyword } = useTableQuery();

  const [selected, setSelected] = useState<SharedBookRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [editRow, setEditRow] = useState<SharedBookRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const booksQuery = useSharedBooks({
    current: 1,
    pageSize: 100,
    name: state.keyword.length > 0 ? state.keyword : undefined,
  });
  const withMeQuery = useSharedWithMe();
  const bookMutation = useAbBookMutation();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  /** 建书 / 编辑提交。 */
  const submitUpsert = (values: Record<string, unknown>): void => {
    const name = String(values.name ?? "");
    const note = typeof values.note === "string" && values.note.length > 0 ? values.note : undefined;
    const password = typeof values.password === "string" && values.password.length > 0 ? values.password : undefined;
    setSubmitting(true);
    if (editRow !== null) {
      bookMutation.mutate(
        { op: "updateShared", body: { guid: editRow.guid, name, note, password } },
        {
          onSuccess: () => {
            Notification.success({ content: t("addressBook.bookUpdated") });
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
      bookMutation.mutate(
        { op: "createShared", body: { name, note, password } },
        {
          onSuccess: () => {
            Notification.success({ content: t("addressBook.bookCreated") });
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

  const columns: ColumnProps<SharedBookRow>[] = [
    { title: t("addressBook.field.bookName"), dataIndex: "name", width: 180 },
    { title: t("addressBook.field.owner"), dataIndex: "owner", width: 140 },
    { title: t("addressBook.field.note"), dataIndex: "note",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    { title: t("addressBook.field.ruleLevel"), dataIndex: "rule", width: 130,
      render: (v: SharedBookRow["rule"]) => <Tag color={v === 3 ? "green" : v === 2 ? "blue" : "grey"}>{t(ruleLabelKey(v))}</Tag> },
    {
      title: tc("table.actions"),
      width: 220,
      render: (_v: unknown, row: SharedBookRow) => (
        <div className="flex items-center gap-1">
          <PermissionButton size="small" theme="borderless" code="address_books.view"
            onClick={() => setSelected(row)}>
            {t("addressBook.action.detail")}
          </PermissionButton>
          {row.is_owner ? (
            <PermissionButton size="small" theme="borderless" code="address_books.edit"
              onClick={() => setEditRow(row)}>
              {t("addressBook.action.edit")}
            </PermissionButton>
          ) : null}
          {row.is_owner ? (
            <Popconfirm title={t("addressBook.bookDeleteConfirm")} onConfirm={() =>
              bookMutation.mutate({ op: "deleteShared", guids: [row.guid] }, {
                onSuccess: () => {
                  Notification.success({ content: t("addressBook.bookDeleted") });
                  if (selected?.guid === row.guid) setSelected(null);
                },
                onError,
              })}>
              <PermissionButton size="small" theme="borderless" type="danger" code="address_books.share">
                {t("addressBook.action.delete")}
              </PermissionButton>
            </Popconfirm>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:abShared"
        extra={
          <PermissionButton theme="solid" code="address_books.share" onClick={() => setCreating(true)}>
            {t("addressBook.action.createBook")}
          </PermissionButton>
        }
      />

      <SearchBar placeholder={t("addressBook.filter.bookName")} onSearch={setKeyword} value={state.keyword} />

      <DataTable<SharedBookRow>
        columns={columns}
        dataSource={booksQuery.data?.data ?? []}
        loading={booksQuery.isLoading}
        rowKey="guid"
      />

      {selected !== null ? (
        <div className="flex flex-col gap-2 rounded border border-[var(--semi-color-border)] p-3">
          <div className="text-base font-medium">
            {t("addressBook.selectedBook", { name: selected.name })}
          </div>
          <AbPeersSection abGuid={selected.guid} editable={selected.is_owner === true || selected.rule === 3} />
        </div>
      ) : null}

      {withMeQuery.data !== undefined && withMeQuery.data.data.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="text-sm text-[var(--semi-color-text-2)]">{t("addressBook.sharedWithMe")}</div>
          <div className="flex flex-wrap gap-2">
            {withMeQuery.data.data.map((b) => (
              <Tag key={b.guid} color="cyan" onClick={() => setSelected(b)} style={{ cursor: "pointer" }}>
                {b.name}
              </Tag>
            ))}
          </div>
        </div>
      ) : null}

      <FormModal
        visible={creating || editRow !== null}
        title={editRow !== null ? t("addressBook.bookEditTitle") : t("addressBook.bookCreateTitle")}
        submitting={submitting}
        onClose={() => {
          setCreating(false);
          setEditRow(null);
        }}
        onSubmit={submitUpsert}
        initialValues={editRow !== null ? { name: editRow.name, note: editRow.note ?? "" } : undefined}
      >
        <Form.Input field="name" label={t("addressBook.field.bookName")} rules={[{ required: true }]} maxLength={64} />
        <Form.TextArea field="note" label={t("addressBook.field.note")} rows={2} maxCount={255} />
        <Form.Input field="password" label={t("addressBook.field.password")} mode="password"
          placeholder={t("addressBook.field.passwordPlaceholder")} />
      </FormModal>
    </div>
  );
}
