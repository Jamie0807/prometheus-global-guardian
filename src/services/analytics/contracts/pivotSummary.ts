import { AnalyticsContractError, parseFiniteNumber, parseRecord, parseString } from "./common";

export interface PivotSummaryData {
  total_records: number;
  time_range: { start: string; end: string; days: number };
  geographic_distribution: {
    regions: Record<string, number>;
    continents: Record<string, number>;
  };
  type_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  dimensions: {
    time_unique: number;
    geo_unique: number;
    type_unique: number;
    severity_unique: number;
  };
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function parseNonNegativeIntegerMap(value: unknown, path: string): Record<string, number> {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      parseNonNegativeInteger(item, `${path}.[key]`),
    ]),
  );
}

export function parsePivotSummary(value: unknown): PivotSummaryData {
  const record = parseRecord(value, "data");
  const timeRange = parseRecord(record.time_range, "data.time_range");
  const geographicDistribution = parseRecord(
    record.geographic_distribution,
    "data.geographic_distribution",
  );
  const dimensions = parseRecord(record.dimensions, "data.dimensions");

  return {
    total_records: parseNonNegativeInteger(record.total_records, "data.total_records"),
    time_range: {
      start: parseString(timeRange.start, "data.time_range.start"),
      end: parseString(timeRange.end, "data.time_range.end"),
      days: parseNonNegativeInteger(timeRange.days, "data.time_range.days"),
    },
    geographic_distribution: {
      regions: parseNonNegativeIntegerMap(
        geographicDistribution.regions,
        "data.geographic_distribution.regions",
      ),
      continents: parseNonNegativeIntegerMap(
        geographicDistribution.continents,
        "data.geographic_distribution.continents",
      ),
    },
    type_distribution: parseNonNegativeIntegerMap(
      record.type_distribution,
      "data.type_distribution",
    ),
    severity_distribution: parseNonNegativeIntegerMap(
      record.severity_distribution,
      "data.severity_distribution",
    ),
    dimensions: {
      time_unique: parseNonNegativeInteger(dimensions.time_unique, "data.dimensions.time_unique"),
      geo_unique: parseNonNegativeInteger(dimensions.geo_unique, "data.dimensions.geo_unique"),
      type_unique: parseNonNegativeInteger(dimensions.type_unique, "data.dimensions.type_unique"),
      severity_unique: parseNonNegativeInteger(
        dimensions.severity_unique,
        "data.dimensions.severity_unique",
      ),
    },
  };
}
