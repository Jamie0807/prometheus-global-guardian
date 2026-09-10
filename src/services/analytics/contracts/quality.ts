import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "./common";

export interface QualityReportData {
  overallScore: number;
  targetScore: number;
  detailChecks: QualityThresholds;
  totalRecords: number;
  status: string;
  issues: string[];
  recommendations: string[];
}

export interface QualityThresholds {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
}

function bounded(value: unknown, path: string, maximum: number): number {
  const parsed = parseFiniteNumber(value, path);
  if (parsed < 0 || parsed > maximum) throw new AnalyticsContractError(path);
  return parsed;
}

function nonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseQualityDimensions(value: unknown, path: string): QualityThresholds {
  const record = parseRecord(value, path);
  return {
    completeness: bounded(record.completeness, `${path}.completeness`, 1),
    accuracy: bounded(record.accuracy, `${path}.accuracy`, 1),
    consistency: bounded(record.consistency, `${path}.consistency`, 1),
    timeliness: bounded(record.timeliness, `${path}.timeliness`, 1),
    validity: bounded(record.validity, `${path}.validity`, 1),
  };
}

export function parseQualityThresholds(value: unknown): QualityThresholds {
  return parseQualityDimensions(value, "data");
}

export function parseQualityReport(value: unknown): QualityReportData {
  const record = parseRecord(value, "data");
  const detailChecks = parseQualityDimensions(record.detailChecks, "data.detailChecks");

  return {
    overallScore: bounded(record.overallScore, "data.overallScore", 100),
    targetScore: bounded(record.targetScore, "data.targetScore", 100),
    detailChecks,
    totalRecords: nonNegativeInteger(record.totalRecords, "data.totalRecords"),
    status: parseString(record.status, "data.status"),
    issues: parseStringArray(record.issues, "data.issues"),
    recommendations: parseStringArray(record.recommendations, "data.recommendations"),
  };
}
