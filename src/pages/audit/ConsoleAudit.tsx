/**
 * 控制台审计页（M4-T06；路由 /audit/console，门槛 audit.view）。
 *
 * 契约：`GET /api/audits/console`（result/user_guid + 分页）；before/after_state
 * 为原始 JSON 直出（空/非法为 null），详情弹窗防御性 pretty-print。
 */
import { useState } from "react";
import { Button, Modal, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import type { ConsoleAuditRow } from "@/api/endpoints/audits";
import { useConsoleAudits } from "@/api/hooks/audits";
import { useTableQuery } from "@/hooks/useTableQuery";

/** JSON 状态防御性 pretty-print（null/非法原样展示）。 */
function prettyState(state: unknown): string {
  if (state === null || state === undefined) return "—";
  try {
    return JSON.stringify(state, null, 2);
  } catch {
    return String(state);
  }
}

/**
 * 控制台审计页。
 *
 * @returns 筛选栏 + 审计表格 + before/after 详情弹窗
 */
export function ConsoleAudit() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setPage, setPageSize, pageParams } = useTableQuery();

  const [resultFilter, setResultFilter] = useState<"allowed" | "denied" | undefined>(undefined);
  const [userGuid, setUserGuid] = useState("");
  const [detailRow, setDetailRow] = useState<ConsoleAuditRow | null>(null);

  const query = useConsoleAudits({
    page: pageParams.current,
    pageSize: pageParams.pageSize,
    result: resultFilter,
    user_guid: userGuid.length > 0 ? userGuid : undefined,
  });

  const columns: ColumnProps<ConsoleAuditRow>[] = [
    { title: t("audit.field.actor"), dataIndex: "actor_user_name", width: 140,
      render: (v: string | null) => v || t("audit.systemAction") },
    { title: t("audit.field.targetType"), dataIndex: "target_type", width: 130 },
    { title: t("audit.field.actionName"), dataIndex: "action", width: 160 },
    { title: t("audit.field.result"), dataIndex: "result", width: 100,
      render: (v: ConsoleAuditRow["result"]) =>
        v === "allowed" ? <Tag color="green">{t("audit.result.allowed")}</Tag> : <Tag color="red">{t("audit.result.denied")}</Tag> },
    { title: t("audit.field.reason"), dataIndex: "reason",
      render: (v: string | null) => v || tc("state.noDescription") },
    { title: t("audit.field.createdAt"), dataIndex: "created_at", width: 170,
      render: (v: string) => new Date(v).toLocaleString() },
    {
      title: tc("table.actions"),
      width: 100,
      render: (_v: unknown, row: ConsoleAuditRow) => (
        <Button size="small" theme="borderless" onClick={() => setDetailRow(row)}>
          {t("audit.action.detail")}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:auditConsole"
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("audit.filter.userGuid")} onSearch={setUserGuid} value={userGuid} />
        <Select value={resultFilter ?? ""} style={{ width: 140 }} aria-label={t("audit.field.result")}
          onChange={(v) => setResultFilter(v === "" ? undefined : (v as "allowed" | "denied"))}
          optionList={[
            { value: "", label: t("audit.type.all") },
            { value: "allowed", label: t("audit.result.allowed") },
            { value: "denied", label: t("audit.result.denied") },
          ]}
        />
      </div>

      <DataTable<ConsoleAuditRow>
        columns={columns}
        dataSource={query.data?.data ?? []}
        loading={query.isLoading}
        total={query.data?.total ?? 0}
        page={state.page}
        pageSize={state.pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowKey="guid"
      />

      <Modal title={t("audit.detailTitle")} visible={detailRow !== null}
        onCancel={() => setDetailRow(null)} footer={null} width={720}>
        {detailRow !== null ? (
          <div className="flex flex-col gap-3">
            <div className="text-sm">
              <span className="font-medium">{t("audit.field.requestId")}：</span>
              {detailRow.request_id || tc("state.noDescription")}
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">{t("audit.field.beforeState")}</div>
              <pre className="max-h-[30vh] overflow-auto rounded bg-[var(--semi-color-fill-0)] p-3 text-xs whitespace-pre-wrap">
                {prettyState(detailRow.before_state)}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">{t("audit.field.afterState")}</div>
              <pre className="max-h-[30vh] overflow-auto rounded bg-[var(--semi-color-fill-0)] p-3 text-xs whitespace-pre-wrap">
                {prettyState(detailRow.after_state)}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
