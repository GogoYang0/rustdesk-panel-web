/**
 * 页面占位组件（M4-T03 骨架阶段）。
 *
 * T03 仅交付路由骨架与守卫，功能域页面在 T04~T06 落地。
 * 本文件仅导出**登录页占位**；功能域占位由 `placeholderFactory.tsx` 的
 * `makePlaceholder` 工厂按标题 key 生成（见 `lazyPages.ts`）。
 *
 * ★ DEF-02：文案全部走 i18n（`common:errors.pagePending`）。
 */
import { useTranslation } from "react-i18next";
import { Card, Typography } from "@douyinfe/semi-ui";

/**
 * 登录页占位（T03 骨架阶段）。
 *
 * T04 将落地真实登录（含 2FA / Passkey / OIDC）页面。
 *
 * @returns 登录占位卡片
 */
export function LoginPlaceholder() {
  const { t } = useTranslation("common");
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <Typography.Title heading={4} className="m-0">
          {t("app.name")}
        </Typography.Title>
        <Typography.Text type="tertiary">{t("errors.pagePending")}</Typography.Text>
      </div>
    </Card>
  );
}
