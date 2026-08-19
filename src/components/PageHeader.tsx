/**
 * 页面标题组件（M4-T03）。
 *
 * 渲染原生 `<title>` 元数据（React 19 原生文档元数据，支持在组件内渲染），
 * 并展示页面标题与可选描述、操作区。
 *
 * 组件选型：`Typography`（已查证）。
 */
import type { ReactNode } from "react";
import { Typography } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

/** `PageHeader` 属性。 */
export interface PageHeaderProps {
  /** 标题（i18n key 或纯文本） */
  titleKey?: string;
  /** 直接给出标题文本（优先于 titleKey） */
  title?: string;
  /** 描述文本 */
  description?: string;
  /** 右侧操作区 */
  extra?: ReactNode;
  /** 是否渲染原生 <title> 文档元数据（默认 true） */
  withDocumentTitle?: boolean;
  /** 子节点（可选，渲染于标题下方） */
  children?: ReactNode;
}

/**
 * 页面标题栏。
 *
 * @param props 标题、描述、操作区与文档标题开关
 * @returns 标题栏元素
 */
export function PageHeader({
  titleKey,
  title,
  description,
  extra,
  withDocumentTitle = true,
  children,
}: PageHeaderProps) {
  const { t } = useTranslation("common");
  const appName = t("app.name");
  const heading = title ?? (titleKey ? t(titleKey) : "");
  const documentTitle = heading ? `${heading} · ${appName}` : appName;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {withDocumentTitle ? <title>{documentTitle}</title> : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          {heading ? (
            <Typography.Title heading={4} className="m-0 truncate">
              {heading}
            </Typography.Title>
          ) : null}
          {description ? <Typography.Text type="tertiary">{description}</Typography.Text> : null}
        </div>
        {extra ? <div className="flex shrink-0 items-center gap-2">{extra}</div> : null}
      </div>
      {children}
    </div>
  );
}
