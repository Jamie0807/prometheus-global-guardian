/** 验证监控仪表盘及 AI 助手的端到端基础可用性。 */
import { expect, test } from "@playwright/test";

test("loads the monitoring dashboard and opens the AI assistant", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/authorize", async (route) => {
    await route.fulfill({ json: { authorized: true } });
  });

  await page.route("**/api/hazards**", async (route) => {
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
      json: {
        hazards: [
          {
            id: "mock-101",
            title: "Mock Flood",
            type: "FLOOD",
            geometry: { type: "Point", coordinates: [121.47, 31.23] },
            description: "Mocked hazard for browser smoke testing",
            source: "DisasterAWARE",
            severity: "HIGH",
            timestamp: "2026-09-03T00:00:00.000Z",
          },
        ],
        meta: {
          primary: "disasteraware",
          fallbackUsed: false,
          stale: false,
          generatedAt: "2026-09-03T00:00:00.000Z",
          sources: [
            { id: "disasteraware", status: "success", count: 1 },
            { id: "usgs", status: "empty", count: 0 },
            { id: "nasa-eonet", status: "empty", count: 0 },
            { id: "gdacs", status: "empty", count: 0 },
          ],
        },
      },
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
  await page.route("**/api/v1/statistics", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          basicStats: {
            count: 1,
            mean: { magnitude: 5 },
            std: { magnitude: 0 },
            min: { magnitude: 5 },
            max: { magnitude: 5 },
          },
          centralTendency: {},
          variabilityMeasures: {},
          distributionMetrics: {},
          typeDistribution: { counts: { FLOOD: 1 }, percentages: { FLOOD: 100 } },
        },
      },
    });
  });
  const unavailableModel = {
    status: "insufficient_data",
    reason: "not_enough_data",
    dataPoints: 1,
    minimumDataPoints: 3,
    confidence: null,
  };
  await page.route("**/api/v1/predictions", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          earthquakePrediction: unavailableModel,
          volcanoPrediction: unavailableModel,
          stormPrediction: unavailableModel,
          floodPrediction: unavailableModel,
          wildfirePrediction: unavailableModel,
          overallRiskAssessment: {
            status: "failed",
            reason: "model_error",
            overallRiskScore: null,
            riskLevel: "UNKNOWN",
            averageAccuracy: null,
            confidence: null,
            modelWeights: {},
            recommendation: "",
          },
        },
      },
    });
  });
  await page.route("**/api/v1/risk-assessment", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          overallRiskScore: { score: 20, level: "LOW" },
          typeRisks: {},
          geographicRisks: [],
          temporalRisks: {},
          recommendations: [],
          recommendationDetails: [],
        },
      },
    });
  });
  await page.route("**/api/v1/quality/thresholds", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          completeness: 0.9,
          accuracy: 0.95,
          consistency: 0.98,
          timeliness: 0.85,
          validity: 0.95,
        },
      },
    });
  });
  await page.route("**/api/v1/quality/assess", async (route) => {
    await route.fulfill({
      json: {
        success: true,
        data: {
          overallScore: 92.4,
          targetScore: 95,
          status: "PASS",
          detailChecks: {
            completeness: 0.96,
            accuracy: 0.98,
            consistency: 0.99,
            timeliness: 0.92,
            validity: 0.97,
          },
          totalRecords: 1,
          issues: [],
          recommendations: [],
        },
      },
    });
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

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "打开数据分析面板" }).click();
  const analyticsPage = page.locator(".analytics-page");
  await expect(analyticsPage).toBeVisible();
  const floodProgress = analyticsPage.getByRole("progressbar", { name: "FLOOD" });
  await expect(floodProgress).toHaveAttribute("aria-valuenow", "1");
  await expect(floodProgress.locator(":scope > div")).toHaveCSS(
    "background-color",
    "rgb(103, 232, 249)",
  );
  expect(
    await analyticsPage.evaluate((element) =>
      getComputedStyle(element).getPropertyValue("--analytics-accent").trim(),
    ),
  ).toBe("#67e8f9");

  const analyticsTabs: Array<{
    name: RegExp;
    heading?: RegExp;
    surfaceSelector?: string;
    surfaceBackground?: string;
    surfaceGradient?: boolean;
  }> = [
    {
      name: /统计概览/,
      heading: /描述性统计分析/,
      surfaceSelector: ".analytics-surface--inset",
      surfaceBackground: "rgba(3, 12, 28, 0.82)",
    },
    {
      name: /图表可视化/,
      heading: /4类交互式分析图表/,
      surfaceSelector: ".analytics-chart-summary-card",
      surfaceBackground: "rgba(3, 12, 28, 0.82)",
    },
    {
      name: /预测结果/,
      heading: /预测模型结果/,
      surfaceSelector: ".analytics-prediction-summary",
      surfaceGradient: true,
    },
    {
      name: /风险评估/,
      heading: /风险评估报告/,
      surfaceSelector: ".analytics-risk-summary",
      surfaceBackground: "rgba(3, 12, 28, 0.82)",
    },
    {
      name: /数据质量/,
      heading: /数据质量综合评分/,
    },
  ];
  for (const tab of analyticsTabs) {
    const tabButton = page.getByRole("button", { name: tab.name });
    await tabButton.click();
    await expect(tabButton).toHaveClass(/is-active/);
    await expect(tabButton).toHaveCSS("border-bottom-color", "rgb(103, 232, 249)");
    const tabPanel = analyticsPage.locator(".analytics-tab-panel");
    await expect(tabPanel).toBeVisible();
    await expect(tabPanel).toHaveCSS("border-top-color", "rgba(125, 211, 252, 0.3)");
    if (tab.heading) {
      await expect(tabPanel.getByRole("heading", { name: tab.heading })).toHaveClass(
        /analytics-heading/,
      );
    }
    if (tab.surfaceSelector) {
      const themedSurface = tabPanel.locator(tab.surfaceSelector).first();
      await expect(themedSurface).toBeVisible();
      if (tab.surfaceBackground) {
        await expect(themedSurface).toHaveCSS("background-color", tab.surfaceBackground);
      }
      if (tab.surfaceGradient) {
        expect(
          await themedSurface.evaluate((element) => getComputedStyle(element).backgroundImage),
        ).toContain("linear-gradient");
      }
    }
    if (tab.name.source === "数据质量") {
      const overallScore = tabPanel.locator(".analytics-quality-overall-score");
      await expect(overallScore).toBeVisible();
      expect(
        await overallScore.evaluate((element) => getComputedStyle(element).backgroundImage),
      ).toContain("linear-gradient");
      const dimensions = tabPanel.locator(".analytics-quality-dimension");
      await expect(dimensions).toHaveCount(5);
      await expect(tabPanel.getByText("阈值: 95%", { exact: true })).toHaveCount(2);
      await expect(dimensions.first()).toHaveCSS("background-color", "rgba(3, 12, 28, 0.82)");
      await expect(dimensions.first()).toHaveCSS("border-top-color", "rgba(148, 193, 225, 0.13)");
    }
  }
  await page.getByRole("button", { name: /关闭/ }).click();

  await page.getByRole("button", { name: "打开 AI 灾害分析助手" }).click();
  await expect(page.getByRole("heading", { name: "AI 灾害分析助手", exact: true })).toBeVisible();

  const chatInput = page.getByPlaceholder(/输入灾害分析问题/);
  await chatInput.fill("Summarize the flood risk");
  await chatInput.press("Enter");
  await expect(page.getByText("Mocked AI analysis", { exact: true })).toBeVisible();
});
