import type { Plugin } from "vite";

/**
 * 方案 A：自定义 Vite 插件（仅 `transform` 钩子），对 Semi 的 CSS 做 `@layer semi{...}` 包裹。
 *
 * ## 为什么需要它
 *
 * Semi 官方的 CSS Layer 能力只提供 webpack / rspack 插件
 * （`@douyinfe/semi-webpack-plugin` / `@douyinfe/semi-rspack-plugin` 的 `cssLayer: true`），
 * 官方文档明确说明「使用非 webpack / rspack 构建的用户请参照原理自行对 semi 的 css 进行 layer 包裹」。
 * 本项目使用 Vite（既非 webpack 也非 rspack），故必须自实现等价物。
 *
 * ## 官方实现原理
 *
 * 官方插件（`cssLayer: true`）的本质是把最终 CSS 文本整体包一层 `@layer semi`：
 *
 * ```js
 * finalCSS = '@layer semi{' + finalCSS + '}';
 * ```
 *
 * 一旦 Semi 的全部样式落入 `@layer semi`，配合 `src/styles/semi-layer.css` 声明的层顺序
 *
 * ```css
 * @layer theme, base, semi, utilities;
 * ```
 *
 * 即可得到正确优先级：`theme` < `base`（含 Tailwind Preflight）< `semi` < `utilities`（用户原子类）。
 * 从而同时解决官方文档描述的两个问题：
 * ① Tailwind 原子类（如 `px-8`）能覆盖 Semi 组件样式；
 * ② Tailwind Preflight 不会把 Semi light 态 Button 的背景冲成 transparent。
 *
 * ## 为什么放在 `transform` 钩子
 *
 * Vite dev 与 build 两条路径下，CSS 文件都会经过 `transform` 钩子（dev 下 CSS 请求走同一管线），
 * 因此「包裹后返回」即可在两种模式下同时生效：
 * - dev(HMR)：CSS 以 `<style>` 注入，包裹后的 `@layer semi{...}` 直接进 DOM；
 * - 生产构建：每个 chunk 的 CSS 被包裹后合并，`@layer semi` 依旧有效。
 *
 * @returns Vite `Plugin` 实例（具名导出，供 `vite.config.ts` 调用）。
 */
export function semiCssLayer(): Plugin {
  /**
   * Semi 相关包的 CSS 路径匹配规则。
   *
   * 归一化为 POSIX 路径后需同时覆盖两种真实路径形态：
   *
   * 1) 普通安装（npm / yarn / 非严格 pnpm）：
   *    `.../node_modules/@douyinfe/semi-ui/lib/es/button/button.css`
   *
   * 2) pnpm 的虚拟 store 路径（`@` 被替换为 `+`，且带 `@版本号` 后缀）：
   *    `.../node_modules/.pnpm/@douyinfe+semi-ui@2.103.0_<hash>/node_modules/@douyinfe/semi-ui/lib/es/button/button.css`
   *
   * 因此用 `@douyinfe[/+]semi-(ui|icons|foundation)` 覆盖 `@douyinfe/semi-ui` 与
   * `@douyinfe+semi-ui` 两种片段写法，避免依赖 `node_modules/` 前缀（pnpm 下会出现两次）。
   *
   * 注：`@douyinfe/semi-theme-default` 等包不在包裹范围（官方插件只处理 ui/icons/foundation）。
   */
  const SEMI_CSS_RE = /@douyinfe[/+]semi-(ui|icons|foundation)\//;

  /** 仅处理 CSS 文件（`.css`，允许 Vite 的查询参数跟在后面，如 `.css?used`）。 */
  const CSS_EXT_RE = /\.css$/;

  /** 幂等判定：内容是否已以 `@layer semi{` 开头（去掉前导空白后）。 */
  const ALREADY_WRAPPED_RE = /^\s*@layer\s+semi\s*\{/;

  return {
    // 插件名沿用设计文档 §2.4 的命名（等价于官方 webpack/rspack 插件的 cssLayer 能力）
    name: "vite-plugin-semi-css-layer",
    // dev 与 build 双路径均需生效（Vite 两种模式下 CSS 都走 transform 钩子）
    // enforce 不设置，保持与其它 CSS 处理插件（@tailwindcss/vite）的自然顺序

    /**
     * 对 Semi 的 CSS 源码做 `@layer semi{...}` 包裹。
     *
     * @param code 源文件内容（CSS 文本）
     * @param id   模块 id，可能形如 `/path/to/x.css`、`/path/to/x.css?used`、`/path/to/x.css?inline`
     *             （Windows 下可能是反斜杠路径，故先做 POSIX 归一化）
     * @returns 包裹后的 CSS 源码；非 Semi CSS 或已包裹时返回 `null`（表示不修改）
     */
    transform(code: string, id: string): string | null {
      // ① POSIX 归一化：Windows 的 `\` 统一成 `/`，否则正则在 Windows 上失配
      const normalizedId = id.replace(/\\/g, "/");

      // ② 剥离 CSS 查询参数（`?used`、`?inline`、`?direct` 等）后再判断后缀，
      //    否则 `/x.css?used` 无法命中 `.css$`
      const pathWithoutQuery = normalizedId.split("?")[0];

      // ③ 只处理 Semi 的 CSS 文件
      if (!SEMI_CSS_RE.test(normalizedId) || !CSS_EXT_RE.test(pathWithoutQuery)) {
        return null;
      }

      // ④ 幂等保护：已包裹过则原样跳过，避免出现 `@layer semi{@layer semi{...}}`
      //    （理论上 transform 每个文件只走一次，此处为防重复命中同一文件的保险）
      if (ALREADY_WRAPPED_RE.test(code)) {
        return null;
      }

      // ⑤ 与官方实现等价：`finalCSS = '@layer semi{' + finalCSS + '}'`
      //    首尾各留换行，保证包裹后仍是合法 CSS（即使原文件末尾无换行）
      return `@layer semi{\n${code}\n}`;
    },
  };
}
