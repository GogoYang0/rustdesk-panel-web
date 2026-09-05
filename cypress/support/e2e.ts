/**
 * Cypress 全局支持（M4-T07）。
 *
 * - 导入自定义命令（mock 登录态 / 会话与权限拦截）；
 * - 吞掉与被测应用无关的浏览器层异常（ResizeObserver 等），避免误伤断言。
 */
import "./commands";

// ResizeObserver / 资源加载类噪声异常不视为用例失败
Cypress.on("uncaught:exception", (err) => {
  if (
    err.message.includes("ResizeObserver loop") ||
    err.message.includes("Script error.") ||
    err.message.includes("cross origin")
  ) {
    return false;
  }
  return true;
});
