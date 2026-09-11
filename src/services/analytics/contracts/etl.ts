import { AnalyticsContractError, parseFiniteNumber, parseRecord } from "./common";
import { parseQualityReport, type QualityReportData } from "./quality";
import { parseAnalyticsJsonTreeRecords, type AnalyticsJsonTreeRecord } from "./records";

export interface ETLProcessData {
  processedData: AnalyticsJsonTreeRecord[];
  qualityMetrics: QualityReportData;
  recordsProcessed: number;
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

export function parseETLProcess(value: unknown): ETLProcessData {
  const record = parseRecord(value, "data");
  return {
    processedData: parseAnalyticsJsonTreeRecords(record.processedData, "data.processedData"),
    qualityMetrics: parseQualityReport(record.qualityMetrics),
    recordsProcessed: parseNonNegativeInteger(record.recordsProcessed, "data.recordsProcessed"),
  };
}
