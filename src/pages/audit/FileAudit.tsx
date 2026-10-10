/**
 * 文件审计页（M4-T06；路由 /audit/files，门槛 audit.view）。
 *
 * 契约：`GET /api/audits/file`（peer_id/uuid/type + 分页）；type 0=upload / 1=download。
 */
import { useState } from "react";
import { Button, Modal, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import type { FileAuditRow } from "@/api/endpoints/audits";
import { useFileAudits } from "@/api/hooks/audits";
import { useTableQuery } from "@/hooks/useTableQuery";

/**
 * 文件审计页。
 *
 * @returns 筛选栏 + 文件审计表格 + info 详情弹窗
 */
export function FileAudit() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setPage, setPageSize, setKeyword, pageParams } = useTableQuery();

  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);
  const [detailRow, setDetailRow] = useState<FileAuditRow | null>(null);

  const query = useFileAudits({
    page: pageParams.current,
    pageSize: pageParams.pageSize,
    peer_id: state.keyword.length > 0 ? state.keyword : undefined,
    type: typeFilter,
  });

  const columns: ColumnProps<FileAuditRow>[] = [
    { title: t("audit.field.deviceId"), dataIndex: "device_id", width: 150 },
    { title: t("audit.field.peerId"), dataIndex: "peer_id", width: 150 },
    { title: t("audit.field.fileType"), dataIndex: "type", width: 100,
      render: (v: number) =>
        v === 0 ? <Tag color="blue">{t("audit.fileType.upload")}</Tag> : <Tag color="cyan">{t("audit.fileType.download")}</Tag> },
    { title: t("audit.field.path"), dataIndex: "path",
      render: (v: string | undefined) => v || tc("state.noDescription") },
    { title: t("audit.field.isFile"), dataIndex: "is_file", width: 90,
      render: (v: boolean) => (v ? t("audit.fileKind.file") : t("audit.fileKind.dir")) },
    { title: t("audit.field.clientIp"), dataIndex: "client_ip", width: 130,
      render: (v: string | undefined) => v || tc("state.unknown") },
    { title: t("audit.field.createdAt"), dataIndex: "created_at", width: 170,
      render: (v: string | undefined) => (v ? new Date(v).toLocaleString() : tc("state.unknown")) },
    {
      title: tc("table.actions"),
      width: 100,
      render: (_v: unknown, row: FileAuditRow) => (
        <Button size="small" theme="borderless" onClick={() => setDetailRow(row)}>
          {t("audit.action.detail")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:auditFile"
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("audit.filter.peerId")} onSearch={setKeyword} value={state.keyword} />
        <Select value={typeFilter !== undefined ? String(typeFilter) : ""} style={{ width: 140 }} aria-label={t("audit.field.fileType")}
          onChange={(v) => setTypeFilter(v === "" || v === undefined ? undefined : Number(v))}
          optionList={[
            { value: "", label: t("audit.type.all") },
            { value: "0", label: t("audit.fileType.upload") },
            { value: "1", label: t("audit.fileType.download") },
          ]}
        />
      </div>

      <DataTable<FileAuditRow>
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
            {detailRow.info ?? tc("state.noDescription")}
          </pre>
        ) : null}
      </Modal>
    </div>
  );
}
