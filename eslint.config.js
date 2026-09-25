/**
 * 定义项目的 ESLint 规则与忽略范围。
 */
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "dist-server", "apps/bff/generated", "packages/hazard-domain/dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs["recommended-latest"],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "apps/web/src/services/analytics/contracts/**/*.ts",
      "apps/web/src/services/analytics/analyticsService.ts",
      "apps/web/src/features/analytics/**/*.{ts,tsx}",
      "apps/web/src/components/ChartsPanel.tsx",
      "apps/web/src/components/InsightsPanel.tsx",
      "apps/web/src/components/DataQualityMonitor.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);
