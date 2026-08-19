/**
 * i18next 初始化（M4-T03）。
 *
 * 语言集：`zh-CN`（默认）/ `en-US`（OQ-11：自建 key，不逐字对齐参考项目）。
 * 命名空间：`common` | `menu`（T04 起追加 `pages` / `errors`）。
 *
 * 资源直接内联（Vite 静态 import JSON），无需二次请求。
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import zhCNCommon from "@/i18n/locales/zh-CN/common.json";
import zhCNMenu from "@/i18n/locales/zh-CN/menu.json";
import enUSCommon from "@/i18n/locales/en-US/common.json";
import enUSMenu from "@/i18n/locales/en-US/menu.json";

/** 命名空间列表（顺序即默认加载顺序）。 */
export const I18N_NAMESPACES = ["common", "menu"] as const;

/** 默认语言。 */
export const DEFAULT_LOCALE = "zh-CN";

/** i18n 资源包。 */
const resources = {
  "zh-CN": {
    common: zhCNCommon,
    menu: zhCNMenu,
  },
  "en-US": {
    common: enUSCommon,
    menu: enUSMenu,
  },
} as const;

/**
 * 初始化 i18next（模块加载即执行一次）。
 *
 * 语言初始值取 localStorage 持久化的 uiStore.locale（若有），否则默认 zh-CN。
 */
function readInitialLocale(): string {
  try {
    const raw = localStorage.getItem("rdp-ui");
    if (raw) {
      const parsed = JSON.parse(raw) as { state?: { locale?: string } };
      const locale = parsed.state?.locale;
      if (locale === "zh-CN" || locale === "en-US") {
        return locale;
      }
    }
  } catch {
    // 忽略解析失败，回退默认语言
  }
  return DEFAULT_LOCALE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: readInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  ns: [...I18N_NAMESPACES],
  defaultNS: "common",
  interpolation: {
    // React 已做 XSS 转义，无需 i18next 再转义
    escapeValue: false,
  },
  returnNull: false,
});

/** 供非 React 上下文使用的 i18n 实例。 */
export default i18n;
