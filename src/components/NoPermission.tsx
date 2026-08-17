/**
 * 局部无权限态（M4-T03）。
 *
 * 用于列表/详情内无权限时渲染（替代白屏/报错）。
 * 组件选型：`Card` + `Typography` + `Button`（均已查证；`Empty` 亦经 Semi MCP 查证可用）。
 *
 * ⚠️ 权限红线：前端只做 UI 提示，后端每次请求实时查库为准。
 */
import { Button, Card, Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

/** `NoPermission` 属性。 */
export interface NoPermissionProps {
  /** 自定义标题（缺省取 i18n common.permission.noPermissionTitle） */
  title?: string;
  /** 自定义描述（缺省取 i18n common.permission.noPermission） */
  description?: string;
  /** 返回首页回调（缺省整页跳转 `/`） */
  onBackHome?: () => void;
}

/**
 * 局部无权限占位。
 *
 * @param props 标题、描述与返回回调
 * @returns 卡片式无权限提示
 */
export function NoPermission({ title, description, onBackHome }: NoPermissionProps) {
  const { t } = useTranslation("common");
  const handleBack = onBackHome ?? (() => window.location.assign("/"));

  return (
    <Card className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <Typography.Title heading={4} className="m-0">
          {title ?? t("permission.noPermissionTitle")}
        </Typography.Title>
        <Typography.Text type="tertiary">{description ?? t("permission.noPermission")}</Typography.Text>
        <Button onClick={handleBack}>{t("action.backHome")}</Button>
      </div>
    </Card>
  );
}
