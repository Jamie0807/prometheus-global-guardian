/**
 * 定义组件 Vitest 测试配置。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@pgg/hazard-domain": path.resolve(repositoryRoot, "packages/hazard-domain/src/index.ts"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/component/setup.ts"],
    include: ["tests/component/**/*.test.tsx"],
  },
});
