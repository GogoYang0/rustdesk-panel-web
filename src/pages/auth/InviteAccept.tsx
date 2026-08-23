/**
 * 邀请接受页（M4-T04，设计 §5.2 `/invite/accept`，公开带 token）。
 *
 * 流程（设计 §7.2 P1-3「邀请流」）：
 * 1. 从 URL `?token=` 读取邀请 token；
 * 2. `POST /api/invitations/verify` 校验并展示被邀请人信息（`name` / `display_name` / `email`）；
 * 3. 用户设置密码 → `POST /api/invitations/accept` 激活账号 → 提示「请登录」并跳转 `/login`。
 *
 * 契约固定文案（`Invitation has already been used` / `Invitation has expired` /
 * `Invalid invitation token`）优先按原文 i18n 映射，命中失败回退原文（共享知识 15）。
 *
 * 组件选型：`Form` / `Button` / `Banner` / `Descriptions` / `Typography`（均经 Semi MCP 查证）。
 */
import { useActionState, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Banner, Button, Descriptions, Form, Typography } from "@douyinfe/semi-ui";
import { IconLock } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import { acceptInvitation, verifyInvitation, type InvitationInfo } from "@/api/endpoints/auth";
import { toDisplayMessage } from "@/api/error";

/** `Button` 的 htmlType 推断（Semi 未导出该字面量类型）。 */
type SubmitButton = React.ComponentProps<typeof Button> & { htmlType?: "submit" | "button" | "reset" };

/** 邀请接受 action 状态。 */
interface AcceptState {
  /** 是否成功 */
  ok: boolean;
  /** 错误文案 */
  error: string | null;
}

/** 初始状态。 */
const initialAcceptState: AcceptState = { ok: false, error: null };

/**
 * 邀请接受页。
 *
 * @returns 邀请激活卡片
 */
export function InviteAccept() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<boolean>(token.length > 0);

  const [state, formAction, isPending] = useActionState<AcceptState, FormData>(
    async (_prev, formData) => {
      const password = String(formData.get("password") ?? "");
      const confirm = String(formData.get("confirm") ?? "");
      if (password.length === 0) {
        return { ok: false, error: t("invite.error.passwordRequired") };
      }
      if (password !== confirm) {
        return { ok: false, error: t("invite.error.passwordMismatch") };
      }
      try {
        await acceptInvitation({ token, password });
        return { ok: true, error: null };
      } catch (err) {
        return { ok: false, error: toDisplayMessage(err) };
      }
    },
    initialAcceptState,
  );

  // 校验邀请 token（仅在有 token 时执行一次）
  useEffect(() => {
    if (token.length === 0) {
      setVerifying(false);
      return;
    }
    let cancelled = false;
    verifyInvitation(token)
      .then((result) => {
        if (!cancelled) setInfo(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setVerifyError(toDisplayMessage(err));
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // 激活成功 → 跳登录
  useEffect(() => {
    if (state.ok) {
      const timer = window.setTimeout(() => navigate("/login", { replace: true }), 1500);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [state.ok, navigate]);

  if (token.length === 0) {
    return (
      <Banner
        type="warning"
        description={t("invite.missingToken")}
        closeIcon={null}
        aria-label={t("invite.missingToken")}
      />
    );
  }

  if (state.ok) {
    return (
      <Banner
        type="success"
        title={t("invite.activated")}
        description={t("invite.activatedDescription")}
        closeIcon={null}
        aria-label={t("invite.activated")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <Typography.Title heading={3} className="m-0">
          {t("invite.title")}
        </Typography.Title>
        <Typography.Text type="tertiary">{t("invite.subtitle")}</Typography.Text>
      </div>

      {verifyError ? (
        <Banner
          type="danger"
          description={t(`invite.error.${verifyError}`, { defaultValue: verifyError })}
          closeIcon={null}
          aria-label={verifyError}
        />
      ) : null}

      {info ? (
        <Descriptions
          data={[
            { key: t("invite.field.name"), value: info.name },
            { key: t("invite.field.displayName"), value: info.display_name || "-" },
            { key: t("invite.field.email"), value: info.email || "-" },
          ]}
        />
      ) : null}

      {state.error ? (
        <Banner type="danger" description={state.error} closeIcon={null} aria-label={state.error} />
      ) : null}

      <Form
        className="flex flex-col gap-1"
        onSubmit={(values) => {
          const formData = new FormData();
          formData.append("password", String(values.password ?? ""));
          formData.append("confirm", String(values.confirm ?? ""));
          formAction(formData);
        }}
      >
        <Form.Input
          field="password"
          label={t("invite.field.password")}
          mode="password"
          prefix={<IconLock />}
          autoComplete="new-password"
          rules={[{ required: true, message: t("invite.error.passwordRequired") }]}
        />
        <Form.Input
          field="confirm"
          label={t("invite.field.confirm")}
          mode="password"
          prefix={<IconLock />}
          autoComplete="new-password"
          rules={[{ required: true, message: t("invite.error.confirmRequired") }]}
        />
        <Button
          {...({ htmlType: "submit" } as SubmitButton)}
          type="primary"
          theme="solid"
          block
          loading={isPending}
          disabled={verifying || info === null}
        >
          {t("invite.submit")}
        </Button>
      </Form>
    </div>
  );
}
