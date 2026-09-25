/**
 * 定义服务层 Vitest 测试配置。
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@pgg/hazard-domain": path.resolve(repositoryRoot, "packages/hazard-domain/src/index.ts"),
      "@pgg/logging": path.resolve(repositoryRoot, "packages/logging/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "apps/web/tests/services/**/*.test.ts",
      "apps/bff/tests/service-*.test.ts",
      "apps/bff/tests/server-hazard-event-registry.test.ts",
      "tests/integration/**/*.test.ts",
      "infra/persistence/tests/**/*.test.ts",
      "packages/logging/tests/**/*.test.ts",
    ],
  },
});
