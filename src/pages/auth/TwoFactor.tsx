/**
 * 独立两步验证页（M4-T04，设计 §5.2 `/login/2fa`）。
 *
 * 用途：外链直达 / 深链刷新场景 —— 登录页内嵌的 2FA 步骤（`Login.tsx`）覆盖主流程，
 * 本页覆盖「无登录页上下文、但携带 `secret` 的独立入口」。
 *
 * 落地方式：与登录页一致 —— `useActionState` + `loginAction`（step 由 URL `secret` 初始化）。
 *
 * ⚠️ 安全：`secret` 由后端签发（5 分钟、单次使用）；本页仅在内存/URL 中短暂持有，
 * 成功后由 action 统一 `establishSession` 并跳转。
 */
import { useActionState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Banner, Button, Form, Typography } from "@douyinfe/semi-ui";
import { IconArrowLeft, IconKey } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { initialLoginState, loginAction, type LoginState } from "@/pages/auth/actions";
import { queryClient } from "@/api/queryClient";

/** 默认落地页。 */
const DEFAULT_ROUTE = "/dashboard";

/** `Button` 的 htmlType 推断（Semi 未导出该字面量类型）。 */
type SubmitButton = React.ComponentProps<typeof Button> & { htmlType?: "submit" | "button" | "reset" };

/**
 * 两步验证页。
 *
 * @returns 验证码输入卡片
 */
export function TwoFactor() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const secret = searchParams.get("secret") ?? "";
  const returnTo = searchParams.get("returnTo") ?? DEFAULT_ROUTE;

  const [state, formAction, isPending] = useActionState<LoginState, FormData>(loginAction, {
    ...initialLoginState,
    step: secret.length > 0 ? "tfa" : "account",
    secret: secret.length > 0 ? secret : null,
    tfaType: "tfa_check",
  });

  useEffect(() => {
    if (state.ok) {
      queryClient.clear();
      navigate(returnTo, { replace: true });
    }
  }, [state.ok, navigate, returnTo]);

  const errorText = state.error
    ? t(`login.error.${state.error}`, { defaultValue: state.error })
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <Typography.Title heading={3} className="m-0">
          {t("login.tfa.title")}
        </Typography.Title>
        <Typography.Text type="tertiary">{t("login.tfa.hint")}</Typography.Text>
      </div>

      {errorText ? (
        <Banner type="danger" description={errorText} closeIcon={null} aria-label={errorText} />
      ) : null}

      {secret.length === 0 ? (
        <Banner
          type="warning"
          description={t("login.tfa.missingSecret")}
          closeIcon={null}
          aria-label={t("login.tfa.missingSecret")}
        />
      ) : null}

      <Form
        className="flex flex-col gap-1"
        onSubmit={(values) => {
          const formData = new FormData();
          formData.append("tfaCode", String(values.tfaCode ?? ""));
          formAction(formData);
        }}
      >
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
          loading={isPending}
          disabled={secret.length === 0}
        >
          {t("login.tfa.submit")}
        </Button>
      </Form>

      <Button
        theme="borderless"
        block
        icon={<IconArrowLeft />}
        onClick={() => navigate("/login", { replace: true })}
      >
        {t("login.tfa.backToLogin")}
      </Button>
    </div>
  );
}
