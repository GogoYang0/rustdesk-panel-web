/**
 * 邮件设置页（M4-T06；路由 /settings/smtp，门槛 is_admin）。
 *
 * ★ 掩码回读保真（验收项）：GET 无配置 404 → 空表单；`pass` 回读恒 `'******'`
 * 且不回显（表单初值为空，placeholder 提示已配置）；提交经 `stripMasked` 兜底
 * 不回传掩码值；「发送测试」恒 200 `{success,message}`（失败也是 success:false）。
 */
import { useEffect, useState } from "react";
import { Button, Form, Notification } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { isApiError, toDisplayMessage } from "@/api/error";
import { isMasked, stripMasked, type SmtpConfig } from "@/api/endpoints/settings";
import { useSmtpSettings, useTestSmtpSettings, useUpdateSmtpSettings } from "@/api/hooks/settings";

/**
 * 邮件设置页。
 *
 * @returns SMTP 表单（掩码不回显）+ 测试按钮
 */
export function SettingsSmtp() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useSmtpSettings();
  const update = useUpdateSmtpSettings();
  const test = useTestSmtpSettings();
  // 已配置（GET 成功且 pass 为掩码回读）→ 密码框显示「留空保持不变」
  const [hasStored, setHasStored] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const data = query.data;
  const notConfigured =
    query.isError && isApiError(query.error) && query.error.statusCode === 404;
  const configured = data !== undefined && !notConfigured;

  // 已配置掩码回读 → 密码框按「留空保持不变」提示（useEffect 中同步，避免渲染期写状态）
  useEffect(() => {
    if (configured) setHasStored(true);
  }, [configured]);

  /** 保存（pass 空串/掩码 → undefined，后端跳过更新）。 */
  const submit = (values: Record<string, unknown>): void => {
    setSubmitting(true);
    const body: SmtpConfig = {
      host: String(values.host ?? ""),
      port: typeof values.port === "number" ? values.port : undefined,
      secure: values.secure === true,
      user: String(values.user ?? ""),
      pass: stripMasked(typeof values.pass === "string" ? values.pass : undefined),
      from: String(values.from ?? ""),
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

  /** 发送测试（恒 200；展示 success/message）。 */
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

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:settingsSmtp" description={t("settings.smtpDesc")} />
      {configured ? (
        <Form
          initValues={{ ...data, pass: "" }}
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={160}
          className="max-w-[620px]"
        >
          <Form.Input field="host" label={t("settings.field.smtpHost")} rules={[{ required: true }]} />
          <Form.InputNumber field="port" label={t("settings.field.smtpPort")} hideButtons style={{ width: 220 }} />
          <Form.Switch field="secure" label={t("settings.field.smtpSecure")} />
          <Form.Input field="user" label={t("settings.field.smtpUser")} />
          <Form.Input field="pass" label={t("settings.field.smtpPass")} mode="password"
            placeholder={hasStored && data?.pass !== undefined && isMasked(data.pass)
              ? t("settings.field.maskedHint")
              : undefined} />
          <Form.Input field="from" label={t("settings.field.smtpFrom")} />
          <Form.Switch field="enabled" label={t("settings.field.smtpEnabled")} />
          <div className="mt-2 flex items-center gap-2">
            <Button htmlType="submit" theme="solid" loading={submitting}>{tc("action.save")}</Button>
            <Button theme="borderless" loading={test.isPending} onClick={runTest}>
              {t("settings.action.testSmtp")}
            </Button>
          </div>
        </Form>
      ) : notConfigured ? (
        <Form
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={160}
          className="max-w-[620px]"
          initValues={{ enabled: false, secure: true }}
        >
          <div className="mb-2 text-xs text-[var(--semi-color-text-2)]">{t("settings.smtpNotConfigured")}</div>
          <Form.Input field="host" label={t("settings.field.smtpHost")} rules={[{ required: true }]} />
          <Form.InputNumber field="port" label={t("settings.field.smtpPort")} initValue={587} hideButtons style={{ width: 220 }} />
          <Form.Switch field="secure" label={t("settings.field.smtpSecure")} />
          <Form.Input field="user" label={t("settings.field.smtpUser")} />
          <Form.Input field="pass" label={t("settings.field.smtpPass")} mode="password" />
          <Form.Input field="from" label={t("settings.field.smtpFrom")} />
          <Form.Switch field="enabled" label={t("settings.field.smtpEnabled")} />
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
