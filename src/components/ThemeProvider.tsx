import { useEffect, type ReactNode } from "react";

/**
 * 主题提供者：暗色的唯一开关是 `body[theme-mode]`。
 *
 * 为什么用 `body` 而非 `<html>`：
 * Semi 在 `body` 上同时挂载亮/暗两套色盘，通过 `body[theme-mode='dark']` 切换（官方 dark-mode 文档）。
 * Tailwind 侧通过 `@custom-variant dark (&:where([theme-mode="dark"], [theme-mode="dark"] *));` 对齐。
 *
 * ⚠️ 若将来迁移到 `<html>`，必须同步修改 `src/styles/tailwind.css` 的 `@custom-variant` 选择器。
 */
export interface ThemeProviderProps {
  /** 是否为暗色模式 */
  dark: boolean;
  /** 主题切换回调（由父组件持有状态，便于后续接入 Zustand uiStore） */
  onChange?: (dark: boolean) => void;
  /** 子节点 */
  children: ReactNode;
}

/**
 * 应用主题上下文组件：把 `dark` 状态同步到 `document.body[theme-mode]`。
 *
 * @param props 主题属性与子节点
 * @returns 包裹后的子节点
 */
export function ThemeProvider({ dark, onChange, children }: ThemeProviderProps) {
  useEffect(() => {
    // `onChange` 仅用于保留 API 形态，此处不触发；父组件是状态唯一持有者。
    void onChange;
    document.body.setAttribute("theme-mode", dark ? "dark" : "light");
  }, [dark, onChange]);

  return <>{children}</>;
}
