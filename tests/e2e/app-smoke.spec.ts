/** 验证监控仪表盘及 AI 助手的端到端基础可用性。 */
import { expect, test } from "@playwright/test";

test("loads the monitoring dashboard and opens the AI assistant", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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

  const popupPosition = await page.evaluate(() => {
    const popup = document.createElement("div");
    popup.className = "mapboxgl-popup mapboxgl-popup-anchor-bottom";
    document.body.append(popup);
    const position = window.getComputedStyle(popup).position;
    popup.remove();
    return position;
  });
  expect(popupPosition).toBe("absolute");

  const toolbarStyle = await page.evaluate(() => {
    const reference = document.querySelector<HTMLElement>(".map-mode-switch");
    const referenceLabel = document.querySelector<HTMLElement>(".map-mode-button:not(.active)");
    const actions = Array.from(document.querySelectorAll<HTMLElement>(".header-action"));
    if (!reference || !referenceLabel) return null;
    const surface = window.getComputedStyle(reference);
    const label = window.getComputedStyle(referenceLabel);
    return {
      height: reference.getBoundingClientRect().height,
      backgroundColor: surface.backgroundColor,
      borderColor: surface.borderColor,
      borderRadius: surface.borderRadius,
      backdropFilter: surface.backdropFilter,
      color: label.color,
      fontSize: label.fontSize,
      fontWeight: label.fontWeight,
      letterSpacing: label.letterSpacing,
      actions: actions.map((action) => {
        const style = window.getComputedStyle(action);
        return {
          height: action.getBoundingClientRect().height,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderColor,
          borderRadius: style.borderRadius,
          backdropFilter: style.backdropFilter,
          color: style.color,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
        };
      }),
    };
  });
  expect(toolbarStyle?.actions).toHaveLength(6);
  for (const action of toolbarStyle?.actions ?? []) {
    expect(action).toEqual({
      height: toolbarStyle?.height,
      backgroundColor: toolbarStyle?.backgroundColor,
      borderColor: toolbarStyle?.borderColor,
      borderRadius: toolbarStyle?.borderRadius,
      backdropFilter: toolbarStyle?.backdropFilter,
      color: toolbarStyle?.color,
      fontSize: toolbarStyle?.fontSize,
      fontWeight: toolbarStyle?.fontWeight,
      letterSpacing: toolbarStyle?.letterSpacing,
    });
  }

  await expect(page).toHaveTitle("实时全球环境灾害监控平台与可视化平台");
  await expect(page.getByRole("heading", { name: "全球灾害态势", exact: true })).toBeVisible();
  await expect(page.getByText("PROMETHEUS · GLOBAL GUARDIAN")).toBeVisible();
  await expect(page.getByAltText("Prometheus Logo")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开 AI 灾害分析助手" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开数据分析面板" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开保存报告弹窗" })).toBeVisible();
  await expect(page.getByRole("button", { name: "打开设置弹窗" })).toBeVisible();
  const twoDButton = page.getByRole("button", { name: "2D 视图" });
  const threeDButton = page.getByRole("button", { name: "3D 地形" });
  await expect(twoDButton).toHaveAttribute("aria-pressed", "true");
  await threeDButton.click();
  await expect(threeDButton).toHaveAttribute("aria-pressed", "true");
  await twoDButton.click();
  await expect(twoDButton).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "实时监控" })).toBeVisible();
  const platformTitle = page.locator(".platform-title");
  const statusPanel = page.locator(".status-panel");
  const [platformTitleBox, statusPanelBox] = await Promise.all([
    platformTitle.boundingBox(),
    statusPanel.boundingBox(),
  ]);
  expect(platformTitleBox).not.toBeNull();
  expect(statusPanelBox).not.toBeNull();
  expect(platformTitleBox?.x).toBe(statusPanelBox?.x);
  await expect(page.getByText("灾害总数", { exact: true })).toBeVisible();
  await expect(page.getByLabel("按类型筛选")).toBeVisible();
  await expect(page.locator(".total-count")).toHaveCSS("gap", "10px");
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

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(twoDButton).toBeVisible();
  await expect(threeDButton).toBeVisible();
  const [mobileHeaderBox, mobileStatusBox, mobileLegendBox] = await Promise.all([
    page.locator(".header").boundingBox(),
    page.locator(".status-panel").boundingBox(),
    page.locator(".legend-panel").boundingBox(),
  ]);
  for (const box of [mobileHeaderBox, mobileStatusBox, mobileLegendBox]) {
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  }
  expect(
    mobileStatusBox!.x + mobileStatusBox!.width <= mobileLegendBox!.x ||
      mobileLegendBox!.x + mobileLegendBox!.width <= mobileStatusBox!.x ||
      mobileStatusBox!.y + mobileStatusBox!.height <= mobileLegendBox!.y ||
      mobileLegendBox!.y + mobileLegendBox!.height <= mobileStatusBox!.y,
  ).toBe(true);

  await page.getByRole("button", { name: "打开 AI 灾害分析助手" }).click();
  await expect(page.getByRole("heading", { name: "AI 灾害分析助手", exact: true })).toBeVisible();

  const chatInput = page.getByPlaceholder(/输入灾害分析问题/);
  await chatInput.fill("Summarize the flood risk");
  await chatInput.press("Enter");
  await expect(page.getByText("Mocked AI analysis", { exact: true })).toBeVisible();
});
