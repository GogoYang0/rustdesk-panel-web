/**
 * 登录页（M4-T04，设计 §5.4 / §6.2.1）。
 *
 * 落地方式（React 19 Actions）：
 * - `useActionState(loginAction, initialLoginState)` —— action 内直接 `await POST /api/login`；
 *   `isPending` 内建驱动按钮 loading；`state.error` 内建驱动错误展示；
 * - **两步验证**：`account` 分支返回 `type=email_check` 时切到验证码输入（同一 action 复用，
 *   step=tfa 时以 `type:"tfa_code"` 提交）；
 * - **Passkey 免密登录**：独立按钮触发 `passkeyLoginAction`（WebAuthn 走原生 `navigator.credentials`）；
 * - **OIDC 入口**：后端 `GET /api/login-options` 公开返回登录方式列表；OIDC provider 以按钮形式列出，
 *   点击跳转后端授权端点（`/oidc/authorize?provider=…`）；
 * - 登录成功 → 跳 `returnTo`（`?returnTo=` 查询串）或 `/dashboard`。
 *
 * ⚠️ 权限红线：前端只做 UI 拦截，**不是安全边界**；后端每次请求实时查库为准。
 * 组件选型：`Form` / `Form.Input` / `Button` / `Checkbox` / `Tabs` / `Banner` / `Typography` / `Spin`（均经 Semi MCP 查证）。
 */
import { useActionState, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Banner, Button, Checkbox, Form, Spin, Tabs, TabPane, Typography } from "@douyinfe/semi-ui";
import { IconKey, IconLock, IconMail } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { loginOptions } from "@/api/endpoints/auth";
import {
  initialLoginState,
  loginAction,
  passkeyLoginAction,
  type LoginState,
} from "@/pages/auth/actions";
import { queryClient } from "@/api/queryClient";

/** 默认落地页。 */
const DEFAULT_ROUTE = "/dashboard";

/** `Button` 的 htmlType 推断（Semi 未导出该字面量类型）。 */
type SubmitButton = React.ComponentProps<typeof Button> & { htmlType?: "submit" | "button" | "reset" };

/**
 * 登录页。
 *
 * @returns 登录卡片（含 2FA / Passkey / OIDC 入口）
 */
export function Login() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? DEFAULT_ROUTE;

  const [state, formAction, isPending] = useActionState<LoginState, FormData>(
    loginAction,
    initialLoginState,
  );
  const [passkeyState, passkeyDispatch, passkeyPending] = useActionState<LoginState, void>(
    passkeyLoginAction,
    initialLoginState,
  );
  const [providers, setProviders] = useState<Array<{ name: string; icon?: string }>>([]);
  const [autoLogin, setAutoLogin] = useState(false);

  const activeState = passkeyState.error !== null || passkeyState.ok ? passkeyState : state;
  const pending = isPending || passkeyPending;

  // 登录成功统一跳转（清空 Query 缓存，避免上一个用户的缓存串号）
  useEffect(() => {
    if (state.ok || passkeyState.ok) {
      queryClient.clear();
      navigate(returnTo, { replace: true });
    }
  }, [state.ok, passkeyState.ok, navigate, returnTo]);

  // 拉取公开登录方式（OIDC provider 列表）；失败静默（不影响账号密码登录）
  useEffect(() => {
    let cancelled = false;
    loginOptions()
      .then((options) => {
        if (cancelled) return;
        const normalized = options.map((option) =>
          typeof option === "string" ? { name: option } : { name: option.name, icon: option.icon },
        );
        setProviders(normalized);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 错误文案：后端文案直接展示；语义 key 走 i18n。 */
  const errorText = activeState.error
    ? t(`login.error.${activeState.error}`, { defaultValue: activeState.error })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <Typography.Title heading={3} className="m-0">
          {t("login.title")}
        </Typography.Title>
        <Typography.Text type="tertiary">{t("login.subtitle")}</Typography.Text>
      </div>

      {errorText ? (
        <Banner type="danger" description={errorText} closeIcon={null} aria-label={errorText} />
      ) : null}

      {activeState.step === "tfa" ? (
        <Form
          key="tfa"
          className="flex flex-col gap-1"
          onSubmit={(values) => {
            const formData = new FormData();
            formData.append("tfaCode", String(values.tfaCode ?? ""));
            formAction(formData);
          }}
        >
          <Banner
            type="info"
            description={
              activeState.tfaType === "passkey_check"
                ? t("login.tfa.passkeyHint")
                : t("login.tfa.hint")
            }
            closeIcon={null}
          />
          <Form.Input
            field="tfaCode"
            label={t("login.tfa.codeLabel")}
            placeholder={t("login.tfa.codePlaceholder")}
            prefix={<IconKey />}
            maxLength={6}
            autoComplete="one-time-code"
            rules={[{ required: true, message: t("login.tfa.codeRequired") }]}
          />
          <Button
            {...({ htmlType: "submit" } as SubmitButton)}
            type="primary"
            theme="solid"
            block
            loading={pending}
          >
            {t("login.tfa.submit")}
          </Button>
        </Form>
      ) : (
        <Tabs type="line" keepDOM={false}>
          <TabPane tab={t("login.tabs.password")} itemKey="password">
            <Form
              key="account"
              className="flex flex-col gap-1"
              onSubmit={(values) => {
                const formData = new FormData();
                formData.append("username", String(values.username ?? ""));
                formData.append("password", String(values.password ?? ""));
                formData.append("autoLogin", autoLogin ? "true" : "false");
                formAction(formData);
              }}
            >
              <Form.Input
                field="username"
                label={t("login.account.username")}
                placeholder={t("login.account.usernamePlaceholder")}
                prefix={<IconMail />}
                autoComplete="username"
                rules={[{ required: true, message: t("login.account.usernameRequired") }]}
              />
              <Form.Input
                field="password"
                label={t("login.account.password")}
                mode="password"
                placeholder={t("login.account.passwordPlaceholder")}
                prefix={<IconLock />}
                autoComplete="current-password"
                rules={[{ required: true, message: t("login.account.passwordRequired") }]}
              />
              <Checkbox checked={autoLogin} onChange={(e) => setAutoLogin(e.target.checked === true)}>
                {t("login.account.autoLogin")}
              </Checkbox>
              <Button
                {...({ htmlType: "submit" } as SubmitButton)}
                type="primary"
                theme="solid"
                block
                loading={pending}
              >
                {t("login.account.submit")}
              </Button>
            </Form>
          </TabPane>

          <TabPane tab={t("login.tabs.passkey")} itemKey="passkey">
            <div className="flex flex-col items-center gap-3 py-4">
              <Typography.Text type="tertiary" className="text-center">
                {t("login.passkey.hint")}
              </Typography.Text>
              <Button
                type="primary"
                theme="light"
                block
                loading={passkeyPending}
                onClick={() => passkeyDispatch()}
                icon={<IconKey />}
              >
                {t("login.passkey.submit")}
              </Button>
            </div>
          </TabPane>
        </Tabs>
      )}

      {pending ? (
        <div className="flex items-center justify-center gap-2">
          <Spin size="small" />
          <Typography.Text type="tertiary">{t("login.pending")}</Typography.Text>
        </div>
      ) : null}

      {providers.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-semi-color-border pt-4">
          <Typography.Text type="tertiary" className="text-center">
            {t("login.oidc.title")}
          </Typography.Text>
          <div className="flex flex-wrap justify-center gap-2">
            {providers.map((provider) => (
              <Button
                key={provider.name}
                theme="borderless"
                onClick={() => {
                  window.location.assign(`/oidc/authorize?provider=${encodeURIComponent(provider.name)}`);
                }}
              >
                {provider.name}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
