/** 验证分析核心结果组件对统计、预测和风险数据的呈现。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OverviewTab from "../../apps/web/src/features/analytics/components/tabs/OverviewTab";
import PredictionsTab from "../../apps/web/src/features/analytics/components/tabs/PredictionsTab";
import RiskTab from "../../apps/web/src/features/analytics/components/tabs/RiskTab";
import InsightsPanel from "../../apps/web/src/components/InsightsPanel";
import ChartsPanel from "../../apps/web/src/components/ChartsPanel";
import { parseStatistics } from "../../apps/web/src/services/analytics/contracts/statistics";
import { parsePredictions } from "../../apps/web/src/services/analytics/contracts/predictions";
import { parseRiskAssessment } from "../../apps/web/src/services/analytics/contracts/risk";
import type { AnalyticsHazard } from "../../apps/web/src/features/analytics/types";

const serviceMocks = vi.hoisted(() => ({ getStatistics: vi.fn(), getRiskAssessment: vi.fn() }));
vi.mock("../../apps/web/src/services/analytics/analyticsService", () => serviceMocks);
vi.mock("../../apps/web/src/components/DataVisualization", () => ({ LineChart: () => <div /> }));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  BarChart: () => null,
  Bar: () => null,
  LineChart: () => null,
  Line: () => null,
  AreaChart: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const hazards: AnalyticsHazard[] = [
  {
    id: "test",
    title: "Test",
    type: "EARTHQUAKE",
    geometry: { type: "Point", coordinates: [0, 0] },
    description: "Test",
    source: "USGS",
  },
];
const statistics = parseStatistics({
  basicStats: { count: 1, mean: { magnitude: 0 }, std: { magnitude: null }, min: {}, max: {} },
  centralTendency: {},
  variabilityMeasures: { standardDeviation: null, range: 0, coefficientOfVariation: 0 },
  distributionMetrics: { q50: 0, iqr: null, skewness: null },
  typeDistribution: { counts: { EARTHQUAKE: 1 }, percentages: { EARTHQUAKE: 100 } },
});
const failedModel = {
  status: "failed",
  reason: "model_error",
  dataPoints: 3,
  minimumDataPoints: 3,
  confidence: null,
};

describe("validated analytics result consumers", () => {
  it("最新灾害缺少严重程度时显示中文回退文案", () => {
    render(<InsightsPanel hazards={hazards} />);

    expect(screen.getByText("暂无 | 时间未知")).toBeInTheDocument();
  });

  it("renders top-level severity and timestamp in latest hazards", () => {
    render(
      <InsightsPanel
        hazards={[
          {
            ...hazards[0],
            severity: "WATCH",
            timestamp: "2026-09-17T09:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.getByText("WATCH | 2026-09-17T09:00:00.000Z")).toBeInTheDocument();
  });

  it.each([0, null])(
    "renders actual statistics fields with mean %s and legitimate zero values",
    (mean) => {
      render(
        <OverviewTab
          hazards={hazards}
          hazardsByType={{ EARTHQUAKE: 1 }}
          intensityData={[]}
          statistics={{
            success: true,
            data: {
              ...statistics,
              descriptiveStatistics: {
                ...statistics.descriptiveStatistics,
                basicStats: {
                  ...statistics.descriptiveStatistics.basicStats,
                  mean: { magnitude: mean },
                },
              },
            },
          }}
          pivot4DTrends={null}
          pivot4DRiskScores={null}
        />,
      );
      expect(screen.getByText("平均波动幅度")).toBeInTheDocument();
      expect(screen.getAllByText("0.00").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("✓ 集中")).toBeInTheDocument();
      expect(screen.getAllByText("暂无数据").length).toBeGreaterThan(0);
      expect(screen.getByText(/强度平均值（震级）：/)).toHaveTextContent(
        mean === null ? "暂无数据" : "0.00",
      );
    },
  );

  it("formats validated temporal metrics safely and keeps legacy recommendation strings", () => {
    render(
      <RiskTab
        riskAssessment={{
          success: true,
          data: parseRiskAssessment({
            overallRiskScore: { score: 0, level: "MINIMAL" },
            typeRisks: {},
            geographicRisks: [],
            temporalRisks: {
              recent7Days: 0,
              previous7Days: 0,
              growthRate: 0,
              trend: "stable",
            },
            recommendations: ["Maintain monitoring"],
            recommendationDetails: [],
          }),
        }}
      />,
    );
    expect(screen.getByText("Maintain monitoring")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("趋势: 稳定")).toBeInTheDocument();
  });

  it("shows unavailable predictions for model and overall failures", () => {
    const data = parsePredictions({
      earthquakePrediction: failedModel,
      volcanoPrediction: failedModel,
      stormPrediction: failedModel,
      floodPrediction: failedModel,
      wildfirePrediction: failedModel,
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
    });
    render(<PredictionsTab predictions={{ success: true, data }} />);
    expect(screen.getAllByText("模型失败").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText("模型不可用")).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("用中文显示预测天数标签", () => {
    const readyModel = {
      status: "ready",
      reason: "ready",
      dataPoints: 3,
      minimumDataPoints: 3,
      confidence: 0.8,
      accuracy: 80,
      predictions: { next7Days: [1] },
    };
    const data = parsePredictions({
      earthquakePrediction: readyModel,
      volcanoPrediction: readyModel,
      stormPrediction: readyModel,
      floodPrediction: readyModel,
      wildfirePrediction: readyModel,
      overallRiskAssessment: {
        status: "ready",
        reason: "ready",
        overallRiskScore: 20,
        riskLevel: "LOW",
        averageAccuracy: 80,
        confidence: 0.8,
        modelWeights: {},
        recommendation: "",
      },
    });

    render(<PredictionsTab predictions={{ success: true, data }} />);

    expect(screen.getAllByText("第 1 天")).toHaveLength(5);
  });

  it.each([0, 75])("uses the validated risk score %s without scaling it", async (score) => {
    serviceMocks.getRiskAssessment.mockResolvedValue({
      success: true,
      data: parseRiskAssessment({
        overallRiskScore: { score, level: "HIGH" },
        typeRisks: {},
        geographicRisks: [],
        temporalRisks: {},
        recommendations: [],
        recommendationDetails: [],
      }),
    });
    render(<InsightsPanel hazards={hazards} />);
    expect(await screen.findByText(`${score.toFixed(1)} / 100`)).toBeInTheDocument();
    expect(screen.getByText("高风险")).toBeInTheDocument();
  });

  it("selects magnitude statistics from column maps without formatting an object", async () => {
    serviceMocks.getStatistics.mockResolvedValue({ success: true, data: statistics });
    render(<ChartsPanel hazards={hazards} />);
    expect(await screen.findByText("强度平均值（震级）")).toBeInTheDocument();
    expect(screen.getByText("0.00")).toBeInTheDocument();
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });
});
