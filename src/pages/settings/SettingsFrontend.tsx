/**
 * 前端设置页（M4-T06；路由 /settings/frontend，门槛 is_admin）。
 *
 * 契约：GET /api/settings/frontend（Public；三键只读展示）+
 * GET /api/update-check（AdminGuard；返回 backend / frontend 双分支比对结果）。
 * 本页为只读展示页（前端公开设置由通用设置页维护，后端不提供 PUT /settings/frontend）。
 */
import { useState } from "react";
import { Button, Card, Descriptions, Tag } from "@douyinfe/semi-ui";
import { IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { toDisplayMessage } from "@/api/error";
import { useFrontendSettings, useUpdateCheck } from "@/api/hooks/settings";

/** 更新检查单分支（backend / frontend 共用结构）。 */
type UpdateBranch = {
  current: string;
  latest: string;
  hasUpdate: boolean;
  downloadUrl?: string;
};

/** 单分支 → 展示条目（含 hasUpdate Tag 与可选下载链接）。 */
function branchDescriptions(t: (k: string) => string, branch: UpdateBranch) {
  const items: { key: string; value: React.ReactNode }[] = [
    { key: t("settings.field.currentVersion"), value: branch.current || "—" },
    { key: t("settings.field.latestVersion"), value: branch.latest || "—" },
    {
      key: t("settings.field.hasUpdate"),
      value: branch.hasUpdate === true
        ? <Tag color="orange">{t("settings.updateAvailable")}</Tag>
        : <Tag color="green">{t("settings.updateUpToDate")}</Tag>,
    },
  ];
  if (typeof branch.downloadUrl === "string" && branch.downloadUrl.length > 0) {
    items.push({
      key: t("settings.field.downloadUrl"),
      value: (
        <a href={branch.downloadUrl} target="_blank" rel="noreferrer">
          {t("settings.action.download")}
        </a>
      ),
    });
  }
  return items;
}

/**
 * 前端设置页。
 *
 * @returns 三键只读展示 + 更新检查（backend / frontend 双分支）卡片
 */
export function SettingsFrontend() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useFrontendSettings();
  // 更新检查按需触发（enabled 由按钮控制，避免进页即打后端）
  const [checkEnabled, setCheckEnabled] = useState(false);
  const check = useUpdateCheck(undefined, checkEnabled);

  /** 触发一次更新检查。 */
  const runCheck = (): void => {
    setCheckEnabled(true);
    check.refetch().catch(() => undefined);
  };

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:settingsFrontend" description={t("settings.frontendDesc")} />

      {data !== undefined ? (
        <Card title={t("settings.frontendKeys")} className="max-w-[640px]">
          <Descriptions
            size="small"
            data={[
              { key: t("settings.field.watermarkEnabled"),
                value: data.watermarkEnabled === true ? tc("status.enabled") : tc("status.disabled") },
              { key: t("settings.field.defaultLanguage"), value: data.defaultLanguage ?? "—" },
              { key: t("settings.field.webauthnEnabled"),
                value: data.webauthnEnabled === true ? tc("status.enabled") : tc("status.disabled") },
            ]}
          />
        </Card>
      ) : query.isError ? (
        <div className="text-sm text-[var(--semi-color-danger)]">{toDisplayMessage(query.error)}</div>
      ) : null}

      <Card title={t("settings.updateCheck")} className="max-w-[640px]">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button icon={<IconRefresh />} loading={check.isFetching} onClick={runCheck}>
              {t("settings.action.checkUpdate")}
            </Button>
            {check.isError
              ? <span className="text-sm text-[var(--semi-color-danger)]">{toDisplayMessage(check.error)}</span>
              : null}
          </div>
          {check.data !== undefined ? (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium">{t("settings.backendBranch")}</div>
              <Descriptions size="small" data={branchDescriptions(t, check.data.backend)} />
              <div className="text-sm font-medium">{t("settings.frontendBranch")}</div>
              <Descriptions size="small" data={branchDescriptions(t, check.data.frontend)} />
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
