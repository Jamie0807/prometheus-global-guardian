import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsPage from "../../src/features/analytics/AnalyticsPage";
import LegacyAnalyticsPage from "../../src/components/AnalyticsPage";
import { parseStatistics } from "../../src/services/analytics/contracts/statistics";
import { parsePredictions } from "../../src/services/analytics/contracts/predictions";
import { parseRiskAssessment } from "../../src/services/analytics/contracts/risk";
import { UIStateProvider } from "../../src/state/UIStateContext";

const mapStateMocks = vi.hoisted(() => ({
  hazards: [
    {
      id: "hazard-1",
      title: "Test earthquake",
      type: "EARTHQUAKE",
      geometry: { type: "Point", coordinates: [116.4, 39.9] },
      description: "Test event",
      source: "USGS",
      magnitude: 5.2,
    },
  ],
}));

const analyticsServiceMocks = vi.hoisted(() => ({
  assessDataQuality: vi.fn().mockResolvedValue({
    success: true,
    data: {
      overallScore: 0.5,
      targetScore: 95,
      detailChecks: {
        completeness: 0.5,
        accuracy: 0.5,
        consistency: 0.5,
        timeliness: 0.5,
        validity: 0.5,
      },
      totalRecords: 1,
      status: "warning",
      issues: [],
      recommendations: [],
    },
  }),
  getQualityThresholds: vi.fn().mockResolvedValue({
    success: true,
    data: {
      completeness: 0.9,
      accuracy: 0.9,
      consistency: 0.9,
      timeliness: 0.9,
      validity: 0.9,
    },
  }),
}));

vi.mock("../../src/services/analytics/analyticsService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/services/analytics/analyticsService")>()),
  ...analyticsServiceMocks,
}));

vi.mock("../../src/features/analytics/hooks/useAnalyticsData", () => ({
  useAnalyticsData: () => ({
    serviceStatus: "online",
    predictions: {
      success: true,
      data: parsePredictions({
        earthquakePrediction: emptyModel,
        volcanoPrediction: emptyModel,
        stormPrediction: emptyModel,
        floodPrediction: emptyModel,
        wildfirePrediction: emptyModel,
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
      }),
    },
    statistics: {
      success: true,
      data: parseStatistics({
        basicStats: {
          count: 0,
          mean: { magnitude: 0 },
          std: { magnitude: null },
          min: { magnitude: 0 },
          max: { magnitude: 0 },
        },
        centralTendency: {},
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: {}, percentages: {} },
      }),
    },
    riskAssessment: {
      success: true,
      data: parseRiskAssessment({
        overallRiskScore: { score: 0, level: "MINIMAL" },
        typeRisks: {},
        geographicRisks: [],
        temporalRisks: {},
        recommendations: [],
        recommendationDetails: [],
      }),
    },
    pivot4DTrends: null,
    pivot4DRiskScores: null,
    loading: false,
    checkServiceStatus: vi.fn(),
    runAnalysis: vi.fn(),
    resetAndRunAnalysis: vi.fn(),
  }),
}));

vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => mapStateMocks,
}));

vi.mock("../../src/components/ChartsPanel", () => ({
  default: () => <div>图表内容</div>,
}));

vi.mock("../../src/components/DataVisualization", () => ({
  AlertBox: () => <div>提示内容</div>,
  LineChart: () => <div>折线图内容</div>,
  LoadingSpinner: () => <div>加载内容</div>,
  MetricCard: ({ label }: { label: string }) => <div>{label}</div>,
  ProgressBar: ({ label }: { label: string }) => <div>{label}</div>,
}));

const emptyModel = {
  status: "insufficient_data",
  reason: "not_enough_data",
  dataPoints: 0,
  minimumDataPoints: 3,
  confidence: null,
};

describe("AnalyticsPage", () => {
  it("keeps the legacy import as the feature page compatibility entry", () => {
    expect(LegacyAnalyticsPage).toBe(AnalyticsPage);
  });

  it("renders analytics boundary values while switching all five tabs", async () => {
    render(
      <UIStateProvider>
        <AnalyticsPage />
      </UIStateProvider>,
    );

    expect(screen.getByText(/强度平均值（震级）：0\.00/)).toBeInTheDocument();
    expect(screen.getByText(/强度标准差（震级）：暂无数据/)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /统计概览/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /图表可视化/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /预测结果/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /风险评估/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /数据质量/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /图表可视化/ }));
    expect(screen.getByText("图表内容")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /预测结果/ }));
    expect(screen.getByRole("heading", { name: /预测模型结果/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("模型不可用");

    fireEvent.click(screen.getByRole("button", { name: /风险评估/ }));
    expect(screen.getByRole("heading", { name: /风险评估报告/ })).toBeInTheDocument();
    expect(screen.getByText("风险分数: 0.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /数据质量/ }));
    expect(await screen.findByText("数据质量综合评分")).toBeInTheDocument();
    expect(screen.getByText("0.5")).toBeInTheDocument();
  });
});
