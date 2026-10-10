/**
 * 强制 MFA 策略设置页（GAP2 设计 §3.5；路由 /settings/mfa，门槛 is_admin）。
 *
 * 契约：GET/PUT /api/settings/mfa（AdminGuard，OQ-5）；mfa.enforceGlobal +
 * mfa.enforceUserGroupGuids（G4）。组级名单从用户组目录（useUserGroups）选取。
 *
 * ⚠️ 风险提示（设计 §11）：系统级强制可能锁死未绑定 2FA 的管理员——
 * 页面在开启 enforceGlobal 时给出确认提示（救援路径 = 直接改 system_settings 键）。
 */
import { useState } from "react";
import { Banner, Button, Form, Modal, Notification, Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";
import { toDisplayMessage } from "@/api/error";
import { useMfaSettings, useUpdateMfaSettings } from "@/api/hooks/settings";
import { useUserGroups } from "@/api/hooks/userGroups";

/**
 * 强制 MFA 策略页。
 *
 * @returns 系统级开关 + 用户组多选表单
 */
export function SettingsMfa() {
  const { t } = useTranslation("pages");
  const { t: tc } = useTranslation("common");
  const query = useMfaSettings();
  const groupsQuery = useUserGroups();
  const update = useUpdateMfaSettings();

  const data = query.data;
  const groupOptions = (groupsQuery.data?.data ?? []).map((g) => ({
    value: g.guid,
    label: g.name,
  }));

  /** enforceGlobal 关闭→开启时的二次确认弹窗。 */
  const [confirmGlobal, setConfirmGlobal] = useState<Record<string, unknown> | null>(null);

  const doSubmit = (values: Record<string, unknown>): void => {
    update.mutate(
      {
        enforceGlobal: values.enforceGlobal === true,
        userGroupGuids: Array.isArray(values.userGroupGuids)
          ? (values.userGroupGuids as string[])
          : [],
      },
      {
        onSuccess: () => {
          Notification.success({ content: t("settings.saved") });
          setConfirmGlobal(null);
        },
        onError: (err) => Notification.error({ content: toDisplayMessage(err), duration: 4 }),
      },
    );
  };

  const submit = (values: Record<string, unknown>): void => {
    // 开启系统级强制需二次确认（风险提示：可能锁死未绑定 2FA 的管理员）。
    if (values.enforceGlobal === true && data?.enforceGlobal !== true) {
      setConfirmGlobal(values);
      return;
    }
    doSubmit(values);
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader titleKey="menu:settingsMfa" description={t("settings.mfaDesc")} />

      <Banner type="info" description={t("settings.mfaHint")} closeIcon={null} />

      {data !== undefined ? (
        <Form
          key={`${data.enforceGlobal}-${data.userGroupGuids.length}`}
          initValues={{
            enforceGlobal: data.enforceGlobal,
            userGroupGuids: data.userGroupGuids,
          }}
          onSubmit={(values) => submit(values as Record<string, unknown>)}
          labelPosition="left"
          labelWidth={220}
          className="max-w-[720px]"
        >
          <Form.Switch field="enforceGlobal" label={t("settings.field.mfaEnforceGlobal")} />
          <Form.Select
            field="userGroupGuids"
            label={t("settings.field.mfaUserGroupGuids")}
            multiple
            filter
            style={{ width: 320 }}
            placeholder={t("settings.field.mfaUserGroupGuidsPlaceholder")}
            optionList={groupOptions}
          />
          <Typography.Text type="tertiary" className="text-xs">
            {t("settings.mfaGroupHint")}
          </Typography.Text>
          <Button htmlType="submit" theme="solid" loading={update.isPending} className="mt-2">
            {tc("action.save")}
          </Button>
        </Form>
      ) : query.isError ? (
        <div className="text-sm text-[var(--semi-color-danger)]">
          {toDisplayMessage(query.error)}
        </div>
      ) : null}

      <Modal
        title={t("settings.mfaConfirmTitle")}
        visible={confirmGlobal !== null}
        onOk={() => {
          if (confirmGlobal !== null) doSubmit(confirmGlobal);
        }}
        onCancel={() => {
          setConfirmGlobal(null);
        }}
        okText={tc("action.confirm")}
        cancelText={tc("action.cancel")}
      >
        <Typography.Text>{t("settings.mfaConfirmBody")}</Typography.Text>
      </Modal>
    </div>
  );
}
