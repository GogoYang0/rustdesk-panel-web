// ESLint 9 Flat Config（M4-T01）
// 组成：@eslint/js 基础规则 + typescript-eslint 类型感知规则 + react-hooks + react-refresh + prettier。
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    // 构建产物、依赖与生成代码不参与 lint（api-types.ts 由 openapi-typescript 生成）
    ignores: ["dist", "node_modules", "coverage", "src/types/api-types.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // 全站禁用 forwardRef（React 19 ref as prop）
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='React'][property.name='forwardRef']",
          message: "React 19 全站禁用 forwardRef，请使用 ref as prop。",
        },
        {
          selector: "CallExpression[callee.name='forwardRef']",
          message: "React 19 全站禁用 forwardRef，请使用 ref as prop。",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // 配置文件与插件允许默认导出
    files: ["vite.config.ts", "vitest.config.ts", "cypress.config.ts", "build/**/*.ts"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // 纯数据/常量模块（无 React 组件）：关闭 react-refresh 告警
    files: [
      "src/router/routes.tsx",
      "src/router/menuFilter.ts",
      "src/api/queryKeys.ts",
      "src/utils/errorText.ts",
      "src/components/ErrorBoundary.tsx",
    ],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  prettier,
);
