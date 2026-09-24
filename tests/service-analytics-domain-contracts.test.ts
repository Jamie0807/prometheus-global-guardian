/** 验证分析服务各领域响应契约的解析和失败语义。 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsContractError } from "../apps/web/src/services/analytics/contracts/common";
import { parseComprehensiveAnalysis } from "../apps/web/src/services/analytics/contracts/comprehensive";
import { parsePredictions } from "../apps/web/src/services/analytics/contracts/predictions";
import { parseRiskAssessment } from "../apps/web/src/services/analytics/contracts/risk";
import { parseStatistics } from "../apps/web/src/services/analytics/contracts/statistics";
import { parseETLProcess } from "../apps/web/src/services/analytics/contracts/etl";
import {
  parseUnifiedMerge,
  parseUnifiedTransform,
} from "../apps/web/src/services/analytics/contracts/unified";
import {
  parseAnalyticsJsonRecord,
  parseAnalyticsJsonRecords,
} from "../apps/web/src/services/analytics/contracts/records";
import { parseAnalyticsServiceInfo } from "../apps/web/src/services/analytics/contracts/serviceInfo";
import { parseQualityHistory } from "../apps/web/src/services/analytics/contracts/qualityHistory";
import {
  parseQualityReport,
  parseQualityThresholds,
} from "../apps/web/src/services/analytics/contracts/quality";
import {
  parsePivotTable,
  parsePivotRiskScores,
  parsePivotTrends,
} from "../apps/web/src/services/analytics/contracts/pivot";
import { parsePivotQuery } from "../apps/web/src/services/analytics/contracts/pivotQuery";
import { parsePivotSummary } from "../apps/web/src/services/analytics/contracts/pivotSummary";
import {
  analyze4DTrends,
  assessDataQuality,
  calculate4DRiskScores,
  create4DPivotTable,
  getQualityThresholds,
} from "../apps/web/src/services/analytics/analyticsService";

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

const qualityHistoryReport = (source: string, recordCount = 0) => ({
  source,
  timestamp: "2026-09-11T00:00:00.000Z",
  record_count: recordCount,
  overall_score: 0,
  overall_status: "pass",
  dimensions: {},
  issues: [],
  recommendations: [],
});

const comprehensiveData = () => ({
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
    earthquakePrediction: prediction("failed"),
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
  },
  riskAssessment: {
    overallRiskScore: { score: 0, level: "MINIMAL" },
    typeRisks: {},
    geographicRisks: [],
    temporalRisks: {},
    recommendations: [],
    recommendationDetails: [],
  },
  dataQuality: {
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
  },
  processingInfo: { totalRecords: 0, timeRange: 0, analysisType: "comprehensive" },
  performance: {
    processingTimeMs: 0,
    recordsProcessed: 0,
    parallelExecution: true,
    cacheEnabled: true,
  },
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

  it("parses the real comprehensive analysis shape and preserves zero values", () => {
    const parsed = parseComprehensiveAnalysis(comprehensiveData());

    expect(parsed.statistics.descriptiveStatistics.basicStats.count).toBe(0);
    expect(parsed.predictions.overallRiskAssessment.status).toBe("failed");
    expect(parsed.riskAssessment.temporalRisks).toBeNull();
    expect(parsed.dataQuality.totalRecords).toBe(0);
    expect(parsed.processingInfo).toEqual({
      totalRecords: 0,
      timeRange: 0,
      analysisType: "comprehensive",
    });
    expect(parsed.performance).toEqual({
      processingTimeMs: 0,
      recordsProcessed: 0,
      parallelExecution: true,
      cacheEnabled: true,
    });
  });

  it("requires every comprehensive analysis block", () => {
    const missingDataQuality = comprehensiveData();
    Reflect.deleteProperty(missingDataQuality, "dataQuality");

    expect(() => parseComprehensiveAnalysis(missingDataQuality)).toThrowError(
      AnalyticsContractError,
    );
    expect(() =>
      parseComprehensiveAnalysis({
        ...comprehensiveData(),
        statistics: { descriptiveStatistics: {} },
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("validates comprehensive processing information", () => {
    const valid = comprehensiveData();
    for (const processingInfo of [
      { ...valid.processingInfo, totalRecords: -1 },
      { ...valid.processingInfo, totalRecords: 0.5 },
      { ...valid.processingInfo, timeRange: -1 },
      { ...valid.processingInfo, timeRange: Number.NaN },
      { ...valid.processingInfo, analysisType: 1 },
    ]) {
      expect(() => parseComprehensiveAnalysis({ ...valid, processingInfo })).toThrowError(
        AnalyticsContractError,
      );
    }
  });

  it("validates comprehensive performance metrics and flags", () => {
    const valid = comprehensiveData();
    for (const performance of [
      { ...valid.performance, processingTimeMs: -1 },
      { ...valid.performance, processingTimeMs: "0" },
      { ...valid.performance, processingTimeMs: Number.POSITIVE_INFINITY },
      { ...valid.performance, recordsProcessed: -1 },
      { ...valid.performance, recordsProcessed: 0.5 },
      { ...valid.performance, parallelExecution: 1 },
      { ...valid.performance, cacheEnabled: "yes" },
    ]) {
      expect(() => parseComprehensiveAnalysis({ ...valid, performance })).toThrowError(
        AnalyticsContractError,
      );
    }
  });

  it("parses ETL records with nested JSON and preserves zero counts", () => {
    const result = parseETLProcess({
      processedData: [
        {
          id: "event-1",
          coordinates: [120, 30],
          metadata: { verified: true, tags: ["flood", null], depth: 0 },
        },
      ],
      qualityMetrics: { ...qualityReport(0), totalRecords: 1 },
      recordsProcessed: 1,
    });

    expect(result).toEqual({
      processedData: [
        {
          id: "event-1",
          coordinates: [120, 30],
          metadata: { verified: true, tags: ["flood", null], depth: 0 },
        },
      ],
      qualityMetrics: { ...qualityReport(0), totalRecords: 1 },
      recordsProcessed: 1,
    });
    expect(
      parseETLProcess({
        processedData: [],
        qualityMetrics: qualityReport(0),
        recordsProcessed: 0,
      }).recordsProcessed,
    ).toBe(0);
  });

  it("parses empty and nested unified transform responses", () => {
    expect(
      parseUnifiedTransform({ records: [], total_records: 0, schema: [], source: "USGS" }),
    ).toEqual({ records: [], total_records: 0, schema: [], source: "USGS" });

    expect(
      parseUnifiedTransform({
        records: [{ coordinates: [120, 30], properties: { labels: ["watch"] } }],
        total_records: 1,
        schema: ["coordinates", "properties"],
        source: "GDACS",
      }).records[0],
    ).toEqual({ coordinates: [120, 30], properties: { labels: ["watch"] } });
  });

  it("parses merge quality reports and the Python source comparison shape", () => {
    const mergedQuality = qualityHistoryReport("MERGED");
    const result = parseUnifiedMerge({
      unified_records: [],
      total_records: 0,
      source_records: { USGS: 0, NASA: 0, GDACS: 0 },
      merged_quality: mergedQuality,
      source_quality_reports: [],
      source_comparison: {
        sources: [],
        average_scores: {},
        best_source: null,
        worst_source: null,
      },
    });

    expect(result).toMatchObject({
      total_records: 0,
      source_records: { USGS: 0, NASA: 0, GDACS: 0 },
      merged_quality: { source: "MERGED", recordCount: 0, overallScore: 0 },
      source_quality_reports: [],
      source_comparison: {
        sources: [],
        average_scores: {},
        best_source: null,
        worst_source: null,
      },
    });

    expect(
      parseUnifiedMerge({
        unified_records: [{ coordinates: [120, 30] }],
        total_records: 1,
        source_records: { USGS: 1 },
        merged_quality: qualityHistoryReport("MERGED", 1),
        source_quality_reports: [qualityHistoryReport("USGS", 1)],
        source_comparison: {
          sources: [{ source: "USGS", score: 0.95, status: "pass", record_count: 1 }],
          average_scores: { USGS: 0.95 },
          best_source: "USGS",
          worst_source: "USGS",
        },
      }).source_comparison,
    ).toEqual({
      sources: [{ source: "USGS", score: 0.95, status: "pass", record_count: 1 }],
      average_scores: { USGS: 0.95 },
      best_source: "USGS",
      worst_source: "USGS",
    });
  });

  it("normalizes Python's empty source comparison result", () => {
    expect(
      parseUnifiedMerge({
        unified_records: [],
        total_records: 0,
        source_records: { USGS: 0, NASA: 0, GDACS: 0 },
        merged_quality: qualityHistoryReport("MERGED"),
        source_quality_reports: [],
        source_comparison: {},
      }).source_comparison,
    ).toEqual({
      sources: [],
      average_scores: {},
      best_source: null,
      worst_source: null,
    });
  });

  it("rejects malformed ETL quality metrics and nested non-finite numbers", () => {
    expect(() =>
      parseETLProcess({ processedData: [], qualityMetrics: {}, recordsProcessed: 1 }),
    ).toThrow(AnalyticsContractError);
    expect(() =>
      parseETLProcess({
        processedData: [{ metadata: { measurements: [1, Number.NaN] } }],
        qualityMetrics: qualityReport(95),
        recordsProcessed: 1,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.processedData.0.[key].[key].1" }));
    expect(() =>
      parseUnifiedTransform({
        records: [{ coordinates: [120, Number.POSITIVE_INFINITY] }],
        total_records: 1,
        schema: ["coordinates"],
        source: "USGS",
      }),
    ).toThrowError(expect.objectContaining({ path: "data.records.0.[key].1" }));
  });

  it("requires non-negative integer counts across ETL and unified data", () => {
    expect(() =>
      parseETLProcess({
        processedData: [],
        qualityMetrics: qualityReport(95),
        recordsProcessed: "0",
      }),
    ).toThrowError(expect.objectContaining({ path: "data.recordsProcessed" }));
    expect(() =>
      parseUnifiedTransform({ records: [], total_records: -1, schema: [], source: "USGS" }),
    ).toThrowError(expect.objectContaining({ path: "data.total_records" }));
    expect(() =>
      parseUnifiedTransform({ records: [], total_records: 0.5, schema: [], source: "USGS" }),
    ).toThrowError(expect.objectContaining({ path: "data.total_records" }));

    const validMerge = {
      unified_records: [],
      total_records: 0,
      source_records: { USGS: 0 },
      merged_quality: qualityHistoryReport("MERGED"),
      source_quality_reports: [],
      source_comparison: {
        sources: [],
        average_scores: {},
        best_source: null,
        worst_source: null,
      },
    };
    expect(() => parseUnifiedMerge({ ...validMerge, source_records: { USGS: -1 } })).toThrowError(
      expect.objectContaining({ path: "data.source_records.[key]" }),
    );
    expect(() => parseUnifiedMerge({ ...validMerge, source_records: { USGS: 0.5 } })).toThrowError(
      expect.objectContaining({ path: "data.source_records.[key]" }),
    );
    expect(() => parseUnifiedMerge({ ...validMerge, total_records: "0" })).toThrowError(
      expect.objectContaining({ path: "data.total_records" }),
    );
  });

  it("validates unified fields and source comparison values", () => {
    expect(() => parseUnifiedTransform({ records: [], total_records: 0, source: "USGS" })).toThrow(
      AnalyticsContractError,
    );
    expect(() => parseUnifiedTransform({ records: [], total_records: 0, schema: [] })).toThrow(
      AnalyticsContractError,
    );

    const validMerge = {
      unified_records: [],
      total_records: 0,
      source_records: {},
      merged_quality: qualityHistoryReport("MERGED"),
      source_quality_reports: [],
      source_comparison: {
        sources: [],
        average_scores: {},
        best_source: null,
        worst_source: null,
      },
    };
    expect(() =>
      parseUnifiedMerge({
        ...validMerge,
        source_comparison: {
          ...validMerge.source_comparison,
          sources: [{ source: "USGS", score: 1, status: "pass", record_count: -1 }],
        },
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.source_comparison.sources.0.record_count" }),
    );
    expect(() =>
      parseUnifiedMerge({
        ...validMerge,
        source_comparison: {
          ...validMerge.source_comparison,
          average_scores: { USGS: Number.NaN },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.source_comparison.average_scores.[key]" }),
    );
    expect(() =>
      parseUnifiedMerge({
        ...validMerge,
        source_comparison: {
          sources: [{ source: "USGS", score: 1.01, status: "pass", record_count: 1 }],
          average_scores: { USGS: 1.01 },
          best_source: "USGS",
          worst_source: "USGS",
        },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.source_comparison.sources.0.score" }));
    expect(() =>
      parseUnifiedMerge({
        ...validMerge,
        source_comparison: {
          sources: [],
          average_scores: { USGS: -0.01 },
          best_source: null,
          worst_source: null,
        },
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.source_comparison.average_scores.[key]" }),
    );
  });

  it("parses the direct Python service info response", () => {
    expect(
      parseAnalyticsServiceInfo({
        service: "Prometheus",
        status: "running",
        version: "1",
        features: [],
      }),
    ).toMatchObject({ status: "running", features: [] });
    expect(() =>
      parseAnalyticsServiceInfo({
        service: "Prometheus",
        status: "running",
        version: "1",
        features: [1],
      }),
    ).toThrowError(AnalyticsContractError);
  });

  it("restricts shared JSON records to finite scalar values", () => {
    expect(
      parseAnalyticsJsonRecord(
        { event: "created", score: 0, active: false, note: null },
        "data.history.0",
      ),
    ).toEqual({ event: "created", score: 0, active: false, note: null });
    expect(parseAnalyticsJsonRecords([], "data.history")).toEqual([]);
    expect(() => parseAnalyticsJsonRecord({ event: { nested: true } }, "data.history.0")).toThrow(
      AnalyticsContractError,
    );
    expect(() => parseAnalyticsJsonRecord({ event: ["nested"] }, "data.history.0")).toThrow(
      AnalyticsContractError,
    );
    expect(() => parseAnalyticsJsonRecord({ score: Number.NaN }, "data.history.0")).toThrow(
      AnalyticsContractError,
    );
  });

  it("parses the snake_case quality history returned by Python", () => {
    const historyReport = {
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

    expect(parseQualityHistory({ history: [historyReport], count: 1 })).toMatchObject({
      history: [{ source: "USGS", recordCount: 1, overallScore: 0.95 }],
      count: 1,
    });
  });

  it("reports an indexed path for an invalid quality history row", () => {
    expect(() =>
      parseQualityHistory({
        history: [{ source: "USGS", dimensions: {} }],
        count: 1,
      }),
    ).toThrowError(expect.objectContaining({ path: "data.history.0.timestamp" }));
  });

  it("rejects non-finite nested quality history details with a safe indexed path", () => {
    expect(() =>
      parseQualityHistory({
        history: [
          {
            source: "USGS",
            timestamp: "2026-09-11T00:00:00.000Z",
            record_count: 1,
            overall_score: 0.95,
            overall_status: "pass",
            dimensions: {
              completeness: {
                score: 1,
                status: "pass",
                field_completeness: { id: Number.NaN },
              },
            },
            issues: [],
            recommendations: [],
          },
        ],
        count: 1,
      }),
    ).toThrowError(
      expect.objectContaining({ path: "data.history.0.dimensions.[key].[key].[key]" }),
    );
  });

  it("parses empty quality history and validates its count", () => {
    expect(parseQualityHistory({ history: [], count: 0 })).toEqual({ history: [], count: 0 });
    expect(() => parseQualityHistory({ history: [], count: -1 })).toThrow(AnalyticsContractError);
    expect(() => parseQualityHistory({ history: [], count: 1.5 })).toThrow(AnalyticsContractError);
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

  it("parses empty and filtered pivot queries with recursive JSON records", () => {
    expect(
      parsePivotQuery({
        results: [],
        total_count: 0,
        query_params: { time_range: null, regions: null, types: null, severities: null },
      }),
    ).toEqual({
      results: [],
      total_count: 0,
      query_params: { time_range: null, regions: null, types: null, severities: null },
    });

    expect(
      parsePivotQuery({
        results: [
          {
            id: "event-1",
            coordinates: [120, 30],
            metadata: { verified: true, tags: ["flood", null] },
          },
        ],
        total_count: 1,
        query_params: {
          time_range: ["2026-09-01", "2026-09-03"],
          regions: ["Asia-Pacific"],
          types: ["FLOOD"],
          severities: ["WATCH"],
        },
      }),
    ).toEqual({
      results: [
        {
          id: "event-1",
          coordinates: [120, 30],
          metadata: { verified: true, tags: ["flood", null] },
        },
      ],
      total_count: 1,
      query_params: {
        time_range: ["2026-09-01", "2026-09-03"],
        regions: ["Asia-Pacific"],
        types: ["FLOOD"],
        severities: ["WATCH"],
      },
    });
  });

  it("rejects malformed pivot query counts, records, and filter echoes", () => {
    const validQuery = {
      results: [],
      total_count: 0,
      query_params: { time_range: null, regions: null, types: null, severities: null },
    };

    expect(() => parsePivotQuery({ ...validQuery, total_count: "0" })).toThrowError(
      expect.objectContaining({ path: "data.total_count" }),
    );
    expect(() => parsePivotQuery({ ...validQuery, total_count: -1 })).toThrowError(
      expect.objectContaining({ path: "data.total_count" }),
    );
    expect(() => parsePivotQuery({ ...validQuery, total_count: 0.5 })).toThrowError(
      expect.objectContaining({ path: "data.total_count" }),
    );
    expect(() => parsePivotQuery({ ...validQuery, results: [null] })).toThrowError(
      expect.objectContaining({ path: "data.results.0" }),
    );
    expect(() =>
      parsePivotQuery({
        ...validQuery,
        results: [{ metadata: { score: Number.NaN } }],
      }),
    ).toThrowError(expect.objectContaining({ path: "data.results.0.[key].[key]" }));

    for (const time_range of [[], ["2026-09-01"], ["2026-09-01", "2026-09-03", "extra"], 1]) {
      expect(() =>
        parsePivotQuery({
          ...validQuery,
          query_params: { ...validQuery.query_params, time_range },
        }),
      ).toThrowError(expect.objectContaining({ path: "data.query_params.time_range" }));
    }
    expect(() =>
      parsePivotQuery({
        ...validQuery,
        query_params: { ...validQuery.query_params, regions: ["Asia", 1] },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.query_params.regions.1" }));
  });

  it("parses the direct Python pivot summary and preserves zero counts", () => {
    expect(
      parsePivotSummary({
        total_records: 0,
        time_range: { start: "NaT", end: "NaT", days: 0 },
        geographic_distribution: { regions: {}, continents: {} },
        type_distribution: {},
        severity_distribution: {},
        dimensions: { time_unique: 0, geo_unique: 0, type_unique: 0, severity_unique: 0 },
      }),
    ).toEqual({
      total_records: 0,
      time_range: { start: "NaT", end: "NaT", days: 0 },
      geographic_distribution: { regions: {}, continents: {} },
      type_distribution: {},
      severity_distribution: {},
      dimensions: { time_unique: 0, geo_unique: 0, type_unique: 0, severity_unique: 0 },
    });
  });

  it("requires nonnegative integer counts throughout the direct pivot summary", () => {
    const validSummary = {
      total_records: 1,
      time_range: { start: "2026-09-01", end: "2026-09-03", days: 2 },
      geographic_distribution: { regions: { Asia: 1 }, continents: { Asia: 1 } },
      type_distribution: { FLOOD: 1 },
      severity_distribution: { WATCH: 1 },
      dimensions: { time_unique: 1, geo_unique: 1, type_unique: 1, severity_unique: 1 },
    };

    expect(() => parsePivotSummary({ ...validSummary, total_records: "1" })).toThrowError(
      expect.objectContaining({ path: "data.total_records" }),
    );
    expect(() =>
      parsePivotSummary({
        ...validSummary,
        time_range: { ...validSummary.time_range, days: -1 },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.time_range.days" }));
    expect(() =>
      parsePivotSummary({
        ...validSummary,
        geographic_distribution: {
          ...validSummary.geographic_distribution,
          regions: { Asia: 0.5 },
        },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.geographic_distribution.regions.[key]" }));
    expect(() =>
      parsePivotSummary({
        ...validSummary,
        severity_distribution: { WATCH: -1 },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.severity_distribution.[key]" }));
    expect(() =>
      parsePivotSummary({
        ...validSummary,
        dimensions: { ...validSummary.dimensions, geo_unique: 0.5 },
      }),
    ).toThrowError(expect.objectContaining({ path: "data.dimensions.geo_unique" }));
    expect(() =>
      parsePivotSummary({ ...validSummary, time_range: ["2026-09-01", "2026-09-03"] }),
    ).toThrowError(expect.objectContaining({ path: "data.time_range" }));
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
