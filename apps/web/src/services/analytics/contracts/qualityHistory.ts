/**
 * 定义分析服务的数据质量历史契约与解析逻辑。
 */
import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "./common";

export type QualityHistoryDetail =
  | string
  | number
  | boolean
  | null
  | QualityHistoryDetail[]
  | { [key: string]: QualityHistoryDetail };

export interface QualityHistoryDimension {
  score: number;
  status: string;
  details: Record<string, QualityHistoryDetail>;
}

export interface QualityHistoryReport {
  source: string;
  timestamp: string;
  recordCount: number;
  overallScore: number;
  overallStatus: string;
  dimensions: Record<string, QualityHistoryDimension>;
  issues: string[];
  recommendations: string[];
}

export interface QualityHistoryData {
  history: QualityHistoryReport[];
  count: number;
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseBoundedScore(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (parsed < 0 || parsed > 1) throw new AnalyticsContractError(path);
  return parsed;
}

function parseDetail(value: unknown, path: string): QualityHistoryDetail {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value))
    return value.map((item, index) => parseDetail(item, `${path}.${index}`));

  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, parseDetail(item, `${path}.[key]`)]),
  );
}

function parseDimension(value: unknown, path: string): QualityHistoryDimension {
  const record = parseRecord(value, path);
  const { score, status, ...details } = record;

  return {
    score: parseBoundedScore(score, `${path}.score`),
    status: parseString(status, `${path}.status`),
    details: Object.fromEntries(
      Object.entries(details).map(([key, item]) => [key, parseDetail(item, `${path}.[key]`)]),
    ),
  };
}

export function parseHistoryReport(value: unknown, path: string): QualityHistoryReport {
  const record = parseRecord(value, path);
  const dimensions = parseRecord(record.dimensions, `${path}.dimensions`);

  return {
    source: parseString(record.source, `${path}.source`),
    timestamp: parseString(record.timestamp, `${path}.timestamp`),
    recordCount: parseNonNegativeInteger(record.record_count, `${path}.record_count`),
    overallScore: parseBoundedScore(record.overall_score, `${path}.overall_score`),
    overallStatus: parseString(record.overall_status, `${path}.overall_status`),
    dimensions: Object.fromEntries(
      Object.entries(dimensions).map(([key, item]) => [
        key,
        parseDimension(item, `${path}.dimensions.[key]`),
      ]),
    ),
    issues: parseStringArray(record.issues, `${path}.issues`),
    recommendations: parseStringArray(record.recommendations, `${path}.recommendations`),
  };
}

export function parseQualityHistory(value: unknown): QualityHistoryData {
  const record = parseRecord(value, "data");
  if (!Array.isArray(record.history)) {
    throw new AnalyticsContractError("data.history");
  }
  return {
    history: record.history.map((item, index) => parseHistoryReport(item, `data.history.${index}`)),
    count: parseNonNegativeInteger(record.count, "data.count"),
  };
}
