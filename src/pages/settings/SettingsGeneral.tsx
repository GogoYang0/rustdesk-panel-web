/**
 * 通用设置页（M4-T06；路由 /settings/general，门槛 is_admin）。
 *
 * 契约：GET /api/settings/general（8 键嵌套 DTO）；PUT watermarkEnabled 必填、
 * defaultLanguage ^[a-z]{2}-[A-Z]{2}$、jwtExpiryDays≥1、auditRetentionDays≥0（后端校验兜底）。
 */
import { Button, Form, Notification } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { toDisplayMessage } from "@/api/error";
import { useGeneralSettings, useUpdateGeneralSettings } from "@/api/hooks/settings";

/**
 * 通用设置页。
 *
 * @returns 设置表单（加载完成后回显）
 */
export function SettingsGeneral() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useGeneralSettings();
  const update = useUpdateGeneralSettings();

  const data = query.data;

  /** 提交（嵌套 DTO 拍平字段回填 UpdateGeneralSettings）。 */
  const submit = (values: Record<string, unknown>): void => {
    update.mutate(
      {
        watermarkEnabled: values.watermarkEnabled === true,
        defaultLanguage: typeof values.defaultLanguage === "string" ? values.defaultLanguage : undefined,
        jwtExpiryDays: typeof values.jwtExpiryDays === "number" ? values.jwtExpiryDays : undefined,
        auditRetentionDays: typeof values.auditRetentionDays === "number" ? values.auditRetentionDays : undefined,
        siteFrontendUrl:
          typeof values.siteFrontendUrl === "string" && values.siteFrontendUrl.length > 0
            ? values.siteFrontendUrl
            : undefined,
        siteBackendUrl:
          typeof values.siteBackendUrl === "string" && values.siteBackendUrl.length > 0
            ? values.siteBackendUrl
            : undefined,
        webauthnEnabled: typeof values.webauthnEnabled === "boolean" ? values.webauthnEnabled : undefined,
        webauthnRpName:
          typeof values.webauthnRpName === "string" && values.webauthnRpName.length > 0
            ? values.webauthnRpName
            : undefined,
      },
      {
        onSuccess: () => Notification.success({ content: t("settings.saved") }),
        onError: (err) => Notification.error({ content: toDisplayMessage(err), duration: 4 }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:settingsGeneral" description={t("settings.generalDesc")} />
      {data !== undefined ? (
        <Form
          initValues={{
            watermarkEnabled: data.watermarkEnabled,
            defaultLanguage: data.defaultLanguage,
            jwtExpiryDays: data.jwtExpiryDays,
            auditRetentionDays: data.auditRetentionDays,
            siteFrontendUrl: data.site?.frontendUrl ?? "",
            siteBackendUrl: data.site?.backendUrl ?? "",
            webauthnEnabled: data.webauthn?.enabled ?? false,
            webauthnRpName: data.webauthn?.rpName ?? "",
          }}
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={180}
          className="max-w-[640px]"
        >
          <Form.Switch field="watermarkEnabled" label={t("settings.field.watermarkEnabled")} />
          <Form.Select field="defaultLanguage" label={t("settings.field.defaultLanguage")} style={{ width: 220 }}
            optionList={[
              { value: "zh-CN", label: "简体中文" },
              { value: "en-US", label: "English" },
            ]}
          />
          <Form.InputNumber field="jwtExpiryDays" label={t("settings.field.jwtExpiryDays")} min={1} hideButtons style={{ width: 220 }} />
          <Form.InputNumber field="auditRetentionDays" label={t("settings.field.auditRetentionDays")} min={0} hideButtons style={{ width: 220 }} />
          <Form.Input field="siteFrontendUrl" label={t("settings.field.siteFrontendUrl")} />
          <Form.Input field="siteBackendUrl" label={t("settings.field.siteBackendUrl")} />
          <Form.Switch field="webauthnEnabled" label={t("settings.field.webauthnEnabled")} />
          <Form.Input field="webauthnRpName" label={t("settings.field.webauthnRpName")} />
          <Button htmlType="submit" theme="solid" loading={update.isPending} className="mt-2">
            {tc("action.save")}
          </Button>
        </Form>
      ) : query.isError ? (
        <div className="text-sm text-[var(--semi-color-danger)]">{toDisplayMessage(query.error)}</div>
      ) : null}
    </div>
  );
}
