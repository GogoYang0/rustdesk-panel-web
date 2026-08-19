/**
 * UI 偏好状态（M4-T03）：主题 / 语言 / 侧栏折叠。
 *
 * 持久化到 localStorage（key = `rdp-ui`）；主题开关的**唯一落点**是
 * `document.body[theme-mode]`（Semi 挂载在 body，Tailwind 用 @custom-variant 对齐）。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** 主题模式。 */
export type ThemeMode = "light" | "dark";

/** 支持的语言。 */
export type Locale = "zh-CN" | "en-US";

/** UI 状态与动作。 */
export interface UiState {
  /** 主题模式 */
  theme: ThemeMode;
  /** 当前语言 */
  locale: Locale;
  /** 侧边栏是否折叠 */
  sideCollapsed: boolean;
  /** 设置主题 */
  setTheme: (mode: ThemeMode) => void;
  /** 切换主题 */
  toggleTheme: () => void;
  /** 设置语言 */
  setLocale: (locale: Locale) => void;
  /** 切换侧栏折叠 */
  toggleSide: () => void;
  /** 设置侧栏折叠 */
  setSideCollapsed: (collapsed: boolean) => void;
}

/** 支持的语言白名单（校验持久化值）。 */
export const SUPPORTED_LOCALES: readonly Locale[] = ["zh-CN", "en-US"];

/** UI store。 */
export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: "light",
      locale: "zh-CN",
      sideCollapsed: false,
      setTheme: (mode) => set({ theme: mode }),
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      setLocale: (locale) => set({ locale }),
      toggleSide: () => set({ sideCollapsed: !get().sideCollapsed }),
      setSideCollapsed: (collapsed) => set({ sideCollapsed: collapsed }),
    }),
    {
      name: "rdp-ui",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        locale: state.locale,
        sideCollapsed: state.sideCollapsed,
      }),
    },
  ),
);
