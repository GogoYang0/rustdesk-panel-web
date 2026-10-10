/**
 * 占位组件工厂（M4-T03 骨架阶段）。
 *
 * 独立于 `placeholders.tsx`，避免 react-refresh 的「同文件既导出组件又导出函数」告警。
 */
import { useTranslation } from "react-i18next";
import { Card, Typography } from "@douyinfe/semi-ui";
import { PageHeader } from "@/components/PageHeader";

/**
 * 占位组件工厂：按标题 key 生成**无 props**的页面组件。
 *
 * @param titleKey 标题 i18n key（menu 命名空间，不含前缀）
 * @returns 无 props 占位组件
 */
export function makePlaceholder(titleKey: string) {
  /**
   * 生成的占位页组件。
   *
   * @returns 占位卡片
   */
  function GeneratedPlaceholder() {
    const { t: tc } = useTranslation("common");
    return (
      <div className="p-6">
        <PageHeader titleKey={`menu:${titleKey}`} withDocumentTitle />
        <Card>
          <Typography.Text type="tertiary">{tc("state.empty")}</Typography.Text>
        </Card>
      </div>
    );
  }
  GeneratedPlaceholder.displayName = `Placeholder(${titleKey})`;
  return GeneratedPlaceholder;
}
