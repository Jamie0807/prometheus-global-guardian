import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DataQualityMonitor from "../../src/components/DataQualityMonitor";
import type { Hazard } from "../../src/types";

const serviceMocks = vi.hoisted(() => ({
  assessDataQuality: vi.fn(),
  getQualityThresholds: vi.fn(),
}));

vi.mock("../../src/services/analytics/analyticsService", () => ({
  assessDataQuality: serviceMocks.assessDataQuality,
  getQualityThresholds: serviceMocks.getQualityThresholds,
}));

const hazards: Hazard[] = [
  {
    id: "hazard-1",
    title: "Test earthquake",
    type: "EARTHQUAKE",
    geometry: { type: "Point", coordinates: [116.4, 39.9] },
    description: "Test event",
    source: "USGS",
  },
];

describe("DataQualityMonitor", () => {
  beforeEach(() => {
    serviceMocks.assessDataQuality.mockReset();
    serviceMocks.getQualityThresholds.mockReset();
    serviceMocks.getQualityThresholds.mockResolvedValue({
      success: true,
      data: {
        completeness: 0.9,
        accuracy: 0.95,
        consistency: 0.98,
        timeliness: 0.85,
        validity: 0.95,
      },
    });
    serviceMocks.assessDataQuality.mockResolvedValue({
      success: true,
      data: {
        overallScore: 34.4,
        status: "FAIL",
        detailChecks: {
          completeness: 0.778,
          accuracy: 1,
          consistency: 0.98,
          timeliness: 0.85,
          validity: 0.95,
        },
        totalRecords: 679,
        issues: [
          "Missing required fields: latitude, longitude",
          "Found unknown hazard types: TROPICAL_CYCLONE, EARTHQUAKE, STORM, WILDFIRE, DROUGHT, UNKNOWN, FLOOD",
          "Found unknown data sources: DisasterAWARE",
          "Found invalid severity levels: unknown",
          "184 records are older than 30 days",
        ],
        recommendations: [
          "Add missing fields: latitude, longitude",
          "Standardize hazard type naming",
          "Verify and standardize data source names",
          "Recalculate severity levels using standard thresholds",
          "Update or archive outdated records",
        ],
      },
    });
  });

  it("renders localized quality status, score, dimensions, and messages", async () => {
    render(<DataQualityMonitor hazards={hazards} />);

    expect(await screen.findByText("34.4")).toBeInTheDocument();
    expect(screen.getByText("失败")).toBeInTheDocument();
    expect(screen.getByText("77.8%")).toBeInTheDocument();
    expect(screen.getByText("缺少必填字段： latitude, longitude")).toBeInTheDocument();
    expect(
      screen.getByText(
        "发现未知灾害类型： TROPICAL_CYCLONE, EARTHQUAKE, STORM, WILDFIRE, DROUGHT, UNKNOWN, FLOOD",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("发现未知数据源： DisasterAWARE")).toBeInTheDocument();
    expect(screen.getByText("发现无效严重程度： unknown")).toBeInTheDocument();
    expect(screen.getByText("184 条记录超过 30 天")).toBeInTheDocument();
    expect(screen.getByText("补充缺失字段： latitude, longitude")).toBeInTheDocument();
    expect(screen.getByText("统一灾害类型命名")).toBeInTheDocument();
    expect(screen.getByText("校验并统一数据源名称")).toBeInTheDocument();
    expect(screen.getByText("使用标准阈值重新计算严重程度")).toBeInTheDocument();
    expect(screen.getByText("更新或归档过期记录")).toBeInTheDocument();
  });

  it("keeps invalid quality dimensions inside the display range", async () => {
    serviceMocks.assessDataQuality.mockResolvedValueOnce({
      success: true,
      data: {
        overallScore: 140,
        status: "PASS",
        detailChecks: {
          completeness: -0.2,
          accuracy: 1.4,
          consistency: Number.NaN,
          timeliness: Number.POSITIVE_INFINITY,
          validity: 0.5,
        },
        totalRecords: 1,
        issues: [],
        recommendations: [],
      },
    });

    render(<DataQualityMonitor hazards={hazards} />);

    expect(await screen.findByText("100.0")).toBeInTheDocument();
    expect(screen.getAllByText("0.0%").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText(/-\d+\.\d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
