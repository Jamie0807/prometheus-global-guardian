import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsContractError } from "../src/services/analytics/contracts/common";
import { parsePredictions } from "../src/services/analytics/contracts/predictions";
import { parseRiskAssessment } from "../src/services/analytics/contracts/risk";
import { parseStatistics } from "../src/services/analytics/contracts/statistics";
import {
  parseQualityReport,
  parseQualityThresholds,
} from "../src/services/analytics/contracts/quality";
import {
  parsePivotTable,
  parsePivotRiskScores,
  parsePivotTrends,
} from "../src/services/analytics/contracts/pivot";
import {
  analyze4DTrends,
  assessDataQuality,
  calculate4DRiskScores,
  create4DPivotTable,
  getQualityThresholds,
} from "../src/services/analytics/analyticsService";

afterEach(() => {
  vi.unstubAllGlobals();
});

const prediction = (status: "ready" | "insufficient_data" | "failed") => ({
  status,
  reason:
    status === "ready" ? "model_fitted" : status === "failed" ? "model_error" : "not_enough_data",
  dataPoints: status === "ready" ? 10 : 0,
  minimumDataPoints: 3,
  confidence: status === "ready" ? 0.8 : null,
  ...(status === "ready" ? { accuracy: 80, predictions: { next7Days: [0, 1, 2] } } : {}),
});

describe("analytics domain contracts", () => {
  const qualityReport = (overallScore: number) => ({
    overallScore,
    targetScore: 95,
    detailChecks: {
      completeness: 0,
      accuracy: 0.5,
      consistency: 0.95,
      timeliness: 1,
      validity: 0.75,
    },
    totalRecords: 0,
    status: "PASS",
    issues: [],
    recommendations: [],
  });

  it("parses statistics with mapped columns, nulls, and zero values", () => {
    const parsed = parseStatistics({
      basicStats: {
        count: 0,
        mean: { magnitude: 0, populationExposed: null },
        std: { magnitude: null },
        min: { magnitude: 0 },
        max: { magnitude: 0 },
      },
      centralTendency: { mean: 0, median: 0, mode: null },
      variabilityMeasures: {
        standardDeviation: null,
        variance: 0,
        coefficientOfVariation: 0,
        range: 0,
      },
      distributionMetrics: { q25: 0, q50: 0, q75: 0, iqr: 0, skewness: null, kurtosis: null },
      typeDistribution: { counts: { EARTHQUAKE: 0 }, percentages: { EARTHQUAKE: 0 } },
      unknownField: "ignored",
    });

    expect(parsed.basicStats.count).toBe(0);
    expect(parsed.basicStats.mean.populationExposed).toBeNull();
    expect(parsed.centralTendency.mean).toBe(0);
    expect(parsed.typeDistribution.counts.EARTHQUAKE).toBe(0);
  });

  it("parses the nested statistics blocks returned by Python", () => {
    const parsed = parseStatistics({
      descriptiveStatistics: {
        basicStats: {
          count: 2,
          mean: { magnitude: 1.5 },
          std: { magnitude: 0.5 },
          min: { magnitude: 1 },
          max: { magnitude: 2 },
        },
        centralTendency: { mean: 1.5, median: 1.5, mode: 1 },
        variabilityMeasures: { range: 1 },
        distributionMetrics: { q50: 1.5 },
        typeDistribution: {
          counts: { FLOOD: 2 },
          percentages: { FLOOD: 100 },
          mostCommon: "FLOOD",
          fourDimensionalPivot: {},
        },
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
    });

    expect(parsed.descriptiveStatistics.basicStats.mean.magnitude).toBe(1.5);
    expect(parsed.descriptiveStatistics.typeDistribution.counts.FLOOD).toBe(2);
  });

  it("requires every top-level Python statistics block", () => {
    expect(() =>
      parseStatistics({
        descriptiveStatistics: {
          basicStats: { count: 0, mean: {}, std: {}, min: {}, max: {} },
          centralTendency: {},
          variabilityMeasures: {},
          distributionMetrics: {},
          typeDistribution: { counts: {}, percentages: {} },
        },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.inferentialStatistics" }));
  });

  it("rejects null Python performance metrics", () => {
    expect(() =>
      parseStatistics({
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
        performanceMetrics: null,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.performanceMetrics" }));
  });

  it("rejects null auxiliary blocks in the legacy flat statistics shape", () => {
    expect(() =>
      parseStatistics({
        basicStats: { count: 0, mean: {}, std: {}, min: {}, max: {} },
        centralTendency: {},
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: {}, percentages: {} },
        performanceMetrics: null,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.performanceMetrics" }));
  });

  it("rejects invalid statistics nesting and numeric strings", () => {
    expect(() =>
      parseStatistics({
        basicStats: { count: -1, mean: {}, std: {}, min: {}, max: {} },
        centralTendency: {},
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: {}, percentages: {} },
      }),
    ).toThrowError(AnalyticsContractError);
    expect(() =>
      parseStatistics({
        basicStats: { count: 1, mean: { magnitude: "1" }, std: {}, min: {}, max: {} },
        centralTendency: {},
        variabilityMeasures: {},
        distributionMetrics: {},
        typeDistribution: { counts: {}, percentages: {} },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.basicStats.mean.[key]" }));
  });

  it("parses every prediction status and keeps overall failed separate", () => {
    const parsed = parsePredictions({
      earthquakePrediction: prediction("failed"),
      volcanoPrediction: prediction("insufficient_data"),
      stormPrediction: prediction("ready"),
      floodPrediction: prediction("ready"),
      wildfirePrediction: prediction("failed"),
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

    expect(parsed.earthquakePrediction.status).toBe("failed");
    expect(parsed.volcanoPrediction.status).toBe("insufficient_data");
    expect(parsed.overallRiskAssessment.overallRiskScore).toBeNull();
  });

  it("validates prediction arrays, counts, and status values", () => {
    expect(() =>
      parsePredictions({
        earthquakePrediction: { ...prediction("ready"), dataPoints: -1 },
        volcanoPrediction: prediction("ready"),
        stormPrediction: prediction("ready"),
        floodPrediction: prediction("ready"),
        wildfirePrediction: prediction("ready"),
        overallRiskAssessment: {
          status: "ready",
          reason: "ok",
          overallRiskScore: 0,
          riskLevel: "LOW",
          averageAccuracy: 0,
          confidence: 0,
          modelWeights: {},
          recommendation: "",
        },
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("requires ready models to include the Python model output fields", () => {
    const incompleteReady = { ...prediction("ready") };
    delete incompleteReady.accuracy;
    delete incompleteReady.predictions;
    expect(() =>
      parsePredictions({
        earthquakePrediction: incompleteReady,
        volcanoPrediction: prediction("ready"),
        stormPrediction: prediction("ready"),
        floodPrediction: prediction("ready"),
        wildfirePrediction: prediction("ready"),
        overallRiskAssessment: {
          status: "ready",
          reason: "model_fitted",
          overallRiskScore: 0,
          riskLevel: "LOW",
          averageAccuracy: 80,
          confidence: 0.8,
          modelWeights: {},
          recommendation: "",
        },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.earthquakePrediction.accuracy" }));
  });

  it("rejects failed prediction branches that carry successful model values", () => {
    expect(() =>
      parsePredictions({
        earthquakePrediction: {
          ...prediction("failed"),
          confidence: 0.8,
          accuracy: 80,
          predictions: { next7Days: [1, 2, 3] },
        },
        volcanoPrediction: prediction("failed"),
        stormPrediction: prediction("failed"),
        floodPrediction: prediction("failed"),
        wildfirePrediction: prediction("failed"),
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
    ).toThrowError(expect.objectContaining({ path: "data.earthquakePrediction.confidence" }));
  });

  it("requires overall failed assessments to use the Python failure shape", () => {
    expect(() =>
      parsePredictions({
        earthquakePrediction: prediction("failed"),
        volcanoPrediction: prediction("failed"),
        stormPrediction: prediction("failed"),
        floodPrediction: prediction("failed"),
        wildfirePrediction: prediction("failed"),
        overallRiskAssessment: {
          status: "failed",
          reason: "model_error",
          overallRiskScore: 99,
          riskLevel: "HIGH",
          averageAccuracy: 99,
          confidence: 1,
          modelWeights: { EARTHQUAKE: 0.25 },
          recommendation: "act now",
        },
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.overallRiskAssessment.overallRiskScore" }),
    );
  });

  it("enforces overall prediction score, accuracy, and confidence ranges", () => {
    const base = {
      earthquakePrediction: prediction("failed"),
      volcanoPrediction: prediction("failed"),
      stormPrediction: prediction("failed"),
      floodPrediction: prediction("failed"),
      wildfirePrediction: prediction("failed"),
    };
    for (const overallRiskScore of [-1, 101]) {
      expect(() =>
        parsePredictions({
          ...base,
          overallRiskAssessment: {
            status: "failed",
            reason: "model_error",
            overallRiskScore,
            riskLevel: "UNKNOWN",
            averageAccuracy: null,
            confidence: null,
            modelWeights: {},
            recommendation: "",
          },
        }),
      ).toThrowError(AnalyticsContractError);
    }
    for (const averageAccuracy of [-1, 101]) {
      expect(() =>
        parsePredictions({
          ...base,
          overallRiskAssessment: {
            status: "failed",
            reason: "model_error",
            overallRiskScore: null,
            riskLevel: "UNKNOWN",
            averageAccuracy,
            confidence: null,
            modelWeights: {},
            recommendation: "",
          },
        }),
      ).toThrowError(AnalyticsContractError);
    }
    for (const confidence of [-0.01, 1.01]) {
      expect(() =>
        parsePredictions({
          ...base,
          overallRiskAssessment: {
            status: "failed",
            reason: "model_error",
            overallRiskScore: null,
            riskLevel: "UNKNOWN",
            averageAccuracy: null,
            confidence,
            modelWeights: {},
            recommendation: "",
          },
        }),
      ).toThrowError(AnalyticsContractError);
    }
  });

  it("parses risk scores from 0 to 100 and structured recommendation metrics", () => {
    const parsed = parseRiskAssessment({
      overallRiskScore: { score: 0, level: "MINIMAL" },
      typeRisks: {
        FLOOD: { count: 0, riskScore: 0, averageMagnitude: null },
        EARTHQUAKE: { count: 1, riskScore: 1, averageMagnitude: 2 },
      },
      geographicRisks: [{ location: { lat: 0, lon: 0 }, hazardCount: 0, riskLevel: "LOW" }],
      temporalRisks: {
        recent7Days: 0,
        previous7Days: 0,
        growthRate: 0,
        trend: "stable",
      },
      recommendations: [],
      recommendationDetails: [
        {
          ruleId: "none",
          severity: "info",
          message: "No action",
          metrics: { threshold: 0, active: false, note: null },
        },
      ],
    });
    expect(parsed.overallRiskScore.score).toBe(0);
    expect(parsed.typeRisks.FLOOD.averageMagnitude).toBeNull();
    expect(parsed.recommendationDetails[0].metrics.note).toBeNull();
    expect(() =>
      parseRiskAssessment({
        overallRiskScore: { score: 101, level: "HIGH" },
        typeRisks: {},
        geographicRisks: [],
        temporalRisks: {
          recent7Days: 0,
          previous7Days: 0,
          growthRate: 0,
          trend: "stable",
        },
        recommendations: [],
        recommendationDetails: [],
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("accepts only the Python temporal risk shape and numeric ranges", () => {
    const base = {
      overallRiskScore: { score: 0, level: "MINIMAL" },
      typeRisks: {},
      geographicRisks: [],
      temporalRisks: {
        recent7Days: 1,
        previous7Days: 2,
        growthRate: -50,
        trend: "decreasing",
      },
      recommendations: [],
      recommendationDetails: [],
    };
    expect(parseRiskAssessment(base).temporalRisks).toEqual(base.temporalRisks);

    for (const temporalRisks of [
      { ...base.temporalRisks, recent7Days: -1 },
      { ...base.temporalRisks, previous7Days: 1.5 },
      { ...base.temporalRisks, growthRate: "-50" },
      { ...base.temporalRisks, previous7Days: { nested: true } },
      { ...base.temporalRisks, trend: "unknown" },
    ]) {
      expect(() => parseRiskAssessment({ ...base, temporalRisks })).toThrowError(
        AnalyticsContractError,
      );
    }
  });

  it.each([0, 0.5, 95, 100])("parses quality overall score %s on its 0-100 scale", (score) => {
    expect(parseQualityReport(qualityReport(score)).overallScore).toBe(score);
  });

  it("requires every quality dimension and keeps dimensions and thresholds on a 0-1 scale", () => {
    expect(parseQualityThresholds(qualityReport(95).detailChecks)).toEqual(
      qualityReport(95).detailChecks,
    );
    expect(() =>
      parseQualityReport({
        ...qualityReport(95),
        detailChecks: { ...qualityReport(95).detailChecks, accuracy: 1.01 },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.detailChecks.accuracy" }));
    expect(() =>
      parseQualityThresholds({ ...qualityReport(95).detailChecks, completeness: -0.01 }),
    ).toThrowError(expect.objectContaining({ path: "data.completeness" }));
    const missingValidity = {
      completeness: 0,
      accuracy: 0.5,
      consistency: 0.95,
      timeliness: 1,
    };
    expect(() =>
      parseQualityReport({ ...qualityReport(95), detailChecks: missingValidity }),
    ).toThrowError(expect.objectContaining({ path: "data.detailChecks.validity" }));
  });

  it("rejects a quality error object instead of treating it as a zero-score report", () => {
    expect(() => parseQualityReport({ error: "secret" })).toThrowError(AnalyticsContractError);
  });

  it("maps valid empty 4D responses to explicit empty states", () => {
    expect(
      parsePivotTrends({ trends: [], message: "时间窗口内数据不足", time_window: 14 }),
    ).toEqual({
      kind: "empty",
      trends: [],
      message: "时间窗口内数据不足",
      time_window: 14,
    });
    expect(
      parsePivotRiskScores({ risk_scores: [], message: "时间窗口内数据不足", time_window: 21 }),
    ).toEqual({
      kind: "empty",
      risk_scores: [],
      message: "时间窗口内数据不足",
      time_window: 21,
    });
  });

  it("maps populated 4D responses to ready states", () => {
    expect(
      parsePivotTrends({
        all_trends: [{ region: "Asia", trend_slope: 0, label: null }],
        high_risk_trends: [],
        statistics: {
          total_combinations: 1,
          increasing: 0,
          stable: 0,
          decreasing: 0,
          high_risk_count: 0,
        },
        time_window: 7,
      }),
    ).toEqual({
      kind: "ready",
      all_trends: [{ region: "Asia", trend_slope: 0, label: null }],
      high_risk_trends: [],
      statistics: {
        total_combinations: 1,
        increasing: 0,
        stable: 0,
        decreasing: 0,
        high_risk_count: 0,
      },
      time_window: 7,
    });
    expect(
      parsePivotRiskScores({
        all_risk_scores: [{ region: "Asia", risk_score: 0, label: null }],
        top_10_risks: [],
        statistics: {
          total_combinations: 1,
          max_risk_score: 0,
          avg_risk_score: 0,
          min_risk_score: 0,
        },
        time_window: 7,
      }),
    ).toEqual({
      kind: "ready",
      all_risk_scores: [{ region: "Asia", risk_score: 0, label: null }],
      top_10_risks: [],
      statistics: {
        total_combinations: 1,
        max_risk_score: 0,
        avg_risk_score: 0,
        min_risk_score: 0,
      },
      time_window: 7,
    });
  });

  it("normalizes complete empty 4D trend and risk shapes to empty states", () => {
    expect(
      parsePivotTrends({
        all_trends: [],
        high_risk_trends: [],
        statistics: {
          total_combinations: 0,
          increasing: 0,
          stable: 0,
          decreasing: 0,
          high_risk_count: 0,
        },
        time_window: 7,
      }),
    ).toEqual({
      kind: "empty",
      trends: [],
      message: "时间窗口内数据不足",
      time_window: 7,
    });
    expect(
      parsePivotRiskScores({
        all_risk_scores: [],
        top_10_risks: [],
        statistics: {
          total_combinations: 0,
          max_risk_score: 0,
          avg_risk_score: 0,
          min_risk_score: 0,
        },
        time_window: 7,
      }),
    ).toEqual({
      kind: "empty",
      risk_scores: [],
      message: "时间窗口内数据不足",
      time_window: 7,
    });
  });

  it("does not treat an empty statistics object as a complete ready shape", () => {
    expect(() =>
      parsePivotTrends({ all_trends: [], high_risk_trends: [], statistics: {}, time_window: 7 }),
    ).toThrowError(expect.objectContaining({ path: "data.statistics.total_combinations" }));
    expect(() =>
      parsePivotRiskScores({
        all_risk_scores: [],
        top_10_risks: [],
        statistics: {},
        time_window: 7,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.statistics.total_combinations" }));
  });

  it("rejects a mixed 4D trend response instead of discarding ready data", () => {
    expect(() =>
      parsePivotTrends({
        trends: [],
        message: "时间窗口内数据不足",
        all_trends: [{ region: "Asia", trend_slope: 1 }],
        high_risk_trends: [],
        statistics: { total_combinations: 1 },
        time_window: 7,
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("rejects a mixed 4D risk response instead of discarding ready data", () => {
    expect(() =>
      parsePivotRiskScores({
        risk_scores: [],
        message: "时间窗口内数据不足",
        all_risk_scores: [{ region: "Asia", risk_score: 1 }],
        top_10_risks: [],
        statistics: { total_combinations: 1 },
        time_window: 7,
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("parses a 4D pivot table with explicit dimensions and summary fields", () => {
    expect(
      parsePivotTable({
        pivot_table: { "2026-09": { "Asia_×_FLOOD_×_WATCH": 1 } },
        summary: {
          total_records: 1,
          time_range: { start: "2026-09-01", end: "2026-09-01", days: 0 },
          geographic_distribution: { regions: { Asia: 1 }, continents: { Asia: 1 } },
          type_distribution: { FLOOD: 1 },
          severity_distribution: { WATCH: 1 },
          dimensions: { time_unique: 1, geo_unique: 1, type_unique: 1, severity_unique: 1 },
        },
        dimensions: { rows: 1, columns: 1 },
      }),
    ).toEqual(
      expect.objectContaining({
        dimensions: { rows: 1, columns: 1 },
        pivot_table: { "2026-09": { "Asia_×_FLOOD_×_WATCH": 1 } },
      }),
    );
  });

  it("rejects malformed 4D objects and invalid row values", () => {
    expect(() => parsePivotTable({})).toThrowError(AnalyticsContractError);
    expect(() => parsePivotTrends({})).toThrowError(AnalyticsContractError);
    expect(() => parsePivotRiskScores({})).toThrowError(AnalyticsContractError);
    expect(() =>
      parsePivotTrends({
        all_trends: [{ nested: { unsafe: true } }],
        high_risk_trends: [],
        statistics: {
          total_combinations: 1,
          max_risk_score: 0,
          avg_risk_score: 0,
          min_risk_score: 0,
        },
        time_window: 7,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.all_trends.0.[key]" }));
    expect(() =>
      parsePivotRiskScores({
        all_risk_scores: [null],
        top_10_risks: [],
        statistics: {},
        time_window: 7,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.all_risk_scores.0" }));
  });

  it("requires nonnegative integer pivot summary counts", () => {
    const pivot = {
      pivot_table: {},
      summary: {
        total_records: 0,
        time_range: { start: "2026-09-01", end: "2026-09-01", days: 0 },
        geographic_distribution: { regions: {}, continents: {} },
        type_distribution: {},
        severity_distribution: {},
        dimensions: { time_unique: 0, geo_unique: 0, type_unique: 0, severity_unique: 0 },
      },
      dimensions: { rows: 0, columns: 0 },
    };

    expect(() =>
      parsePivotTable({
        ...pivot,
        summary: { ...pivot.summary, time_range: { ...pivot.summary.time_range, days: -1 } },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.summary.time_range.days" }));
    expect(() =>
      parsePivotTable({
        ...pivot,
        summary: {
          ...pivot.summary,
          time_range: { ...pivot.summary.time_range, days: 1.5 },
        },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.summary.time_range.days" }));
    expect(() =>
      parsePivotTable({
        ...pivot,
        summary: {
          ...pivot.summary,
          geographic_distribution: { regions: { "secret-region": -1 }, continents: {} },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.summary.geographic_distribution.regions.[key]" }),
    );
    expect(() =>
      parsePivotTable({
        ...pivot,
        summary: { ...pivot.summary, type_distribution: { FLOOD: 1.5 } },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.summary.type_distribution.[key]" }));
  });

  it("parses quality and 4D payloads at their service JSON boundaries", async () => {
    const report = qualityReport(95);
    const thresholds = report.detailChecks;
    const pivot = {
      pivot_table: { "2026-09": { "Asia_×_FLOOD_×_WATCH": 1 } },
      summary: {
        total_records: 1,
        time_range: { start: "2026-09-01", end: "2026-09-01", days: 0 },
        geographic_distribution: { regions: { Asia: 1 }, continents: { Asia: 1 } },
        type_distribution: { FLOOD: 1 },
        severity_distribution: { WATCH: 1 },
        dimensions: { time_unique: 1, geo_unique: 1, type_unique: 1, severity_unique: 1 },
      },
      dimensions: { rows: 1, columns: 1 },
    };
    const trends = { trends: [], message: "时间窗口内数据不足", time_window: 7 };
    const risks = {
      all_risk_scores: [{ region: "Asia", risk_score: 0 }],
      top_10_risks: [{ region: "Asia", risk_score: 0 }],
      statistics: {
        total_combinations: 1,
        max_risk_score: 0,
        avg_risk_score: 0,
        min_risk_score: 0,
      },
      time_window: 7,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: report })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: thresholds })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: pivot })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: trends })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: risks })));
    vi.stubGlobal("fetch", fetchMock);
    const hazards = [
      {
        id: "h",
        title: "Flood",
        type: "FLOOD",
        geometry: { type: "Point" as const, coordinates: [120, 30] },
        timestamp: "2026-09-10T00:00:00Z",
      },
    ];

    await expect(assessDataQuality(hazards)).resolves.toEqual({ success: true, data: report });
    await expect(getQualityThresholds()).resolves.toEqual({ success: true, data: thresholds });
    await expect(create4DPivotTable(hazards)).resolves.toEqual({ success: true, data: pivot });
    await expect(analyze4DTrends(hazards)).resolves.toEqual({
      success: true,
      data: { kind: "empty", ...trends },
    });
    await expect(calculate4DRiskScores(hazards)).resolves.toEqual({
      success: true,
      data: { kind: "ready", ...risks },
    });
  });

  it("rejects a successful quality envelope containing an error object", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true, data: { error: "secret" } })),
        ),
    );
    const hazards = [
      {
        id: "h",
        title: "Flood",
        type: "FLOOD",
        geometry: { type: "Point" as const, coordinates: [120, 30] },
      },
    ];

    await expect(assessDataQuality(hazards)).rejects.toBeInstanceOf(AnalyticsContractError);
  });
});
