/** 验证客户端分析服务的请求组装、响应处理和错误传播。 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  analyze4DTrends,
  assessDataQuality,
  calculate4DRiskScores,
  create4DPivotTable,
  formatHazards,
  get4DSummary,
  getComprehensiveAnalysis,
  getQualityThresholds,
  getQualityHistory,
  getServiceInfo,
  getPredictions,
  getRiskAssessment,
  getStatistics,
  multiDimensionalQuery,
  mergeMultiSourceData,
  processETL,
  transformToUnifiedModel,
  type AnalysisRequest,
} from "../src/services/analytics/analyticsService";
import {
  AnalyticsBusinessError,
  AnalyticsContractError,
} from "../src/services/analytics/contracts/common";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("analytics service", () => {
  const qualityReport = {
    overallScore: 0,
    targetScore: 95,
    detailChecks: {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0,
      validity: 0,
    },
    totalRecords: 0,
    status: "PASS",
    issues: [],
    recommendations: [],
  };
  const rawQualityReport = {
    source: "MERGED",
    timestamp: "2026-09-11T00:00:00.000Z",
    record_count: 0,
    overall_score: 0,
    overall_status: "pass",
    dimensions: {},
    issues: [],
    recommendations: [],
  };
  const failedPrediction = {
    status: "failed",
    reason: "model_error",
    dataPoints: 0,
    minimumDataPoints: 3,
    confidence: null,
  };
  const comprehensiveData = {
    statistics: {
      descriptiveStatistics: {
        basicStats: { count: 0, mean: {}, std: {}, min: {}, max: {} },
        centralTendency: {},
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: {}, percentages: {} },
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
    },
    predictions: {
      earthquakePrediction: failedPrediction,
      volcanoPrediction: failedPrediction,
      stormPrediction: failedPrediction,
      floodPrediction: failedPrediction,
      wildfirePrediction: failedPrediction,
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
    riskAssessment: {
      overallRiskScore: { score: 0, level: "MINIMAL" },
      typeRisks: {},
      geographicRisks: [],
      temporalRisks: {},
      recommendations: [],
      recommendationDetails: [],
    },
    dataQuality: qualityReport,
    processingInfo: { totalRecords: 0, timeRange: 0, analysisType: "comprehensive" },
    performance: {
      processingTimeMs: 0,
      recordsProcessed: 0,
      parallelExecution: true,
      cacheEnabled: true,
    },
  };

  it("parses comprehensive analysis responses and preserves zero processing time", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ success: true, data: comprehensiveData, processingTime: 0 }),
          ),
        ),
    );

    await expect(getComprehensiveAnalysis([])).resolves.toMatchObject({
      success: true,
      processingTime: 0,
      data: {
        riskAssessment: { temporalRisks: null },
        processingInfo: { totalRecords: 0, timeRange: 0 },
        performance: { processingTimeMs: 0, recordsProcessed: 0 },
      },
    });
  });

  it("preserves comprehensive analysis contract and business errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                ...comprehensiveData,
                performance: { ...comprehensiveData.performance, processingTimeMs: "0" },
              },
            }),
          ),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "secret" }))),
    );

    await expect(getComprehensiveAnalysis([])).rejects.toBeInstanceOf(AnalyticsContractError);
    await expect(getComprehensiveAnalysis([])).rejects.toBeInstanceOf(AnalyticsBusinessError);
  });

  it("turns malformed comprehensive analysis JSON into a safe contract error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{ malformed-json")));

    await expect(getComprehensiveAnalysis([])).rejects.toMatchObject({
      code: "ANALYTICS_RESPONSE_INVALID",
      path: "response.body",
      message: "Invalid analytics response at response.body",
    });
  });

  it("parses ETL, transform, and merge responses at the JSON boundary", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              processedData: [{ coordinates: [120, 30], metadata: { labels: ["watch"] } }],
              qualityMetrics: { ...qualityReport, totalRecords: 1 },
              recordsProcessed: 1,
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: { records: [], total_records: 0, schema: [], source: "USGS" },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              unified_records: [],
              total_records: 0,
              source_records: {},
              merged_quality: rawQualityReport,
              source_quality_reports: [],
              source_comparison: {},
            },
          }),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(processETL([])).resolves.toMatchObject({
      success: true,
      data: { recordsProcessed: 1, processedData: [{ coordinates: [120, 30] }] },
    });
    await expect(transformToUnifiedModel([{ id: "h" }], "USGS")).resolves.toEqual({
      success: true,
      data: { records: [], total_records: 0, schema: [], source: "USGS" },
    });
    await expect(mergeMultiSourceData()).resolves.toMatchObject({
      success: true,
      data: {
        total_records: 0,
        merged_quality: { source: "MERGED", recordCount: 0 },
        source_comparison: { sources: [], best_source: null, worst_source: null },
      },
    });
  });

  it("preserves ETL and unified contract and business errors", async () => {
    const malformedContract = new Response(
      JSON.stringify({
        success: true,
        data: { records: [], total_records: "0", schema: [], source: "USGS" },
      }),
    );
    const businessFailure = new Response(
      JSON.stringify({ success: false, error: "sensitive-body-marker" }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(malformedContract)
        .mockResolvedValueOnce(businessFailure)
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: "sensitive-body-marker" })),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: false, error: "sensitive-body-marker" })),
        ),
    );

    await expect(transformToUnifiedModel([{ id: "h" }], "USGS")).rejects.toBeInstanceOf(
      AnalyticsContractError,
    );
    await expect(transformToUnifiedModel([{ id: "h" }], "USGS")).rejects.toMatchObject({
      code: "ANALYTICS_REQUEST_FAILED",
      message: "Analytics request failed",
    });
    await expect(processETL([])).rejects.toMatchObject({
      code: "ANALYTICS_REQUEST_FAILED",
      message: "Analytics request failed",
    });
    await expect(mergeMultiSourceData()).rejects.toBeInstanceOf(AnalyticsBusinessError);
  });

  it("turns malformed JSON from ETL and unified endpoints into safe contract errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(new Response("{ malformed-json"))),
    );

    const calls = [
      () => processETL([]),
      () => transformToUnifiedModel([{ id: "h" }], "USGS"),
      () => mergeMultiSourceData(),
    ];
    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({
        code: "ANALYTICS_RESPONSE_INVALID",
        path: "response.body",
        message: "Invalid analytics response at response.body",
      });
    }
  });

  it("parses direct service info and quality history at the JSON boundary", async () => {
    const report = {
      source: "USGS",
      timestamp: "2026-09-11T00:00:00.000Z",
      record_count: 1,
      overall_score: 0.95,
      overall_status: "pass",
      dimensions: {
        completeness: {
          score: 1,
          status: "pass",
          field_completeness: { id: 1 },
          missing_fields: [],
          issues: [],
          recommendations: [],
        },
      },
      issues: [],
      recommendations: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ service: "Prometheus", status: "running", version: "1", features: [] }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { history: [report], count: 1 } })),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(getServiceInfo()).resolves.toMatchObject({ service: "Prometheus", features: [] });
    await expect(getQualityHistory()).resolves.toMatchObject({
      success: true,
      data: { count: 1, history: [{ source: "USGS", recordCount: 1 }] },
    });
  });

  it("turns malformed service info and history JSON into contract errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{ malformed-json", { status: 200 }))
        .mockResolvedValueOnce(new Response("{ malformed-json", { status: 200 })),
    );
    await expect(getServiceInfo()).rejects.toMatchObject({
      code: "ANALYTICS_RESPONSE_INVALID",
      path: "response.body",
    });
    await expect(getQualityHistory()).rejects.toMatchObject({
      code: "ANALYTICS_RESPONSE_INVALID",
      path: "response.body",
    });
  });

  it("preserves quality history business failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }), { status: 200 })),
    );
    await expect(getQualityHistory()).rejects.toBeInstanceOf(AnalyticsBusinessError);
  });
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

  it.each([
    ["a malformed coordinate array", { geometry: { type: "Point", coordinates: [1] } }],
    ["a malformed property coordinate array", { properties: { coordinates: ["1", 2] } }],
    ["a non-finite magnitude", { magnitude: Number.NaN }],
    ["an infinite exposed population", { populationExposed: Number.POSITIVE_INFINITY }],
    ["a numeric string magnitude", { magnitude: "1" as unknown as number }],
    ["a boolean exposed population", { populationExposed: false as unknown as number }],
  ])("rejects %s instead of silently applying a request fallback", (_caseName, invalidValue) => {
    expect(() =>
      formatHazards([
        {
          id: "hazard-invalid-value",
          ...invalidValue,
        },
      ]),
    ).toThrow(AnalyticsContractError);
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
      .mockResolvedValueOnce(
        response({
          results: [],
          total_count: 0,
          query_params: {
            time_range: ["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
            regions: ["Asia-Pacific"],
            types: ["FLOOD"],
            severities: ["WATCH"],
          },
        }),
      )
      .mockResolvedValueOnce(
        response({ trends: [], message: "时间窗口内数据不足", time_window: 14 }),
      )
      .mockResolvedValueOnce(
        response({ risk_scores: [], message: "时间窗口内数据不足", time_window: 21 }),
      )
      .mockResolvedValueOnce(
        response({
          total_records: 1,
          time_range: { start: "2026-09-03", end: "2026-09-03", days: 0 },
          geographic_distribution: { regions: { Asia: 1 }, continents: { Asia: 1 } },
          type_distribution: { FLOOD: 1 },
          severity_distribution: { WATCH: 1 },
          dimensions: { time_unique: 1, geo_unique: 1, type_unique: 1, severity_unique: 1 },
        }),
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

  it("parses pivot query and summary responses at the service JSON boundary", async () => {
    const query = {
      results: [
        {
          id: "event-1",
          coordinates: [120, 30],
          metadata: { verified: true, labels: ["flood", null] },
        },
      ],
      total_count: 1,
      query_params: {
        time_range: ["2026-09-01", "2026-09-03"],
        regions: ["Asia-Pacific"],
        types: ["FLOOD"],
        severities: ["WATCH"],
      },
    };
    const summary = {
      total_records: 0,
      time_range: { start: "NaT", end: "NaT", days: 0 },
      geographic_distribution: { regions: {}, continents: {} },
      type_distribution: {},
      severity_distribution: {},
      dimensions: { time_unique: 0, geo_unique: 0, type_unique: 0, severity_unique: 0 },
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: query, processingTime: 0 })),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ success: true, data: summary, processingTime: 0 })),
        ),
    );

    await expect(multiDimensionalQuery([], {})).resolves.toEqual({
      success: true,
      data: query,
      processingTime: 0,
    });
    await expect(get4DSummary([])).resolves.toEqual({
      success: true,
      data: summary,
      processingTime: 0,
    });
  });

  it("preserves pivot query and summary contract and business errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                results: [],
                total_count: "0",
                query_params: {
                  time_range: null,
                  regions: null,
                  types: null,
                  severities: null,
                },
              },
            }),
          ),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "secret" })))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                total_records: 0,
                time_range: [],
                geographic_distribution: { regions: {}, continents: {} },
                type_distribution: {},
                severity_distribution: {},
                dimensions: {
                  time_unique: 0,
                  geo_unique: 0,
                  type_unique: 0,
                  severity_unique: 0,
                },
              },
            }),
          ),
        )
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: "secret" }))),
    );

    await expect(multiDimensionalQuery([], {})).rejects.toBeInstanceOf(AnalyticsContractError);
    await expect(multiDimensionalQuery([], {})).rejects.toBeInstanceOf(AnalyticsBusinessError);
    await expect(get4DSummary([])).rejects.toBeInstanceOf(AnalyticsContractError);
    await expect(get4DSummary([])).rejects.toBeInstanceOf(AnalyticsBusinessError);
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

  it("converts HTTP 200 malformed JSON into a contract error for migrated analytics endpoints", async () => {
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
      () => multiDimensionalQuery(hazards, {}),
      () => analyze4DTrends(hazards),
      () => calculate4DRiskScores(hazards),
      () => get4DSummary(hazards),
    ];

    for (const call of calls) {
      await expect(call()).rejects.toMatchObject({
        code: "ANALYTICS_RESPONSE_INVALID",
        path: "response.body",
      });
    }
    expect(fetchMock).toHaveBeenCalledTimes(10);
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
