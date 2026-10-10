/**
 * 告警审计页（M4-T06；路由 /audit/alarms，门槛 audit.view）。
 *
 * 契约：`GET /api/audits/alarm`（typ/uuid + 分页）；info 为 JSON 字符串原样落库，
 * 详情弹窗防御性 pretty-print（非法 JSON 原样展示）。
 */
import { useState } from "react";
import { Button, InputNumber, Modal, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import type { AlarmAuditRow } from "@/api/endpoints/audits";
import { useAlarmAudits } from "@/api/hooks/audits";
import { useTableQuery } from "@/hooks/useTableQuery";

/** info JSON 防御性 pretty-print（非法 JSON 原样返回）。 */
function prettyInfo(info: string | undefined): string {
  if (info === undefined || info.length === 0) return "";
  try {
    return JSON.stringify(JSON.parse(info), null, 2);
  } catch {
    return info;
  }
}

/**
 * 告警审计页。
 *
 * @returns 筛选栏 + 告警审计表格 + info 详情弹窗
 */
export function AlarmAudit() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [typFilter, setTypFilter] = useState<number | undefined>(undefined);
  const [detailRow, setDetailRow] = useState<AlarmAuditRow | null>(null);

  const query = useAlarmAudits({
    page: pageParams.current,
    pageSize: pageParams.pageSize,
    typ: typFilter,
    uuid: state.keyword.length > 0 ? state.keyword : undefined,
  });

  const columns: ColumnProps<AlarmAuditRow>[] = [
    { title: t("audit.field.deviceId"), dataIndex: "device_id", width: 150 },
    { title: t("audit.field.typ"), dataIndex: "typ", width: 100,
      render: (v: number) => <Tag>{t("audit.alarmTyp." + v, { defaultValue: String(v) })}</Tag> },
    { title: t("audit.field.connId"), dataIndex: "conn_id", width: 130,
      render: (v: string | undefined) => v || tc("state.noDescription") },
    { title: t("audit.field.createdAt"), dataIndex: "created_at", width: 170,
      render: (v: string | undefined) => (v ? new Date(v).toLocaleString() : tc("state.unknown")) },
    {
      title: tc("table.actions"),
      width: 100,
      render: (_v: unknown, row: AlarmAuditRow) => (
        <Button size="small" theme="borderless" onClick={() => setDetailRow(row)}>
          {t("audit.action.detail")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:auditAlarm"
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("audit.filter.uuid")} onSearch={setKeyword} value={state.keyword} />
        <InputNumber value={typFilter ?? undefined} style={{ width: 140 }} hideButtons
          placeholder={t("audit.field.typ")} aria-label={t("audit.field.typ")}
          onChange={(v) => setTypFilter(typeof v === "number" ? v : undefined)} />
        <Select value={typFilter !== undefined ? String(typFilter) : ""} style={{ width: 160 }} aria-label={t("audit.field.typ")}
          onChange={(v) => setTypFilter(v === "" || v === undefined ? undefined : Number(v))}
          optionList={[
            { value: "", label: t("audit.type.all") },
            { value: "0", label: t("audit.alarmTyp.0") },
            { value: "1", label: t("audit.alarmTyp.1") },
            { value: "2", label: t("audit.alarmTyp.2") },
          ]}
        />
      </div>

      <DataTable<AlarmAuditRow>
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

      <Modal title={t("audit.detailTitle")} visible={detailRow !== null}
        onCancel={() => setDetailRow(null)} footer={null} width={640}>
        {detailRow !== null ? (
          <pre className="max-h-[50vh] overflow-auto rounded bg-[var(--semi-color-fill-0)] p-3 text-xs whitespace-pre-wrap">
            {prettyInfo(detailRow.info)}
          </pre>
        ) : null}
      </Modal>
    </div>
  );
}
