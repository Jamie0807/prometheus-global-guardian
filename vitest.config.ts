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
    },
  },
  test: {
    environment: "node",
    include: ["tests/service-*.test.ts", "tests/server-hazard-event-registry.test.ts"],
  },
});
