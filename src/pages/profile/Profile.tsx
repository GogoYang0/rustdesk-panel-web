/**
 * 个人中心（M4-T04，设计 §5.2 `/profile`，仅需登录）。
 *
 * 四个分页（`Tabs`）：
 * 1. **资料**：`PATCH /api/users/me`（display_name / email / note）+ 头像上传/删除
 *    （`POST|DELETE /api/users/me/avatar`，webp ≤ 2MB）；
 * 2. **密码**：`PATCH /api/users/me/password`（当前密码 + 新密码）；
 * 3. **安全**：TOTP 两步验证（`POST /api/2fa/setup` → 展示 secret/otpauth → `POST /api/2fa/verify`；
 *    `DELETE /api/2fa` 关闭）与 Passkey 凭据列表（`GET /api/passkey/list` / `DELETE /api/passkey/{guid}`）；
 * 4. **会话**：`GET /api/sessions` + `DELETE /api/sessions/{jti}`（撤销指定会话）。
 *
 * 组件选型：`Tabs` / `Form` / `Upload` / `Descriptions` / `Table` / `Modal` / `Switch` / `Popconfirm`
 * / `Button` / `Typography` / `Tag` / `Avatar`（均经 Semi MCP 查证）。
 *
 * ⚠️ 权限红线：前端只做 UI 拦截，**不是安全边界**；后端每次请求实时查库为准。
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Avatar,
  Button,
  Descriptions,
  Form,
  Popconfirm,
  Switch,
  Table,
  Tabs,
  TabPane,
  Tag,
  Toast,
  Typography,
  Upload,
} from "@douyinfe/semi-ui";
import { IconCamera, IconDelete, IconKey, IconRefresh } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { avatarUrl, changeMyPassword } from "@/api/endpoints/auth";
import type { SessionInfo } from "@/api/endpoints/auth";
import {
  useDeleteAvatar,
  useDeletePasskey,
  useDisableTfa,
  usePasskeys,
  useRevokeSession,
  useSessions,
  useSetupTfa,
  useUpdateMe,
  useUploadAvatar,
  useVerifyTfa,
} from "@/api/hooks/auth";
import { toDisplayMessage } from "@/api/error";
import { PageHeader } from "@/components/PageHeader";
import { useSessionStore } from "@/stores/sessionStore";

/** `Button` 的 htmlType 推断（Semi 未导出该字面量类型）。 */
type SubmitButton = React.ComponentProps<typeof Button> & { htmlType?: "submit" | "button" | "reset" };

/**
 * 个人中心页面。
 *
 * @returns 个人中心（资料 / 密码 / 安全 / 会话）
 */
export function Profile() {
  const { t } = useTranslation("pages");

  return (
    <div className="p-0">
      <PageHeader titleKey="menu:profile" />
      <Tabs type="line">
        <TabPane tab={t("profile.tabs.profile")} itemKey="profile">
          <ProfileForm />
        </TabPane>
        <TabPane tab={t("profile.tabs.password")} itemKey="password">
          <PasswordForm />
        </TabPane>
        <TabPane tab={t("profile.tabs.security")} itemKey="security">
          <SecurityPanel />
        </TabPane>
        <TabPane tab={t("profile.tabs.sessions")} itemKey="sessions">
          <SessionsPanel />
        </TabPane>
      </Tabs>
    </div>
  );
}

/**
 * 资料表单（display_name / email / note）+ 头像管理。
 *
 * @returns 资料分页内容
 */
function ProfileForm() {
  const { t } = useTranslation("pages");
  const user = useSessionStore((s) => s.user);
  const updateMe = useUpdateMe();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();
  const setUser = useSessionStore((s) => s.setUser);

  const initialValues = useMemo(
    () => ({
      display_name: user?.display_name ?? "",
      email: user?.email ?? "",
      note: user?.note ?? "",
    }),
    [user?.display_name, user?.email, user?.note],
  );

  const currentAvatar = avatarUrl(user?.avatar);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <Avatar size="large" src={currentAvatar || undefined}>
          {(user?.display_name ?? user?.name ?? "?").slice(0, 1).toUpperCase()}
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <Upload
            accept="image/webp"
            limit={1}
            showUploadList={false}
            customRequest={({ file }) => {
              const raw = (file.fileInstance ?? file) as unknown as File;
              // ★ MIN-01 前端强校验：类型必须为 webp、大小 ≤ 2MB（契约 POST /api/users/me/avatar）
              if (!(raw instanceof File) || raw.type !== "image/webp") {
                Toast.error(t("profile.avatar.errorType"));
                return;
              }
              if (raw.size > 2 * 1024 * 1024) {
                Toast.error(t("profile.avatar.errorSize"));
                return;
              }
              uploadAvatar.mutate(raw, {
                onSuccess: () => Toast.success(t("profile.avatar.uploaded")),
                onError: (err) => Toast.error(toDisplayMessage(err)),
              });
            }}
          >
            <Button icon={<IconCamera />} loading={uploadAvatar.isPending}>
              {t("profile.avatar.upload")}
            </Button>
          </Upload>
          <Popconfirm
            title={t("profile.avatar.deleteConfirm")}
            onConfirm={() => {
              deleteAvatar.mutate(undefined, {
                onSuccess: () => Toast.success(t("profile.avatar.deleted")),
                onError: (err) => Toast.error(toDisplayMessage(err)),
              });
            }}
          >
            <Button icon={<IconDelete />} type="danger" theme="light" disabled={!user?.avatar}>
              {t("profile.avatar.delete")}
            </Button>
          </Popconfirm>
        </div>
        <Typography.Text type="tertiary">{t("profile.avatar.hint")}</Typography.Text>
      </div>

      <Form
        key={JSON.stringify(initialValues)}
        initValues={initialValues}
        className="flex max-w-[560px] flex-col gap-1"
        onSubmit={(values) => {
          updateMe.mutate(
            {
              display_name: String(values.display_name ?? ""),
              email: String(values.email ?? ""),
              note: String(values.note ?? ""),
            },
            {
              onSuccess: (updated) => {
                setUser(updated);
                Toast.success(t("profile.profileSaved"));
              },
              onError: (err) => Toast.error(toDisplayMessage(err)),
            },
          );
        }}
      >
        <Form.Input field="display_name" label={t("profile.field.displayName")} maxLength={64} />
        <Form.Input field="email" label={t("profile.field.email")} type="email" />
        <Form.TextArea field="note" label={t("profile.field.note")} rows={3} maxCount={255} />
        <div className="flex gap-2">
          <Button
            {...({ htmlType: "submit" } as SubmitButton)}
            type="primary"
            theme="solid"
            loading={updateMe.isPending}
          >
            {t("action.save")}
          </Button>
        </div>
      </Form>

      <Descriptions
        data={[
          { key: t("profile.field.username"), value: user?.name ?? "-" },
          { key: t("profile.field.guid"), value: user?.guid ?? "-" },
          {
            key: t("profile.field.role"),
            value: user?.is_admin ? (
              <Tag color="violet">{t("profile.role.admin")}</Tag>
            ) : (
              <Tag color="blue">{t("profile.role.user")}</Tag>
            ),
          },
        ]}
      />
    </div>
  );
}

/**
 * 修改密码表单。
 *
 * 成功后后端撤销该用户全部会话（旧 token 一律失效），
 * 前端清空本地会话并跳转登录页强制重新登录。
 *
 * @returns 密码分页内容
 */
function PasswordForm() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const logout = useSessionStore((s) => s.logout);
  const [submitting, setSubmitting] = useState(false);

  return (
    <Form
      className="flex max-w-[480px] flex-col gap-1"
      onSubmit={async (values) => {
        setSubmitting(true);
        try {
          await changeMyPassword({
            current_password: String(values.current_password ?? ""),
            new_password: String(values.new_password ?? ""),
          });
          // 改密成功：本地会话与缓存一并清空，跳登录页重新认证。
          logout();
          queryClient.clear();
          Toast.success(t("profile.passwordChangedRelogin"));
          navigate("/login", { replace: true });
        } catch (err) {
          // 当前密码错误（401）为业务校验失败：仅 Toast，不跳转。
          Toast.error(toDisplayMessage(err));
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <Form.Input
        field="current_password"
        label={t("profile.field.currentPassword")}
        mode="password"
        autoComplete="current-password"
        rules={[{ required: true, message: t("profile.error.currentPasswordRequired") }]}
      />
      <Form.Input
        field="new_password"
        label={t("profile.field.newPassword")}
        mode="password"
        autoComplete="new-password"
        rules={[{ required: true, message: t("profile.error.newPasswordRequired") }]}
      />
      <Button
        {...({ htmlType: "submit" } as SubmitButton)}
        type="primary"
        theme="solid"
        loading={submitting}
      >
        {t("action.submit")}
      </Button>
    </Form>
  );
}

/**
 * 安全设置（TOTP 两步验证 + Passkey 凭据）。
 *
 * @returns 安全分页内容
 */
function SecurityPanel() {
  const { t } = useTranslation("pages");
  const user = useSessionStore((s) => s.user);
  const setupTfa = useSetupTfa();
  const verifyTfa = useVerifyTfa();
  const disableTfa = useDisableTfa();
  const passkeys = usePasskeys();
  const deletePasskey = useDeletePasskey();

  const [setupResult, setSetupResult] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [tfaEnabled, setTfaEnabled] = useState<boolean>(user?.tfa_enabled === true);

  /**
   * 切换两步验证开关。
   *
   * @param next 目标状态
   */
  const handleToggleTfa = async (next: boolean) => {
    if (next) {
      try {
        const result = await setupTfa.mutateAsync();
        setSetupResult(result);
      } catch (err) {
        Toast.error(toDisplayMessage(err));
      }
      return;
    }
    // 关闭：需输入当前验证码（用 Modal 交互成本高，此处用 prompt 语义的二次弹窗由 Modal 承载）
    setTfaEnabled(false);
    setPendingDisable(true);
  };

  const [pendingDisable, setPendingDisable] = useState(false);

  const passkeyColumns = useMemo(
    () => [
      { title: t("profile.passkey.name"), dataIndex: "name", render: (v: string) => v || "-" },
      { title: t("profile.passkey.deviceType"), dataIndex: "deviceType", render: (v?: string) => v || "-" },
      {
        title: t("profile.passkey.createdAt"),
        dataIndex: "createdAt",
        render: (v?: string) => v ?? "-",
      },
      {
        title: t("profile.passkey.actions"),
        dataIndex: "guid",
        render: (guid: string) => (
          <Popconfirm
            title={t("profile.passkey.deleteConfirm")}
            onConfirm={() =>
              deletePasskey.mutate(guid, {
                onSuccess: () => Toast.success(t("profile.passkey.deleted")),
                onError: (err) => Toast.error(toDisplayMessage(err)),
              })
            }
          >
            <Button type="danger" theme="borderless" size="small" icon={<IconDelete />}>
              {t("profile.passkey.delete")}
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [t, deletePasskey],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Switch
          checked={tfaEnabled}
          onChange={(next) => void handleToggleTfa(next)}
          aria-label={t("profile.tfa.title")}
        />
        <Typography.Text>{t("profile.tfa.title")}</Typography.Text>
        <Typography.Text type="tertiary">{t("profile.tfa.description")}</Typography.Text>
      </div>

      {setupResult ? (
        <div className="flex max-w-[560px] flex-col gap-2 rounded-semi-border-radius-medium border border-semi-color-border p-3">
          <Typography.Text strong>{t("profile.tfa.secretLabel")}</Typography.Text>
          <Typography.Text code copyable={{ content: setupResult.secret }}>
            {setupResult.secret}
          </Typography.Text>
          <Typography.Text type="tertiary" className="break-all">
            {setupResult.otpauth_url}
          </Typography.Text>
          <Form
            className="flex items-end gap-2"
            onSubmit={async (values) => {
              try {
                await verifyTfa.mutateAsync(String(values.tfaCode ?? ""));
                Toast.success(t("profile.tfa.verified"));
                setTfaEnabled(true);
                setSetupResult(null);
              } catch (err) {
                Toast.error(toDisplayMessage(err));
              }
            }}
          >
            <Form.Input
              field="tfaCode"
              label={t("profile.tfa.codeLabel")}
              maxLength={6}
              style={{ width: 160 }}
              rules={[{ required: true, message: t("profile.tfa.codeRequired") }]}
            />
            <Button
              {...({ htmlType: "submit" } as SubmitButton)}
              type="primary"
              theme="solid"
              loading={verifyTfa.isPending}
            >
              {t("profile.tfa.verify")}
            </Button>
          </Form>
        </div>
      ) : null}

      {pendingDisable ? (
        <Form
          className="flex max-w-[480px] items-end gap-2"
          onSubmit={async (values) => {
            try {
              await disableTfa.mutateAsync(String(values.tfaCode ?? ""));
              Toast.success(t("profile.tfa.disabled"));
              setPendingDisable(false);
              setTfaEnabled(false);
            } catch (err) {
              Toast.error(toDisplayMessage(err));
            }
          }}
        >
          <Form.Input
            field="tfaCode"
            label={t("profile.tfa.codeLabel")}
            maxLength={6}
            style={{ width: 160 }}
            rules={[{ required: true, message: t("profile.tfa.codeRequired") }]}
          />
          <Button
            {...({ htmlType: "submit" } as SubmitButton)}
            type="danger"
            theme="solid"
            loading={disableTfa.isPending}
          >
            {t("profile.tfa.confirmDisable")}
          </Button>
        </Form>
      ) : null}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <IconKey />
          <Typography.Text strong>{t("profile.passkey.title")}</Typography.Text>
          <Button
            icon={<IconRefresh />}
            size="small"
            theme="borderless"
            onClick={() => void passkeys.refetch()}
          >
            {t("action.refresh")}
          </Button>
        </div>
        <Table
          columns={passkeyColumns}
          dataSource={passkeys.data ?? []}
          loading={passkeys.isLoading}
          rowKey="guid"
          pagination={false}
          empty={t("profile.passkey.empty")}
        />
      </div>
    </div>
  );
}

/**
 * 活跃会话列表（GET /api/sessions）。
 *
 * @returns 会话分页内容
 */
function SessionsPanel() {
  const { t } = useTranslation("pages");
  const sessions = useSessions();
  const revoke = useRevokeSession();

  const columns = useMemo(
    () => [
      { title: t("profile.session.device"), dataIndex: "deviceName", render: (v?: string) => v || "-" },
      { title: t("profile.session.os"), dataIndex: "deviceOs", render: (v?: string) => v || "-" },
      {
        title: t("profile.session.createdAt"),
        dataIndex: "createdAt",
        render: (v: string) => v,
      },
      { title: t("profile.session.expiresAt"), dataIndex: "expiresAt", render: (v: string) => v },
      {
        title: t("profile.session.actions"),
        dataIndex: "jti",
        render: (jti: string) => (
          <Popconfirm
            title={t("profile.session.revokeConfirm")}
            onConfirm={() =>
              revoke.mutate(jti, {
                onSuccess: () => Toast.success(t("profile.session.revoked")),
                onError: (err) => Toast.error(toDisplayMessage(err)),
              })
            }
          >
            <Button type="danger" theme="borderless" size="small">
              {t("profile.session.revoke")}
            </Button>
          </Popconfirm>
        ),
      },
    ],
    [t, revoke],
  );

  const dataSource: SessionInfo[] = sessions.data ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button icon={<IconRefresh />} theme="borderless" onClick={() => void sessions.refetch()}>
          {t("action.refresh")}
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={dataSource}
        loading={sessions.isLoading}
        rowKey="jti"
        pagination={false}
        empty={t("profile.session.empty")}
      />
    </div>
  );
}
