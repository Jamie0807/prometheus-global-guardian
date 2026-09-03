import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/component/setup.ts"],
    include: ["tests/component/**/*.test.tsx"],
  },
});
