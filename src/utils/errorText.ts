/**
 * 错误文案提取小工具（M4-T03 修复批次）。
 *
 * `ErrorBoundary` 为类组件，无法使用 `useTranslation` Hook；其降级 UI 需要
 * 一个**与 i18n 实例解耦**、且**不依赖 class 组件新增类型字段**的实现方式
 * （避免类组件字段声明初始化顺序问题）。
 *
 * 本模块通过全局注册表提供「错误边界文案提取器」：
 * 默认实现直接返回错误自身 message；`App` 挂载时调用
 * `registerErrorTextResolver()` 注入 i18next 版本（走 `i18n.t()`）。
 */

/** 错误 → 展示文案的提取函数。 */
export type ErrorTextResolver = (error: Error) => string;

/** 默认实现：直接返回错误 message（i18n 未注册时的兜底）。 */
const defaultResolver: ErrorTextResolver = (error) => error.message;

/** 当前生效的提取器。 */
let resolver: ErrorTextResolver = defaultResolver;

/**
 * 获取错误展示文案。
 *
 * @param error 捕获到的错误
 * @returns 面向用户的错误文案
 */
export function getErrorText(error: Error): string {
  return resolver(error);
}

/**
 * 注册（或还原）错误文案提取器。
 *
 * @param next 新的提取器；省略则还原默认实现
 * @returns 清理函数（组件卸载时调用可还原）
 */
export function setErrorTextResolver(next?: ErrorTextResolver): () => void {
  resolver = next ?? defaultResolver;
  return () => {
    resolver = defaultResolver;
  };
}
