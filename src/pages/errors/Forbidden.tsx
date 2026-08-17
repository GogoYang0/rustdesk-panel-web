/**
 * 403 无权限整页（M4-T03）。
 *
 * 组件选型（OQ-4）：经 Semi MCP 查证后 `Result` 不存在，`Empty` 可用；
 * 为降低依赖面，采用已查证的 `Card` + `Typography` + `Button` 兜底。
 */
import { useNavigate } from "react-router";
import { Button, Card, Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";

/**
 * 403 页面：已登录但无权限访问当前路由。
 *
 * @returns 403 页面
 */
export function Forbidden() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  return (
    <div className="p-6">
      <PageHeader title="403" withDocumentTitle />
      <Card className="max-w-[560px]">
        <div className="flex flex-col items-start gap-3">
          <Typography.Title heading={4} className="m-0">
            {t("permission.noPermissionTitle")}
          </Typography.Title>
          <Typography.Text type="tertiary">{t("permission.noPermission")}</Typography.Text>
          <Button type="primary" onClick={() => navigate("/")}>
            {t("action.backHome")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
