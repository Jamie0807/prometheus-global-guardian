import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyze4DTrends,
  calculate4DRiskScores,
  create4DPivotTable,
  formatHazards,
  get4DSummary,
  multiDimensionalQuery,
  type AnalysisRequest,
} from "../src/services/analytics/analyticsService";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("analytics service", () => {
  it("normalizes source properties and preserves explicit timestamps", () => {
    const result = formatHazards([
      {
        id: "hazard-1",
        type: "FLOOD",
        properties: {
          title: "River flood",
          timestamp: "2024-01-01T00:00:00.000Z",
          magnitude: 4,
          severity: "WATCH",
          source: "GDACS",
          populationExposed: 12,
        },
        geometry: { type: "Point", coordinates: [1, 2] },
      },
    ]);

    expect(result).toEqual([
      {
        id: "hazard-1",
        type: "FLOOD",
        title: "River flood",
        coordinates: [1, 2],
        timestamp: "2024-01-01T00:00:00.000Z",
        magnitude: 4,
        severity: "WATCH",
        source: "GDACS",
        populationExposed: 12,
      },
    ]);
  });

  it("prefers top-level Hazard fields and preserves valid zero values", () => {
    const result = formatHazards([
      {
        id: "hazard-flat",
        type: "EARTHQUAKE",
        title: "Top-level event",
        geometry: { type: "Point", coordinates: [0, 0] },
        description: "Top-level description",
        timestamp: "2026-09-03T00:00:00.000Z",
        magnitude: 0,
        severity: "WATCH",
        source: "USGS",
        populationExposed: 0,
        properties: {
          type: "FLOOD",
          title: "Legacy event",
          timestamp: "2020-01-01T00:00:00.000Z",
          magnitude: 8,
          severity: "WARNING",
          source: "GDACS",
          populationExposed: 99,
        },
      },
    ]);

    expect(result).toEqual([
      {
        id: "hazard-flat",
        type: "EARTHQUAKE",
        title: "Top-level event",
        coordinates: [0, 0],
        timestamp: "2026-09-03T00:00:00.000Z",
        magnitude: 0,
        severity: "WATCH",
        source: "USGS",
        populationExposed: 0,
      },
    ]);
  });

  it("uses safe fallbacks for missing fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-03T04:05:06.000Z"));

    const result = formatHazards([{}]);

    expect(result[0]).toMatchObject({
      id: "hazard-0-1706933106000",
      type: "未分类",
      title: "Unknown Event",
      coordinates: [0, 0],
      timestamp: "2024-02-03T04:05:06.000Z",
      magnitude: null,
      severity: "unknown",
      source: "DisasterAWARE",
      populationExposed: null,
    });
  });

  it("does not coerce invalid numeric values into zero", () => {
    const result = formatHazards([
      {
        id: "hazard-invalid-number",
        geometry: { type: "Point", coordinates: [1, 2] },
        magnitude: "" as unknown as number,
        populationExposed: false,
        properties: {
          magnitude: " " as unknown as number,
          populationExposed: [] as unknown as number,
        },
      },
    ]);

    expect(result[0]).toMatchObject({
      magnitude: null,
      populationExposed: null,
    });
  });

  it("supports the complete 4D AnalysisRequest contract", () => {
    const request = {
      hazards: [],
      analysisType: "comprehensive",
      timeRange: 30,
      time_dim: "day",
      geo_dim: "continent",
      aggfunc: "mean",
      time_range: ["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
      regions: ["Asia-Pacific"],
      types: ["EARTHQUAKE"],
      severities: ["WATCH"],
      time_window: 14,
    } satisfies AnalysisRequest;

    expect(request.time_window).toBe(14);
  });

  it("sends hazards and each endpoint's 4D parameters", async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({ success: true, data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const hazards = [
      {
        id: "hazard-4d",
        type: "FLOOD",
        title: "4D event",
        geometry: { type: "Point", coordinates: [120, 30] },
        description: "4D contract fixture",
        timestamp: "2026-09-03T00:00:00.000Z",
        magnitude: 0,
        severity: "WATCH",
        source: "GDACS",
      },
    ];
    const formattedHazards = [
      {
        id: "hazard-4d",
        type: "FLOOD",
        title: "4D event",
        coordinates: [120, 30],
        timestamp: "2026-09-03T00:00:00.000Z",
        magnitude: 0,
        severity: "WATCH",
        source: "GDACS",
        populationExposed: null,
      },
    ];

    await create4DPivotTable(hazards, {
      timeDim: "day",
      geoDim: "continent",
      aggfunc: "mean",
    });
    await multiDimensionalQuery(hazards, {
      timeRange: ["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
      regions: ["Asia-Pacific"],
      types: ["FLOOD"],
      severities: ["WATCH"],
    });
    await analyze4DTrends(hazards, 14);
    await calculate4DRiskScores(hazards, 21);
    await get4DSummary(hazards);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/\/api\/v1\/pivot\/create$/),
      expect.objectContaining({
        body: JSON.stringify({
          hazards: formattedHazards,
          time_dim: "day",
          geo_dim: "continent",
          aggfunc: "mean",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/v1\/pivot\/query$/),
      expect.objectContaining({
        body: JSON.stringify({
          hazards: formattedHazards,
          time_range: ["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
          regions: ["Asia-Pacific"],
          types: ["FLOOD"],
          severities: ["WATCH"],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/\/api\/v1\/pivot\/trend-analysis$/),
      expect.objectContaining({
        body: JSON.stringify({ hazards: formattedHazards, time_window: 14 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      expect.stringMatching(/\/api\/v1\/pivot\/risk-score$/),
      expect.objectContaining({
        body: JSON.stringify({ hazards: formattedHazards, time_window: 21 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      expect.stringMatching(/\/api\/v1\/pivot\/summary$/),
      expect.objectContaining({
        body: JSON.stringify({ hazards: formattedHazards }),
      }),
    );
  });
});
