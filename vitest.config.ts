/**
 * 定义服务层 Vitest 测试配置。
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/service-*.test.ts", "tests/server-hazard-event-registry.test.ts"],
  },
});
