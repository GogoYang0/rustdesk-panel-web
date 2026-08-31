/**
 * 连接审计页（M4-T06；路由 /audit/connections，门槛 audit.view）。
 *
 * 契约：`GET /api/audits/conn`（peer_id/uuid/type/start/end + 分页）；
 * 备注修改走 `PATCH /api/audits/conn/{id}`（SuperAdmin，is_admin 判定按钮）。
 * 时间过滤用 Semi DatePicker（dateRange，已查证），出网转 ISO 字符串。
 */
import { useState } from "react";
import { Button, DatePicker, Form, Modal, Notification, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { FormModal } from "@/components/FormModal";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { toDisplayMessage } from "@/api/error";
import type { ConnAuditRow } from "@/api/endpoints/audits";
import { useConnAudits, useUpdateConnAuditNote } from "@/api/hooks/audits";
import { useTableQuery } from "@/hooks/useTableQuery";
import { usePermission } from "@/hooks/usePermission";

/**
 * 连接审计页。
 *
 * @returns 筛选栏 + 审计表格 + 备注编辑弹窗（SuperAdmin）
 */
export function ConnAudit() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { isAdmin } = usePermission();
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);
  const [range, setRange] = useState<[Date, Date] | null>(null);
  const [noteRow, setNoteRow] = useState<ConnAuditRow | null>(null);
  const [detailRow, setDetailRow] = useState<ConnAuditRow | null>(null);

  const query = useConnAudits({
    page: pageParams.current,
    pageSize: pageParams.pageSize,
    peer_id: state.keyword.length > 0 ? state.keyword : undefined,
    type: typeFilter,
    start: range !== null ? range[0].toISOString() : undefined,
    end: range !== null ? range[1].toISOString() : undefined,
  });

  const noteMutation = useUpdateConnAuditNote();

  const onError = (err: unknown): void => {
    Notification.error({ content: toDisplayMessage(err), duration: 4 });
  };

  const columns: ColumnProps<ConnAuditRow>[] = [
    { title: t("audit.field.deviceId"), dataIndex: "device_id", width: 150 },
    { title: t("audit.field.connId"), dataIndex: "conn_id", width: 120,
      render: (v: string) => (v.length > 12 ? `${v.slice(0, 12)}…` : v) },
    { title: t("audit.field.ip"), dataIndex: "ip", width: 130,
      render: (v: string | undefined) => v || tc("state.unknown") },
    { title: t("audit.field.action"), dataIndex: "action", width: 110,
      render: (v: string) => <Tag color={v === "established" ? "green" : "blue"}>{v}</Tag> },
    { title: t("audit.field.requestedAt"), dataIndex: "requested_at", width: 170,
      render: (v: string) => new Date(v).toLocaleString() },
    { title: t("audit.field.closedAt"), dataIndex: "closed_at", width: 170,
      render: (v: string | undefined) => (v ? new Date(v).toLocaleString() : "—") },
    { title: t("audit.field.note"), dataIndex: "note",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    {
      title: tc("table.actions"),
      width: 150,
      render: (_v: unknown, row: ConnAuditRow) => (
        <div className="flex items-center gap-1">
          <Button size="small" theme="borderless" onClick={() => setDetailRow(row)}>
            {t("audit.action.detail")}
          </Button>
          {isAdmin ? (
            <Button size="small" theme="borderless" onClick={() => setNoteRow(row)}>
              {t("audit.action.editNote")}
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:auditConn"
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("audit.filter.peerId")} onSearch={setKeyword} value={state.keyword} />
        <Select value={typeFilter !== undefined ? String(typeFilter) : ""} style={{ width: 140 }} aria-label={t("audit.field.type")}
          onChange={(v) => setTypeFilter(v === "" || v === undefined ? undefined : Number(v))}
          optionList={[
            { value: "", label: t("audit.type.all") },
            { value: "0", label: t("audit.type.direct") },
            { value: "1", label: t("audit.type.relay") },
          ]}
        />
        <DatePicker type="dateRange" density="compact" aria-label={t("audit.filter.range")}
          onChange={(v) => setRange((v as [Date, Date] | null) ?? null)} />
      </div>

      <DataTable<ConnAuditRow>
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isLoading}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="id"
      />

      {/* 详情弹窗 */}
      <Modal title={t("audit.detailTitle")} visible={detailRow !== null}
        onCancel={() => setDetailRow(null)} footer={null} width={560}>
        {detailRow !== null ? (
          <Form labelPosition="left" labelWidth={140}>
            <Form.Slot label={t("audit.field.deviceId")}>{detailRow.device_id}</Form.Slot>
            <Form.Slot label={t("audit.field.connId")}>{detailRow.conn_id}</Form.Slot>
            <Form.Slot label={t("audit.field.sessionId")}>{detailRow.session_id || tc("state.noDescription")}</Form.Slot>
            <Form.Slot label={t("audit.field.ip")}>{detailRow.ip || tc("state.unknown")}</Form.Slot>
            <Form.Slot label={t("audit.field.peer")}>
              {Array.isArray(detailRow.peer) && detailRow.peer.length > 0 ? detailRow.peer.join(" → ") : "—"}
            </Form.Slot>
            <Form.Slot label={t("audit.field.requestedAt")}>{new Date(detailRow.requested_at).toLocaleString()}</Form.Slot>
            <Form.Slot label={t("audit.field.establishedAt")}>
              {detailRow.established_at ? new Date(detailRow.established_at).toLocaleString() : "—"}
            </Form.Slot>
            <Form.Slot label={t("audit.field.closedAt")}>
              {detailRow.closed_at ? new Date(detailRow.closed_at).toLocaleString() : "—"}
            </Form.Slot>
            <Form.Slot label={t("audit.field.note")}>{detailRow.note || tc("state.noDescription")}</Form.Slot>
          </Form>
        ) : null}
      </Modal>

      {/* 备注编辑弹窗（SuperAdmin） */}
      <FormModal
        visible={noteRow !== null}
        title={t("audit.noteTitle")}
        onClose={() => setNoteRow(null)}
        initialValues={{ note: noteRow?.note ?? "" }}
        onSubmit={(values: Record<string, unknown>) => {
          if (noteRow === null) return;
          noteMutation.mutate(
            { id: noteRow.id, note: String(values.note ?? "") },
            {
              onSuccess: () => {
                Notification.success({ content: t("audit.noteUpdated") });
                setNoteRow(null);
              },
              onError,
            },
          );
        }}
      >
        <Form.TextArea field="note" label={t("audit.field.note")} rows={3} maxCount={255} />
      </FormModal>
    </div>
  );
}
