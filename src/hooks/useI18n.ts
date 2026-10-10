/**
 * 语言切换 Hook（M4-T03）。
 *
 * 语言集：zh-CN（默认）/ en-US；存 uiStore 并持久化；同步 `<html lang>`。
 */
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type Locale, SUPPORTED_LOCALES, useUiStore } from "@/stores/uiStore";
import { setErrorTextResolver } from "@/utils/errorText";

/** `useI18n` 返回值。 */
export interface UseI18nResult {
  /** 当前语言 */
  locale: Locale;
  /** 设置语言（会同步 i18next 与 <html lang>） */
  setLocale: (locale: Locale) => void;
  /** 支持的语言列表 */
  locales: readonly Locale[];
  /** i18next 的 t 函数（转发） */
  t: ReturnType<typeof useTranslation>["t"];
}

/**
 * 语言 Hook：uiStore.locale ↔ i18next.language ↔ `<html lang>` 三方同步。
 *
 * @returns 语言状态与切换函数
 */
export function useI18n(): UseI18nResult {
  const locale = useUiStore((s) => s.locale);
  const setLocaleStore = useUiStore((s) => s.setLocale);
  const { t, i18n } = useTranslation();

  // 错误边界为类组件，无法用 Hook：在此注入基于 i18n 实例的错误文案提取器
  useEffect(() => setErrorTextResolver((error) => i18n.t("errors.renderFailedTitle") + ": " + error.message), [i18n]);

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale, i18n]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleStore(next);
    },
    [setLocaleStore],
  );

  return { locale, setLocale, locales: SUPPORTED_LOCALES, t };
}
