import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AnalyticsHazard } from "../../src/features/analytics/types";
import AnalyticsPage from "../../src/features/analytics/AnalyticsPage";
import LegacyAnalyticsPage from "../../src/components/AnalyticsPage";

vi.mock("../../src/features/analytics/hooks/useAnalyticsData", () => ({
  useAnalyticsData: () => ({
    serviceStatus: "online",
    predictions: { success: true, data: {} },
    statistics: { success: true, data: {} },
    riskAssessment: { success: true, data: {} },
    pivot4DTrends: null,
    pivot4DRiskScores: null,
    loading: false,
    checkServiceStatus: vi.fn(),
    runAnalysis: vi.fn(),
    resetAndRunAnalysis: vi.fn(),
  }),
}));

vi.mock("../../src/components/ChartsPanel", () => ({
  default: () => <div>图表内容</div>,
}));

vi.mock("../../src/components/DataQualityMonitor", () => ({
  default: () => <div>质量内容</div>,
}));

vi.mock("../../src/components/DataVisualization", () => ({
  AlertBox: () => <div>提示内容</div>,
  LineChart: () => <div>折线图内容</div>,
  LoadingSpinner: () => <div>加载内容</div>,
  MetricCard: ({ label }: { label: string }) => <div>{label}</div>,
  ProgressBar: ({ label }: { label: string }) => <div>{label}</div>,
}));

const hazards: AnalyticsHazard[] = [
  {
    id: "hazard-1",
    title: "Test earthquake",
    type: "EARTHQUAKE",
    geometry: { type: "Point", coordinates: [116.4, 39.9] },
    description: "Test event",
    source: "USGS",
    magnitude: 5.2,
  },
];

describe("AnalyticsPage", () => {
  it("keeps the legacy import as the feature page compatibility entry", () => {
    expect(LegacyAnalyticsPage).toBe(AnalyticsPage);
  });

  it("renders and switches all five analytics tabs", () => {
    render(<AnalyticsPage hazards={hazards} onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: /统计概览/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /图表可视化/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /预测结果/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /风险评估/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /数据质量/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /图表可视化/ }));
    expect(screen.getByText("图表内容")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /预测结果/ }));
    expect(screen.getByRole("heading", { name: /预测模型结果/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /风险评估/ }));
    expect(screen.getByRole("heading", { name: /风险评估报告/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /数据质量/ }));
    expect(screen.getByText("质量内容")).toBeInTheDocument();
  });
});
