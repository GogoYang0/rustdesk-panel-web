/**
 * 状态标签（M4-T03）。
 *
 * 统一把状态枚举映射为 `Tag` 颜色与文案，供列表/详情复用。
 * 组件选型：`Tag`（已查证）。
 */
import { Tag } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";

/** 状态语义集合（与后端语义对齐）。 */
export type StatusKind = "online" | "offline" | "enabled" | "disabled" | "active" | "expired" | "unknown";

/** Tag 颜色类型。 */
type TagColor = "green" | "grey" | "red" | "orange" | "blue" | "cyan" | "violet";

/** 状态 → Tag 颜色映射。 */
const STATUS_COLOR: Record<StatusKind, TagColor> = {
  online: "green",
  offline: "grey",
  enabled: "green",
  disabled: "red",
  active: "blue",
  expired: "orange",
  unknown: "grey",
};

/** 状态 → i18n key 后缀映射。 */
const STATUS_LABEL_KEY: Record<StatusKind, string> = {
  online: "在线",
  offline: "离线",
  enabled: "启用",
  disabled: "停用",
  active: "活跃",
  expired: "已过期",
  unknown: "未知",
};

/** `StatusTag` 属性。 */
export interface StatusTagProps {
  /** 状态类别 */
  status: StatusKind;
  /** 自定义文案（优先于内置文案） */
  label?: string;
}

/**
 * 状态标签。
 *
 * @param props 状态类别与可选自定义文案
 * @returns 彩色 Tag
 */
export function StatusTag({ status, label }: StatusTagProps) {
  // 保留 i18n 入口（当前为内置静态文案，后续可迁移到 locale 文件的 status 命名空间）
  const { t: _t } = useTranslation("common");
  void _t;
  return <Tag color={STATUS_COLOR[status]}>{label ?? STATUS_LABEL_KEY[status]}</Tag>;
}
