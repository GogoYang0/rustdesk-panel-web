/**
 * 操作级按钮守卫（M4-T03，设计 §4.5）。
 *
 * 三层守卫之③：按钮级权限显隐/禁用。
 * - `fallback="hide"`（默认）：无权限时**不渲染**；
 * - `fallback="disable"`：无权限时**渲染但禁用**（用于「告知有此功能但无权限」场景）。
 *
 * ⚠️ 权限红线：前端隐藏/禁用只是体验优化，**不是安全边界**；后端每次请求实时查库为准。
 *
 * ⚠️ React 19：禁用 `forwardRef`，ref 直接作为 prop 透传给底层 Semi `Button`。
 */
import type { ComponentProps } from "react";
import { Button, Tooltip } from "@douyinfe/semi-ui";
import { useTranslation } from "react-i18next";
import { usePermission } from "@/hooks/usePermission";

/** Semi Button 的 props 类型（semi-ui 未导出 ButtonProps，故从组件推导）。 */
export type SemiButtonProps = ComponentProps<typeof Button>;

/** PermissionButton 属性（Button 原生属性 + 权限守卫扩展）。 */
export type PermissionButtonProps = SemiButtonProps & {
  /** 权限码（resource.action） */
  code: string;
  /**
   * 设备域专用：设备所属设备组 guid。
   *
   * ★ 类型与契约 `DeviceView.deviceGroupGuid`（`string | null`）保持一致：
   *   无组设备的真实取值是 `null`，可直接透传；`null` / `undefined` / 空串
   *   一律按「无该组」保守隐藏或禁用（DEV-01）。
   */
  deviceGroupGuid?: string | null;
  /** 无权限时的降级策略：hide（不渲染）/ disable（渲染但禁用） */
  fallback?: "hide" | "disable";
};

/**
 * 带权限守卫的按钮。
 *
 * @param props 权限码、设备组 guid、降级策略与 Button 原生属性
 * @returns 有权限渲染可用按钮；无权限时按 fallback 隐藏或禁用
 */
export function PermissionButton({
  code,
  deviceGroupGuid,
  fallback = "hide",
  disabled,
  ...rest
}: PermissionButtonProps) {
  const { can } = usePermission();
  const { t } = useTranslation("common");
  const allowed = can(code, { deviceGroupGuid });

  if (!allowed && fallback === "hide") {
    return null;
  }

  const button = <Button {...rest} disabled={!allowed || disabled} />;

  if (!allowed && fallback === "disable") {
    return <Tooltip content={t("permission.buttonDisabledReason")}>{button}</Tooltip>;
  }

  return button;
}
