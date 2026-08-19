/**
 * 404 未找到整页（M4-T03）。
 *
 * 组件选型（OQ-4）：`Result` 不存在、`Empty` 可用；采用已查证的
 * `Card` + `Typography` + `Button` 兜底，避免额外依赖。
 */
import { useNavigate } from "react-router";
import { Button, Card, Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/PageHeader";

/**
 * 404 页面：路由未匹配。
 *
 * @returns 404 页面
 */
export function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  return (
    <div className="p-6">
      <PageHeader title="404" withDocumentTitle />
      <Card className="max-w-[560px]">
        <div className="flex flex-col items-start gap-3">
          <Typography.Title heading={4} className="m-0">
            页面不存在
          </Typography.Title>
          <Typography.Text type="tertiary">你访问的页面不存在或已被移除。</Typography.Text>
          <Button type="primary" onClick={() => navigate("/")}>
            {t("action.backHome")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
