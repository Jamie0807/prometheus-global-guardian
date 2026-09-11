import {
  AnalyticsContractError,
  parseFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "./common";
import { parseAnalyticsJsonTreeRecords, type AnalyticsJsonTreeRecord } from "./records";

export interface PivotQueryData {
  results: AnalyticsJsonTreeRecord[];
  total_count: number;
  query_params: {
    time_range: [start: string, end: string] | null;
    regions: string[] | null;
    types: string[] | null;
    severities: string[] | null;
  };
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseNullableDateRange(value: unknown, path: string): [start: string, end: string] | null {
  if (value === null) return null;
  if (!Array.isArray(value) || value.length !== 2) throw new AnalyticsContractError(path);
  return [parseString(value[0], `${path}.0`), parseString(value[1], `${path}.1`)];
}

function parseNullableStringArray(value: unknown, path: string): string[] | null {
  if (value === null) return null;
  return parseStringArray(value, path);
}

export function parsePivotQuery(value: unknown): PivotQueryData {
  const record = parseRecord(value, "data");
  const queryParams = parseRecord(record.query_params, "data.query_params");

  return {
    results: parseAnalyticsJsonTreeRecords(record.results, "data.results"),
    total_count: parseNonNegativeInteger(record.total_count, "data.total_count"),
    query_params: {
      time_range: parseNullableDateRange(queryParams.time_range, "data.query_params.time_range"),
      regions: parseNullableStringArray(queryParams.regions, "data.query_params.regions"),
      types: parseNullableStringArray(queryParams.types, "data.query_params.types"),
      severities: parseNullableStringArray(queryParams.severities, "data.query_params.severities"),
    },
  };
}
