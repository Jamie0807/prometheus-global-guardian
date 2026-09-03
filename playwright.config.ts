import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4174",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm run build && PORT=4174 pnpm start",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
  },
});
