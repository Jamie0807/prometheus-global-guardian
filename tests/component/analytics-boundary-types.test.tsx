import React, { type ReactNode } from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ChartsPanel from "../../src/components/ChartsPanel";
import DataQualityMonitor from "../../src/components/DataQualityMonitor";
import OverviewTab from "../../src/features/analytics/components/tabs/OverviewTab";
import { useAnalyticsData } from "../../src/features/analytics/hooks/useAnalyticsData";
import { readChartEvent } from "../../src/features/analytics/utils/chartEventAdapter";
import { AnalyticsContractError } from "../../src/services/analytics/contracts/common";
import { parsePredictions } from "../../src/services/analytics/contracts/predictions";
import { parseRiskAssessment } from "../../src/services/analytics/contracts/risk";
import { parseStatistics } from "../../src/services/analytics/contracts/statistics";
import type { AnalyticsHazard } from "../../src/features/analytics/types";

const serviceMocks = vi.hoisted(() => ({
  analyze4DTrends: vi.fn(),
  assessDataQuality: vi.fn(),
  calculate4DRiskScores: vi.fn(),
  checkHealth: vi.fn(),
  create4DPivotTable: vi.fn(),
  getPredictions: vi.fn(),
  getQualityThresholds: vi.fn(),
  getRiskAssessment: vi.fn(),
  getStatistics: vi.fn(),
}));

vi.mock("../../src/services/analytics/analyticsService", () => serviceMocks);
vi.mock("../../src/utils/notifications", () => ({
  notify: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
vi.mock("../../src/components/DataVisualization", () => ({ LineChart: () => null }));
vi.mock("../../src/components/ChartDrilldownModal", () => ({
  default: () => <div>drilldown open</div>,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  PieChart: ({ children }: { children: ReactNode }) => <>{children}</>,
  Pie: ({
    children,
    onClick,
  }: {
    children?: ReactNode;
    onClick?: (value: unknown, index: number) => void;
  }) => (
    <>
      <button type="button" onClick={() => onClick?.({ name: 1 }, 0)}>
        invalid chart event
      </button>
      {children}
    </>
  ),
  Cell: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <>{children}</>,
  Bar: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <>{children}</>,
  Line: () => null,
  AreaChart: ({ children }: { children: ReactNode }) => <>{children}</>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const hazards: AnalyticsHazard[] = [
  {
    id: "hazard-1",
    title: "Flood",
    type: "FLOOD",
    geometry: { type: "Point", coordinates: [120, 30] },
    description: "Test event",
    source: "GDACS",
  },
];

const statistics = parseStatistics({
  basicStats: { count: 1, mean: { magnitude: 0 }, std: { magnitude: 0 }, min: {}, max: {} },
  centralTendency: {},
  variabilityMeasures: {},
  distributionMetrics: {},
  typeDistribution: { counts: { FLOOD: 1 }, percentages: { FLOOD: 100 } },
});
const failedModel = {
  status: "failed",
  reason: "model_error",
  dataPoints: 0,
  minimumDataPoints: 3,
  confidence: null,
};
const predictions = parsePredictions({
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
const risk = parseRiskAssessment({
  overallRiskScore: { score: 0, level: "MINIMAL" },
  typeRisks: {},
  geographicRisks: [],
  temporalRisks: {},
  recommendations: [],
  recommendationDetails: [],
});
const readyTrends = {
  kind: "ready" as const,
  all_trends: [{ region: "Asia", type: "FLOOD", trend_slope: 0 }],
  high_risk_trends: [{ region: "Asia", type: "FLOOD", trend_slope: 0 }],
  statistics: { total_combinations: 1, increasing: 0, stable: 1, decreasing: 0 },
  time_window: 7,
};
const readyRisks = {
  kind: "ready" as const,
  all_risk_scores: [{ region: "Asia", type: "FLOOD", risk_score: 0, total_events: 1 }],
  top_10_risks: [{ region: "Asia", type: "FLOOD", risk_score: 0, total_events: 1 }],
  statistics: { total_combinations: 1, max_risk_score: 0, avg_risk_score: 0 },
  time_window: 7,
};

beforeEach(() => {
  for (const mock of Object.values(serviceMocks)) mock.mockReset();
  serviceMocks.checkHealth.mockResolvedValue(true);
  serviceMocks.getStatistics.mockResolvedValue({ success: true, data: statistics });
  serviceMocks.getPredictions.mockResolvedValue({ success: true, data: predictions });
  serviceMocks.getRiskAssessment.mockResolvedValue({ success: true, data: risk });
  serviceMocks.create4DPivotTable.mockResolvedValue({
    success: true,
    data: {
      pivot_table: {},
      summary: {
        total_records: 0,
        time_range: { start: "", end: "", days: 0 },
        geographic_distribution: { regions: {}, continents: {} },
        type_distribution: {},
        severity_distribution: {},
        dimensions: { time_unique: 0, geo_unique: 0, type_unique: 0, severity_unique: 0 },
      },
      dimensions: { rows: 0, columns: 0 },
    },
  });
  serviceMocks.analyze4DTrends.mockResolvedValue({ success: true, data: readyTrends });
  serviceMocks.calculate4DRiskScores.mockResolvedValue({ success: true, data: readyRisks });
  serviceMocks.getQualityThresholds.mockResolvedValue({
    success: true,
    data: {
      completeness: 0.9,
      accuracy: 0.9,
      consistency: 0.9,
      timeliness: 0.9,
      validity: 0.9,
    },
  });
  serviceMocks.assessDataQuality.mockResolvedValue({
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
      status: "FAIL",
      issues: [],
      recommendations: [],
    },
  });
});

describe("analytics third-party event boundary", () => {
  it.each([null, { name: 0 }, { name: 1 }])(
    "ignores an invalid Recharts event payload",
    (payload) => {
      expect(readChartEvent(payload)).toBeNull();
    },
  );

  it("reads a valid Recharts event name", () => {
    expect(readChartEvent({ name: "FLOOD" })).toEqual({ name: "FLOOD" });
  });

  it("does not open drilldown for a numeric chart event name", () => {
    render(<ChartsPanel hazards={hazards} />);
    fireEvent.click(screen.getByRole("button", { name: "invalid chart event" }));
    expect(screen.queryByText("drilldown open")).not.toBeInTheDocument();
  });
});

describe("validated quality and 4D consumers", () => {
  it("renders a 0.5 overall quality score on the validated 0-100 scale", async () => {
    render(<DataQualityMonitor hazards={hazards} />);
    expect(await screen.findByText("0.5")).toBeInTheDocument();
    expect(screen.queryByText("50.0")).not.toBeInTheDocument();
  });

  it("shows a quality error without manufacturing a zero score", async () => {
    serviceMocks.assessDataQuality.mockRejectedValueOnce(
      new AnalyticsContractError("data.overallScore"),
    );
    render(<DataQualityMonitor hazards={hazards} />);
    expect(await screen.findByText("质量评估失败")).toBeInTheDocument();
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("shows an explicit 4D empty-state message without base pivot statistics", () => {
    render(
      <OverviewTab
        hazards={hazards}
        hazardsByType={{ FLOOD: 1 }}
        intensityData={[]}
        statistics={{ success: true, data: statistics }}
        pivot4DTrends={{
          kind: "empty",
          trends: [],
          message: "时间窗口内数据不足",
          time_window: 7,
        }}
        pivot4DRiskScores={null}
      />,
    );
    expect(screen.getByText("时间窗口内数据不足")).toBeInTheDocument();
  });
});

describe("useAnalyticsData enhancement state", () => {
  it("clears only the failed enhancement result while preserving core results", async () => {
    const { result, rerender } = renderHook(
      ({ currentHazards }) => useAnalyticsData(currentHazards),
      { initialProps: { currentHazards: hazards } },
    );
    await waitFor(() => expect(result.current.pivot4DTrends?.kind).toBe("ready"));
    expect(result.current.pivot4DRiskScores?.kind).toBe("ready");

    serviceMocks.analyze4DTrends.mockRejectedValueOnce(
      new AnalyticsContractError("data.all_trends"),
    );
    serviceMocks.calculate4DRiskScores.mockResolvedValueOnce({
      success: true,
      data: { kind: "empty", risk_scores: [], message: "风险数据不足", time_window: 7 },
    });
    rerender({
      currentHazards: [...hazards, { ...hazards[0], id: "hazard-2", title: "Second flood" }],
    });
    await act(async () => result.current.runAnalysis());

    expect(result.current.statistics?.data.basicStats.count).toBe(1);
    expect(result.current.predictions?.data.overallRiskAssessment.status).toBe("failed");
    expect(result.current.riskAssessment?.data.overallRiskScore.score).toBe(0);
    expect(result.current.pivot4DTrends).toBeNull();
    expect(result.current.pivot4DRiskScores?.kind).toBe("empty");

    serviceMocks.analyze4DTrends.mockResolvedValueOnce({ success: true, data: readyTrends });
    serviceMocks.calculate4DRiskScores.mockRejectedValueOnce(
      new AnalyticsContractError("data.all_risk_scores"),
    );
    rerender({
      currentHazards: [
        ...hazards,
        { ...hazards[0], id: "hazard-2", title: "Second flood" },
        { ...hazards[0], id: "hazard-3", title: "Third flood" },
      ],
    });
    await act(async () => result.current.runAnalysis());

    expect(result.current.statistics).not.toBeNull();
    expect(result.current.pivot4DTrends?.kind).toBe("ready");
    expect(result.current.pivot4DRiskScores).toBeNull();
  });
});
