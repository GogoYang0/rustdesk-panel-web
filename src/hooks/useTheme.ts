/**
 * 主题切换 Hook（M4-T03）。
 *
 * 暗色唯一开关：`document.body[theme-mode="dark"|"light"]`（Semi 挂载在 body）。
 * Tailwind 通过 `@custom-variant dark (&:where([theme-mode="dark"], [theme-mode="dark"] *))` 对齐。
 *
 * ⚠️ 禁止在 `<html>` 上加 `theme-mode`（若将来迁移须同步改 @custom-variant）。
 */
import { useCallback, useEffect } from "react";
import { type ThemeMode, useUiStore } from "@/stores/uiStore";

/** `useTheme` 返回值。 */
export interface UseThemeResult {
  /** 当前主题模式 */
  mode: ThemeMode;
  /** 是否暗色 */
  isDark: boolean;
  /** 设置主题 */
  setMode: (mode: ThemeMode) => void;
  /** 切换主题 */
  toggle: () => void;
}

/**
 * 把主题写入 `document.body[theme-mode]` 并同步 `color-scheme`。
 *
 * @param mode 主题模式
 */
export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  document.body.setAttribute("theme-mode", mode);
  document.body.style.colorScheme = mode === "dark" ? "dark" : "light";
}

/**
 * 主题 Hook：读取 uiStore 并把 `theme` 同步到 body 属性。
 *
 * @returns 主题状态与切换函数
 */
export function useTheme(): UseThemeResult {
  const mode = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setTheme(next);
    },
    [setTheme],
  );

  const toggle = useCallback(() => {
    toggleTheme();
  }, [toggleTheme]);

  return { mode, isDark: mode === "dark", setMode, toggle };
}
