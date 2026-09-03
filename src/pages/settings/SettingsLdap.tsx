/**
 * LDAP 设置页（M4-T06；路由 /settings/ldap，门槛 is_admin）。
 *
 * ★ 掩码回读保真：`bindCredentials` 回读恒 `'******'`，不回显（初值空 +
 * placeholder 提示）；提交经 `stripMasked` 不回传掩码；测试恒 200。
 * urls / searchAttributes / adminGroups 为数组契约，UI 用每行一项的 TextArea。
 */
import { useEffect, useState } from "react";
import { Button, Form, Notification } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { isApiError, toDisplayMessage } from "@/api/error";
import { isMasked, stripMasked, type LdapConfig } from "@/api/endpoints/settings";
import { useLdapSettings, useTestLdapSettings, useUpdateLdapSettings } from "@/api/hooks/settings";

/** 多行文本 → 数组（去空行与首尾空白）。 */
function linesToArray(value: unknown): string[] | undefined {
  if (typeof value !== "string") return undefined;
  const items = value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return items.length > 0 ? items : undefined;
}

/**
 * LDAP 设置页。
 *
 * @returns LDAP 表单（掩码不回显）+ 测试按钮
 */
export function SettingsLdap() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useLdapSettings();
  const update = useUpdateLdapSettings();
  const test = useTestLdapSettings();
  const [hasStored, setHasStored] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const data = query.data;
  const notConfigured = query.isError && isApiError(query.error) && query.error.statusCode === 404;
  const configured = data !== undefined && !notConfigured;

  useEffect(() => {
    if (configured) setHasStored(true);
  }, [configured]);

  /** 保存（bindCredentials 空串/掩码 → undefined）。 */
  const submit = (values: Record<string, unknown>): void => {
    setSubmitting(true);
    const body: LdapConfig = {
      urls: linesToArray(values.urls),
      bindDN: typeof values.bindDN === "string" && values.bindDN.length > 0 ? values.bindDN : undefined,
      bindCredentials: stripMasked(
        typeof values.bindCredentials === "string" ? values.bindCredentials : undefined,
      ),
      searchBase: typeof values.searchBase === "string" && values.searchBase.length > 0 ? values.searchBase : undefined,
      searchFilter:
        typeof values.searchFilter === "string" && values.searchFilter.length > 0 ? values.searchFilter : undefined,
      searchAttributes: linesToArray(values.searchAttributes),
      groupSearchBase:
        typeof values.groupSearchBase === "string" && values.groupSearchBase.length > 0
          ? values.groupSearchBase
          : undefined,
      groupSearchFilter:
        typeof values.groupSearchFilter === "string" && values.groupSearchFilter.length > 0
          ? values.groupSearchFilter
          : undefined,
      adminGroups: linesToArray(values.adminGroups),
      enabled: values.enabled === true,
    };
    update.mutate(body, {
      onSuccess: () => {
        Notification.success({ content: t("settings.saved") });
        setSubmitting(false);
        setHasStored(true);
      },
      onError: (err) => {
        Notification.error({ content: toDisplayMessage(err), duration: 4 });
        setSubmitting(false);
      },
    });
  };

  /** 连接测试（恒 200）。 */
  const runTest = (): void => {
    test.mutate(undefined, {
      onSuccess: (r) => {
        if (r.success) {
          Notification.success({ content: `${t("settings.testDone")}：${r.message}` });
        } else {
          Notification.warning({ content: `${t("settings.testFailed")}：${r.message}`, duration: 6 });
        }
      },
      onError: (err) => Notification.error({ content: toDisplayMessage(err), duration: 4 }),
    });
  };

  /** 已配置形态的表单初值（bindCredentials 掩码不回显 → 空串）。 */
  const storedInitValues: Record<string, unknown> | undefined =
    data === undefined
      ? undefined
      : {
          urls: (data.urls ?? []).join("\n"),
          bindDN: data.bindDN ?? "",
          bindCredentials: "",
          searchBase: data.searchBase ?? "",
          searchFilter: data.searchFilter ?? "",
          searchAttributes: (data.searchAttributes ?? []).join("\n"),
          groupSearchBase: data.groupSearchBase ?? "",
          groupSearchFilter: data.groupSearchFilter ?? "",
          adminGroups: (data.adminGroups ?? []).join("\n"),
          enabled: data.enabled ?? false,
        };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:settingsLdap" description={t("settings.ldapDesc")} />
      {configured && storedInitValues !== undefined ? (
        <Form
          initValues={storedInitValues}
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={180}
          className="max-w-[660px]"
        >
          <Form.TextArea field="urls" label={t("settings.field.ldapUrls")} rows={2}
            placeholder="ldaps://ldap.example.com:636" />
          <Form.Input field="bindDN" label={t("settings.field.ldapBindDN")} />
          <Form.Input field="bindCredentials" label={t("settings.field.ldapBindCredentials")} mode="password"
            placeholder={hasStored && isMasked(data?.bindCredentials) ? t("settings.field.maskedHint") : undefined} />
          <Form.Input field="searchBase" label={t("settings.field.ldapSearchBase")} />
          <Form.Input field="searchFilter" label={t("settings.field.ldapSearchFilter")} />
          <Form.TextArea field="searchAttributes" label={t("settings.field.ldapSearchAttributes")} rows={2} />
          <Form.Input field="groupSearchBase" label={t("settings.field.ldapGroupSearchBase")} />
          <Form.Input field="groupSearchFilter" label={t("settings.field.ldapGroupSearchFilter")} />
          <Form.TextArea field="adminGroups" label={t("settings.field.ldapAdminGroups")} rows={2} />
          <Form.Switch field="enabled" label={t("settings.field.ldapEnabled")} />
          <div className="mt-2 flex items-center gap-2">
            <Button htmlType="submit" theme="solid" loading={submitting}>{tc("action.save")}</Button>
            <Button theme="borderless" loading={test.isPending} onClick={runTest}>
              {t("settings.action.testLdap")}
            </Button>
          </div>
        </Form>
      ) : notConfigured ? (
        <Form
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={180}
          className="max-w-[660px]"
          initValues={{ enabled: false }}
        >
          <div className="mb-2 text-xs text-[var(--semi-color-text-2)]">{t("settings.ldapNotConfigured")}</div>
          <Form.TextArea field="urls" label={t("settings.field.ldapUrls")} rows={2}
            placeholder="ldaps://ldap.example.com:636" rules={[{ required: true }]} />
          <Form.Input field="bindDN" label={t("settings.field.ldapBindDN")} />
          <Form.Input field="bindCredentials" label={t("settings.field.ldapBindCredentials")} mode="password" />
          <Form.Input field="searchBase" label={t("settings.field.ldapSearchBase")} />
          <Form.Input field="searchFilter" label={t("settings.field.ldapSearchFilter")} />
          <Form.TextArea field="searchAttributes" label={t("settings.field.ldapSearchAttributes")} rows={2} />
          <Form.Input field="groupSearchBase" label={t("settings.field.ldapGroupSearchBase")} />
          <Form.Input field="groupSearchFilter" label={t("settings.field.ldapGroupSearchFilter")} />
          <Form.TextArea field="adminGroups" label={t("settings.field.ldapAdminGroups")} rows={2} />
          <Form.Switch field="enabled" label={t("settings.field.ldapEnabled")} />
          <Button htmlType="submit" theme="solid" loading={submitting} className="mt-2">
            {tc("action.save")}
          </Button>
        </Form>
      ) : query.isError ? (
        <div className="text-sm text-[var(--semi-color-danger)]">{toDisplayMessage(query.error)}</div>
      ) : null}
    </div>
  );
}
