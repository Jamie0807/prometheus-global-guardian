import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsHazard } from "../../src/features/analytics/types";
import { useAnalyticsData } from "../../src/features/analytics/hooks/useAnalyticsData";

const serviceMocks = vi.hoisted(() => ({
  checkHealth: vi.fn(),
  getPredictions: vi.fn(),
  getStatistics: vi.fn(),
  getRiskAssessment: vi.fn(),
  create4DPivotTable: vi.fn(),
  analyze4DTrends: vi.fn(),
  calculate4DRiskScores: vi.fn(),
}));

const notificationMocks = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));

vi.mock("../../src/services/analytics/analyticsService", () => serviceMocks);
vi.mock("../../src/utils/notifications", () => ({ notify: notificationMocks }));

const hazards: AnalyticsHazard[] = [
  {
    id: "hazard-1",
    title: "Test earthquake",
    type: "EARTHQUAKE",
    geometry: { type: "Point", coordinates: [116.4, 39.9] },
    description: "Test event",
    source: "USGS",
  },
];

describe("useAnalyticsData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.checkHealth.mockResolvedValue(true);
    serviceMocks.getStatistics.mockResolvedValue({ success: true, data: { kind: "statistics" } });
    serviceMocks.getPredictions.mockResolvedValue({ success: true, data: { kind: "predictions" } });
    serviceMocks.getRiskAssessment.mockResolvedValue({ success: true, data: { kind: "risk" } });
    serviceMocks.create4DPivotTable.mockResolvedValue({ success: true, data: {} });
    serviceMocks.analyze4DTrends.mockResolvedValue({
      success: true,
      data: { statistics: { increasing: 1 } },
    });
    serviceMocks.calculate4DRiskScores.mockResolvedValue({
      success: true,
      data: { statistics: { max_risk_score: 12 } },
    });
  });

  it("checks service health and runs the existing analysis sequence", async () => {
    const { result } = renderHook(() => useAnalyticsData(hazards));

    await waitFor(() => expect(result.current.statistics?.data.kind).toBe("statistics"));

    expect(result.current.serviceStatus).toBe("online");
    expect(result.current.predictions?.data.kind).toBe("predictions");
    expect(result.current.riskAssessment?.data.kind).toBe("risk");
    expect(result.current.pivot4DTrends?.statistics?.increasing).toBe(1);
    expect(result.current.pivot4DRiskScores?.statistics?.max_risk_score).toBe(12);
    expect(serviceMocks.create4DPivotTable).toHaveBeenCalledTimes(1);
    expect(serviceMocks.analyze4DTrends).toHaveBeenCalledTimes(1);
    expect(serviceMocks.calculate4DRiskScores).toHaveBeenCalledTimes(1);
    expect(serviceMocks.getStatistics.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.create4DPivotTable.mock.invocationCallOrder[0],
    );
    expect(serviceMocks.getPredictions.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.create4DPivotTable.mock.invocationCallOrder[0],
    );
    expect(serviceMocks.getRiskAssessment.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.create4DPivotTable.mock.invocationCallOrder[0],
    );
    expect(serviceMocks.create4DPivotTable.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.analyze4DTrends.mock.invocationCallOrder[0],
    );
    expect(serviceMocks.analyze4DTrends.mock.invocationCallOrder[0]).toBeLessThan(
      serviceMocks.calculate4DRiskScores.mock.invocationCallOrder[0],
    );
  });

  it("keeps the existing cache behavior for repeated and reset analysis", async () => {
    const { result } = renderHook(() => useAnalyticsData(hazards));
    await waitFor(() => expect(serviceMocks.getStatistics).toHaveBeenCalledTimes(1));

    await act(async () => result.current.runAnalysis());
    expect(notificationMocks.info).toHaveBeenCalledWith("使用缓存", "数据未变化，使用上次分析结果");
    expect(serviceMocks.getStatistics).toHaveBeenCalledTimes(1);

    await act(async () => result.current.resetAndRunAnalysis());
    expect(notificationMocks.info).toHaveBeenLastCalledWith(
      "使用缓存",
      "数据未变化，使用上次分析结果",
    );
    expect(serviceMocks.getStatistics).toHaveBeenCalledTimes(1);
  });

  it("warns instead of requesting analysis when there are no hazards", async () => {
    const { result } = renderHook(() => useAnalyticsData([]));
    await waitFor(() => expect(result.current.serviceStatus).toBe("online"));

    await act(async () => result.current.runAnalysis());

    expect(notificationMocks.warning).toHaveBeenCalledWith("无数据", "没有数据可供分析");
    expect(serviceMocks.getStatistics).not.toHaveBeenCalled();
  });

  it("keeps the existing single automatic retry before reporting failure", async () => {
    vi.useFakeTimers();
    serviceMocks.checkHealth.mockResolvedValue(false);
    serviceMocks.getStatistics.mockRejectedValue(new Error("analysis unavailable"));

    const { result } = renderHook(() => useAnalyticsData(hazards));
    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => result.current.runAnalysis());
    expect(serviceMocks.getStatistics).toHaveBeenCalledTimes(1);
    expect(notificationMocks.warning).toHaveBeenCalledWith("分析失败", "正在重试... (第 1 次)");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(serviceMocks.getStatistics).toHaveBeenCalledTimes(2);
    expect(notificationMocks.error).toHaveBeenCalledWith("分析失败", "analysis unavailable");
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
