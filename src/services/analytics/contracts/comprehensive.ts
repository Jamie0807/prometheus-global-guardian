import type { PredictionsData } from "./predictions";
import type { QualityReportData } from "./quality";
import type { RiskAssessmentData } from "./risk";
import type { StatisticsData } from "./statistics";
import { AnalyticsContractError, parseFiniteNumber, parseRecord, parseString } from "./common";
import { parsePredictions } from "./predictions";
import { parseQualityReport } from "./quality";
import { parseRiskAssessment } from "./risk";
import { parseStatistics } from "./statistics";

export interface ComprehensiveAnalysisData {
  statistics: StatisticsData;
  predictions: PredictionsData;
  riskAssessment: RiskAssessmentData;
  dataQuality: QualityReportData;
  processingInfo: {
    totalRecords: number;
    timeRange: number;
    analysisType: string;
  };
  performance: {
    processingTimeMs: number;
    recordsProcessed: number;
    parallelExecution: boolean;
    cacheEnabled: boolean;
  };
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseNonNegativeNumber(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new AnalyticsContractError(path);
  return value;
}

export function parseComprehensiveAnalysis(value: unknown): ComprehensiveAnalysisData {
  const record = parseRecord(value, "data");
  const processingInfo = parseRecord(record.processingInfo, "data.processingInfo");
  const performance = parseRecord(record.performance, "data.performance");

  return {
    statistics: parseStatistics(record.statistics),
    predictions: parsePredictions(record.predictions),
    riskAssessment: parseRiskAssessment(record.riskAssessment),
    dataQuality: parseQualityReport(record.dataQuality),
    processingInfo: {
      totalRecords: parseNonNegativeInteger(
        processingInfo.totalRecords,
        "data.processingInfo.totalRecords",
      ),
      timeRange: parseNonNegativeNumber(processingInfo.timeRange, "data.processingInfo.timeRange"),
      analysisType: parseString(processingInfo.analysisType, "data.processingInfo.analysisType"),
    },
    performance: {
      processingTimeMs: parseNonNegativeNumber(
        performance.processingTimeMs,
        "data.performance.processingTimeMs",
      ),
      recordsProcessed: parseNonNegativeInteger(
        performance.recordsProcessed,
        "data.performance.recordsProcessed",
      ),
      parallelExecution: parseBoolean(
        performance.parallelExecution,
        "data.performance.parallelExecution",
      ),
      cacheEnabled: parseBoolean(performance.cacheEnabled, "data.performance.cacheEnabled"),
    },
  };
}
