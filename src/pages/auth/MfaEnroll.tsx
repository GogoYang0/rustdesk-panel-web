/**
 * 强制 MFA 绑定页（GAP2 设计 §3.5；路由 /mfa-enroll，公开——凭步会话 secret）。
 *
 * 流程：登录返回 type=mfa_enroll → 本页携带 secret → POST /api/auth/mfa/enroll
 * 生成 TOTP → 展示二维码（otpauth）→ 输入 6 位验证码 verify → 成功进站。
 * 不可跳过（无 access_token）；保留「返回登录」回路（设计 §11）。
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Banner, Button, Form, Spin, Typography } from "@douyinfe/semi-ui";
import { IconArrowLeft, IconKey } from "@douyinfe/semi-icons";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { beginMfaEnroll, verifyMfaEnroll, type MfaEnrollResult } from "@/api/endpoints/auth";
import { toDisplayMessage } from "@/api/error";
import { queryClient } from "@/api/queryClient";
import { currentUser, myPermissions } from "@/api/endpoints/auth";
import { usePermissionStore } from "@/stores/permissionStore";
import { useSessionStore } from "@/stores/sessionStore";

/** 默认落地页。 */
const DEFAULT_ROUTE = "/dashboard";

/** `Button` 的 htmlType 推断（Semi 未导出该字面量类型）。 */
type SubmitButton = React.ComponentProps<typeof Button> & {
  htmlType?: "submit" | "button" | "reset";
};

/**
 * 强制 MFA 绑定页。
 *
 * @returns 二维码 + 验证码输入卡片
 */
export function MfaEnroll() {
  const { t } = useTranslation("pages");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const secret = searchParams.get("secret") ?? "";
  const returnTo = searchParams.get("returnTo") ?? DEFAULT_ROUTE;

  const [enroll, setEnroll] = useState<MfaEnrollResult | null>(null);
  const [qrcodeDataUrl, setQrcodeDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // 进入页面即生成 TOTP 绑定材料（步会话单次活跃，重复进入覆盖旧 pending）。
  useEffect(() => {
    if (secret.length === 0) return;
    let cancelled = false;
    setLoading(true);
    beginMfaEnroll(secret)
      .then((res) => {
        if (cancelled) return;
        setEnroll(res);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(toDisplayMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [secret]);

  // otpauth URL → 二维码 dataURL（本地渲染，不外发）。
  useEffect(() => {
    if (enroll === null) return;
    let cancelled = false;
    QRCode.toDataURL(enroll.otpauthUrl, { width: 220, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrcodeDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrcodeDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [enroll]);

  /** verify 成功 → establishSession 收口（与登录 action 同语义）。 */
  const onVerify = (tfaCode: string): void => {
    setVerifying(true);
    verifyMfaEnroll({ secret, tfaCode })
      .then(async (res) => {
        if (typeof res.access_token !== "string" || res.access_token.length === 0) {
          setError(t("mfaEnroll.error.noToken"));
          return;
        }
        useSessionStore.getState().login(res.access_token, null);
        const [userResult, permResult] = await Promise.allSettled([currentUser(), myPermissions()]);
        if (userResult.status === "fulfilled") {
          useSessionStore.getState().setUser(userResult.value);
          queryClient.setQueryData(["session", "currentUser"], userResult.value);
        }
        if (permResult.status === "fulfilled") {
          usePermissionStore.getState().setEff(permResult.value);
          queryClient.setQueryData(["session", "permissions"], permResult.value);
        }
        queryClient.clear();
        navigate(returnTo, { replace: true });
      })
      .catch((err) => setError(toDisplayMessage(err)))
      .finally(() => setVerifying(false));
  };

  const errorText = error !== null ? t(`login.error.${error}`, { defaultValue: error }) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <Typography.Title heading={3} className="m-0">
          {t("mfaEnroll.title")}
        </Typography.Title>
        <Typography.Text type="tertiary">{t("mfaEnroll.subtitle")}</Typography.Text>
      </div>

      {errorText !== null ? (
        <Banner type="danger" description={errorText} closeIcon={null} aria-label={errorText} />
      ) : null}

      {secret.length === 0 ? (
        <Banner
          type="warning"
          description={t("mfaEnroll.missingSecret")}
          closeIcon={null}
          aria-label={t("mfaEnroll.missingSecret")}
        />
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-4">
          <Spin size="small" />
          <Typography.Text type="tertiary">{t("mfaEnroll.loading")}</Typography.Text>
        </div>
      ) : enroll !== null ? (
        <>
          <div className="flex flex-col items-center gap-2">
            {qrcodeDataUrl !== null ? (
              <img
                src={qrcodeDataUrl}
                alt={t("mfaEnroll.qrcodeAlt")}
                className="rounded bg-white p-2"
              />
            ) : (
              <Typography.Text code copyable className="break-all text-center text-xs">
                {enroll.otpauthUrl}
              </Typography.Text>
            )}
            <Typography.Text type="tertiary" className="text-center text-xs">
              {t("mfaEnroll.manualEntry")}
            </Typography.Text>
            <Typography.Text code copyable className="text-sm">
              {enroll.secret}
            </Typography.Text>
          </div>
          <Form
            className="flex flex-col gap-1"
            onSubmit={(values) => onVerify(String(values.tfaCode ?? ""))}
          >
            <Form.Input
              field="tfaCode"
              label={t("mfaEnroll.codeLabel")}
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
              loading={verifying}
            >
              {t("mfaEnroll.submit")}
            </Button>
          </Form>
        </>
      ) : null}

      <Button
        theme="borderless"
        block
        icon={<IconArrowLeft />}
        onClick={() => navigate("/login", { replace: true })}
      >
        {t("mfaEnroll.backToLogin")}
      </Button>
    </div>
  );
}
