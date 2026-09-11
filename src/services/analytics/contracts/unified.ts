import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "./common";
import { parseHistoryReport, type QualityHistoryReport } from "./qualityHistory";
import { parseAnalyticsJsonTreeRecords, type AnalyticsJsonTreeRecord } from "./records";

export interface UnifiedTransformData {
  records: AnalyticsJsonTreeRecord[];
  total_records: number;
  schema: string[];
  source: string;
}

export interface UnifiedMergeData {
  unified_records: AnalyticsJsonTreeRecord[];
  total_records: number;
  source_records: Record<string, number>;
  merged_quality: QualityHistoryReport;
  source_quality_reports: QualityHistoryReport[];
  source_comparison: SourceComparisonData;
}

export interface SourceComparisonData {
  sources: Array<{ source: string; score: number; status: string; record_count: number }>;
  average_scores: Record<string, number>;
  best_source: string | null;
  worst_source: string | null;
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseQualityScore(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (parsed < 0 || parsed > 1) throw new AnalyticsContractError(path);
  return parsed;
}

function parseNullableString(value: unknown, path: string): string | null {
  return value === null ? null : parseString(value, path);
}

function parseSourceRecords(value: unknown, path: string): Record<string, number> {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      parseNonNegativeInteger(item, `${path}.[key]`),
    ]),
  );
}

function parseSourceComparison(value: unknown, path: string): SourceComparisonData {
  const record = parseRecord(value, path);
  if (Object.keys(record).length === 0) {
    return {
      sources: [],
      average_scores: {},
      best_source: null,
      worst_source: null,
    };
  }
  if (!Array.isArray(record.sources)) throw new AnalyticsContractError(`${path}.sources`);

  return {
    sources: record.sources.map((item, index) => {
      const source = parseRecord(item, `${path}.sources.${index}`);
      return {
        source: parseString(source.source, `${path}.sources.${index}.source`),
        score: parseQualityScore(source.score, `${path}.sources.${index}.score`),
        status: parseString(source.status, `${path}.sources.${index}.status`),
        record_count: parseNonNegativeInteger(
          source.record_count,
          `${path}.sources.${index}.record_count`,
        ),
      };
    }),
    average_scores: Object.fromEntries(
      Object.entries(parseRecord(record.average_scores, `${path}.average_scores`)).map(
        ([key, item]) => [key, parseQualityScore(item, `${path}.average_scores.[key]`)],
      ),
    ),
    best_source: parseNullableString(record.best_source, `${path}.best_source`),
    worst_source: parseNullableString(record.worst_source, `${path}.worst_source`),
  };
}

export function parseUnifiedTransform(value: unknown): UnifiedTransformData {
  const record = parseRecord(value, "data");
  return {
    records: parseAnalyticsJsonTreeRecords(record.records, "data.records"),
    total_records: parseNonNegativeInteger(record.total_records, "data.total_records"),
    schema: parseStringArray(record.schema, "data.schema"),
    source: parseString(record.source, "data.source"),
  };
}

export function parseUnifiedMerge(value: unknown): UnifiedMergeData {
  const record = parseRecord(value, "data");
  if (!Array.isArray(record.source_quality_reports)) {
    throw new AnalyticsContractError("data.source_quality_reports");
  }

  return {
    unified_records: parseAnalyticsJsonTreeRecords(record.unified_records, "data.unified_records"),
    total_records: parseNonNegativeInteger(record.total_records, "data.total_records"),
    source_records: parseSourceRecords(record.source_records, "data.source_records"),
    merged_quality: parseHistoryReport(record.merged_quality, "data.merged_quality"),
    source_quality_reports: record.source_quality_reports.map((item, index) =>
      parseHistoryReport(item, `data.source_quality_reports.${index}`),
    ),
    source_comparison: parseSourceComparison(record.source_comparison, "data.source_comparison"),
  };
}
