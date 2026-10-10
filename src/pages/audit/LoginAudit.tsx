/**
 * 登录审计页（GAP2 设计 §3.5；路由 /audit/login，门槛 audit.view）。
 *
 * 契约：GET /api/audits/login（result 六枚举 / username LIKE / start/end
 * createdAt 闭区间 + 分页）；displayName 由后端 users LEFT JOIN 补齐。
 */
import { useState } from "react";
import { DatePicker, Select, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import type { ColumnProps } from "@douyinfe/semi-ui/lib/es/table";
import type { TagProps } from "@douyinfe/semi-ui/lib/es/tag";
import { Button } from "@douyinfe/semi-ui";
import { DataTable } from "@/components/DataTable";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import type { LoginAuditResult, LoginAuditRow } from "@/api/endpoints/audits";
import { useLoginAudits } from "@/api/hooks/audits";
import { useTableQuery } from "@/hooks/useTableQuery";

/** result → 彩色 Tag 映射（设计 §3.5：六枚举彩色 Tag）。 */
const RESULT_TAG_COLOR: Record<LoginAuditResult, NonNullable<TagProps["color"]>> = {
  success: "green",
  failed: "red",
  tfa_required: "blue",
  tfa_failed: "orange",
  mfa_enroll_required: "purple",
  mfa_enroll_completed: "cyan",
};

/** 全部 result 枚举选项（含「全部」）。 */
const RESULT_OPTIONS: Array<{ value: string; labelKey: string }> = [
  { value: "", labelKey: "auditLogin.result.all" },
  { value: "success", labelKey: "auditLogin.result.success" },
  { value: "failed", labelKey: "auditLogin.result.failed" },
  { value: "tfa_required", labelKey: "auditLogin.result.tfa_required" },
  { value: "tfa_failed", labelKey: "auditLogin.result.tfa_failed" },
  { value: "mfa_enroll_required", labelKey: "auditLogin.result.mfa_enroll_required" },
  { value: "mfa_enroll_completed", labelKey: "auditLogin.result.mfa_enroll_completed" },
];

/**
 * 登录审计页。
 *
 * @returns result/时间/用户筛选 + 审计表格
 */
export function LoginAudit() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const { state, setPage, setPageSize, pageParams } = useTableQuery();

  const [resultFilter, setResultFilter] = useState("");
  const [username, setUsername] = useState("");
  const [range, setRange] = useState<[Date, Date] | undefined>(undefined);

  const query = useLoginAudits({
    page: pageParams.current,
    pageSize: pageParams.pageSize,
    result: resultFilter.length > 0 ? resultFilter : undefined,
    username: username.length > 0 ? username : undefined,
    start: range ? range[0].toISOString() : undefined,
    end: range ? range[1].toISOString() : undefined,
  });

  const columns: ColumnProps<LoginAuditRow>[] = [
    { title: t("auditLogin.field.username"), dataIndex: "username", width: 150 },
    {
      title: t("auditLogin.field.displayName"),
      dataIndex: "displayName",
      width: 140,
      render: (v: string | null) => v ?? tc("state.noDescription"),
    },
    {
      title: t("auditLogin.field.result"),
      dataIndex: "result",
      width: 170,
      render: (v: LoginAuditResult) => (
        <Tag color={RESULT_TAG_COLOR[v] ?? "grey"}>{t(`auditLogin.result.${v}`)}</Tag>
      ),
    },
    { title: t("auditLogin.field.method"), dataIndex: "method", width: 110 },
    {
      title: t("auditLogin.field.ip"),
      dataIndex: "ip",
      width: 130,
      render: (v: string | null) => v || tc("state.noDescription"),
    },
    {
      title: t("auditLogin.field.userAgent"),
      dataIndex: "userAgent",
      render: (v: string | null) => v || tc("state.noDescription"),
    },
    {
      title: t("auditLogin.field.reason"),
      dataIndex: "reason",
      width: 150,
      render: (v: string | null) => v || tc("state.noDescription"),
    },
    {
      title: t("auditLogin.field.createdAt"),
      dataIndex: "createdAt",
      width: 170,
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        titleKey="menu:auditLogin"
        description={t("auditLogin.desc")}
        extra={
          <Button theme="borderless" icon={<IconRefresh />} onClick={() => void query.refetch()}>
            {tc("action.refresh")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <SearchBar placeholder={t("auditLogin.filter.username")} onSearch={setUsername} />
        <Select
          value={resultFilter}
          style={{ width: 200 }}
          aria-label={t("auditLogin.field.result")}
          onChange={(v) => setResultFilter(String(v))}
          optionList={RESULT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
        />
        <DatePicker
          type="dateTimeRange"
          value={range}
          onChange={(v) => setRange((v as [Date, Date] | undefined) ?? undefined)}
          aria-label={t("auditLogin.field.createdAt")}
          style={{ width: 380 }}
        />
      </div>

      <DataTable<LoginAuditRow>
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
    </div>
  );
}
