import { expect, test } from "@playwright/test";

test("loads the monitoring dashboard and opens the AI assistant", async ({ page }) => {
  await page.route("**/api/authorize", async (route) => {
    await route.fulfill({ json: { authorized: true } });
  });

  await page.route("**/api/hazards/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/types")) {
      await route.fulfill({
        json: [
          { type_id: "FLOOD", type_name: "Flood" },
          { type_id: "WILDFIRE", type_name: "Wildfire" },
        ],
      });
      return;
    }

    await route.fulfill({
      json: [
        {
          app_ID: 1,
          app_IDs: "1",
          autoexpire: "false",
          category_ID: "EVENT",
          charter_Uri: "",
          comment_Text: "",
          create_Date: "2026-09-03T00:00:00.000Z",
          creator: "Playwright",
          end_Date: "",
          glide_Uri: "",
          hazard_ID: 101,
          hazard_Name: "Mock Flood",
          last_Update: "2026-09-03T00:00:00.000Z",
          latitude: 31.23,
          longitude: 121.47,
          master_Incident_ID: "mock-101",
          message_ID: "mock-message-101",
          org_ID: 1,
          severity_ID: "HIGH",
          snc_url: "",
          start_Date: "2026-09-03T00:00:00.000Z",
          status: "ACTIVE",
          type_ID: "FLOOD",
          update_Date: "2026-09-03T00:00:00.000Z",
          update_User: null,
          product_total: "0",
          uuid: "mock-101",
          in_Dashboard: "true",
          areabrief_url: null,
          description: "Mocked hazard for browser smoke testing",
          roles: [],
        },
      ],
    });
  });

  await page.route("**/api/ai/**", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: 'data: {"choices":[{"delta":{"content":"Mocked AI analysis"}}]}\n\ndata: [DONE]\n\n',
    });
  });

  await page.route("https://api.mapbox.com/**", async (route) => {
    await route.abort();
  });

  await page.route("**/health", async (route) => {
    await route.fulfill({ json: { status: "ok" } });
  });

  await page.goto("/");

  await expect(page).toHaveTitle("实时全球环境灾害监控平台与可视化平台");
  await expect(
    page.getByRole("heading", { name: "实时全球环境灾害监控平台与可视化平台", exact: true }),
  ).toBeVisible();
  await expect(page.getByAltText("Prometheus Logo")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开 AI 灾害分析助手" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开数据分析面板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开保存报告弹窗" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开设置弹窗" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "实时监控" })).toBeVisible();
  await expect(page.getByText("灾害总数", { exact: true })).toBeVisible();
  await expect(page.getByLabel("按类型筛选")).toBeVisible();
  await expect(page.locator(".total-count")).toHaveCSS("gap", "12px");
  await expect(page.getByRole("button", { name: "刷新数据" })).toHaveCSS(
    "justify-content",
    "center",
  );

  const hazardFilter = page.getByLabel("按类型筛选");
  await expect(hazardFilter.getByRole("option", { name: "洪水" })).toHaveAttribute(
    "value",
    "FLOOD",
  );
  await hazardFilter.selectOption("FLOOD");
  await expect(hazardFilter).toHaveValue("FLOOD");

  await page.getByRole("button", { name: "打开 AI 灾害分析助手" }).click();
  await expect(page.getByRole("heading", { name: "AI 灾害分析助手", exact: true })).toBeVisible();

  const chatInput = page.getByPlaceholder(/输入灾害分析问题/);
  await chatInput.fill("Summarize the flood risk");
  await chatInput.press("Enter");
  await expect(page.getByText("Mocked AI analysis", { exact: true })).toBeVisible();
});
