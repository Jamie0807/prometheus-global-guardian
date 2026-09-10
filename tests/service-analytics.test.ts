import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyze4DTrends,
  assessDataQuality,
  calculate4DRiskScores,
  create4DPivotTable,
  formatHazards,
  get4DSummary,
  getQualityThresholds,
  getPredictions,
  getRiskAssessment,
  getStatistics,
  multiDimensionalQuery,
  type AnalysisRequest,
} from "../src/services/analytics/analyticsService";
import { AnalyticsBusinessError } from "../src/services/analytics/contracts/common";

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
    const response = (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        response({
          pivot_table: {},
          summary: {
            total_records: 1,
            time_range: { start: "2026-09-03", end: "2026-09-03", days: 0 },
            geographic_distribution: { regions: { Asia: 1 }, continents: { Asia: 1 } },
            type_distribution: { FLOOD: 1 },
            severity_distribution: { WATCH: 1 },
            dimensions: { time_unique: 1, geo_unique: 1, type_unique: 1, severity_unique: 1 },
          },
          dimensions: { rows: 1, columns: 1 },
        }),
      )
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(
        response({ trends: [], message: "时间窗口内数据不足", time_window: 14 }),
      )
      .mockResolvedValueOnce(
        response({ risk_scores: [], message: "时间窗口内数据不足", time_window: 21 }),
      )
      .mockResolvedValueOnce(response({}));
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

  it("parses domain responses at the service JSON boundary", async () => {
    const stats = {
      descriptiveStatistics: {
        basicStats: {
          count: 1,
          mean: { magnitude: 0 },
          std: { magnitude: null },
          min: { magnitude: 0 },
          max: { magnitude: 0 },
        },
        centralTendency: { mean: 0, median: 0, mode: null },
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: { FLOOD: 1 }, percentages: { FLOOD: 100 } },
      },
      inferentialStatistics: {
        confidenceIntervals: {},
        hypothesisTests: {},
        regressionAnalysis: {},
      },
      timeSeriesAnalysis: {
        movingAverages: {},
        trendAnalysis: {},
        seasonalDecomposition: {},
        autocorrelation: {},
      },
      correlationAnalysis: {
        pearsonCorrelation: {},
        spearmanCorrelation: {},
        mutualInformation: {},
      },
      anomalyDetection: { outlierDetection: {}, anomalyStatistics: {} },
      performanceMetrics: {},
    };
    const model = {
      status: "failed",
      reason: "model_error",
      dataPoints: 0,
      minimumDataPoints: 3,
      confidence: null,
    };
    const predictions = {
      earthquakePrediction: model,
      volcanoPrediction: model,
      stormPrediction: model,
      floodPrediction: model,
      wildfirePrediction: model,
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
    };
    const risk = {
      overallRiskScore: { score: 0, level: "MINIMAL" },
      typeRisks: {},
      geographicRisks: [],
      temporalRisks: {},
      recommendations: [],
      recommendationDetails: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: stats })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: predictions })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: risk })));
    vi.stubGlobal("fetch", fetchMock);
    const hazard = {
      id: "h",
      type: "FLOOD",
      title: "f",
      geometry: { type: "Point", coordinates: [0, 0] },
      timestamp: "2026-09-10T00:00:00Z",
    };
    expect((await getStatistics([hazard])).data.descriptiveStatistics.basicStats.count).toBe(1);
    expect((await getPredictions([hazard])).data.overallRiskAssessment.overallRiskScore).toBeNull();
    expect((await getRiskAssessment([hazard])).data.overallRiskScore.score).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("converts HTTP 200 malformed JSON into a contract error for all first-stage endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response("{ malformed-json", { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const hazards = [
      {
        id: "h",
        type: "FLOOD",
        title: "f",
        geometry: { type: "Point" as const, coordinates: [0, 0] },
      },
    ];

    const calls = [
      () => getStatistics(hazards),
      () => getPredictions(hazards),
      () => getRiskAssessment(hazards),
      () => assessDataQuality(hazards),
      () => getQualityThresholds(),
      () => create4DPivotTable(hazards),
      () => analyze4DTrends(hazards),
      () => calculate4DRiskScores(hazards),
    ];

    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({
        code: "ANALYTICS_RESPONSE_INVALID",
        path: "response.body",
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("preserves an explicit business failure as a stable business error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: false, error: "sensitive-body-marker" }), {
            status: 200,
          }),
        ),
      ),
    );

    await expect(getStatistics([{ id: "h" }])).rejects.toMatchObject({
      code: "ANALYTICS_REQUEST_FAILED",
    });
    await expect(getStatistics([{ id: "h" }])).rejects.toBeInstanceOf(AnalyticsBusinessError);
  });
});
