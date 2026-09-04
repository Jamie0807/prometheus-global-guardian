import { describe, expect, it } from "vitest";

import {
  formatRiskRecommendation,
  formatAnalyticsSignedPercent,
  getPredictionDisplay,
  getRiskLevelLabel,
  getTrendLabel,
  localizeAnalyticsMessage,
  normalizeQualityReport,
  normalizeQualityScore,
} from "../src/services/analytics/analyticsPresentation";

describe("analytics presentation semantics", () => {
  it("explains insufficient prediction data instead of showing N/A", () => {
    expect(
      getPredictionDisplay({
        status: "insufficient_data",
        dataPoints: 2,
        minimumDataPoints: 5,
      }),
    ).toMatchObject({
      status: "insufficient_data",
      label: "样本不足",
      detail: "已有 2 条，至少需要 5 条",
      accuracyLabel: "暂无数据",
    });
  });

  it("normalizes model failures and invalid accuracy values", () => {
    expect(
      getPredictionDisplay({
        status: "model_error",
        accuracy: Number.NaN,
      }),
    ).toMatchObject({
      status: "model_error",
      label: "模型失败",
      accuracyLabel: "暂无数据",
    });
  });

  it("clamps quality scores and maps backend risk vocabulary", () => {
    expect(normalizeQualityScore(-0.2)).toBe(0);
    expect(normalizeQualityScore(1.2)).toBe(1);
    expect(normalizeQualityScore(Number.POSITIVE_INFINITY)).toBeNull();
    expect(getRiskLevelLabel("LOW")).toBe("低风险");
    expect(getTrendLabel("increasing")).toBe("上升");
    expect(formatAnalyticsSignedPercent(-12.5)).toBe("-12.5%");
  });

  it("normalizes quality reports before rendering", () => {
    expect(
      normalizeQualityReport({
        overallScore: 34.4,
        status: "FAIL",
        detailChecks: { completeness: 0.778, consistency: -2 },
        totalRecords: 679.8,
        issues: ["Found unknown hazard types: STORM"],
        recommendations: ["Add missing fields: latitude, longitude"],
      }),
    ).toEqual({
      overallScore: 34.4,
      status: "fail",
      detailChecks: {
        completeness: 0.778,
        accuracy: 0,
        consistency: 0,
        timeliness: 0,
        validity: 0,
      },
      totalRecords: 679,
      issues: ["Found unknown hazard types: STORM"],
      recommendations: ["Add missing fields: latitude, longitude"],
    });
    expect(localizeAnalyticsMessage("Found unknown hazard types: STORM")).toBe(
      "发现未知灾害类型： STORM",
    );
  });

  it("renders a localized recommendation with its trigger metric", () => {
    expect(
      formatRiskRecommendation({
        ruleId: "overall_high",
        severity: "warning",
        message: "High risk detected.",
        metrics: { score: 65, threshold: 60 },
      }),
    ).toEqual({
      severityLabel: "重点关注",
      text: "总体风险达到 65.0 分（阈值 60.0 分），建议加强监测并准备响应团队。",
    });
  });
});
