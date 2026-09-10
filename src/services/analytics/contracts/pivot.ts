import { AnalyticsContractError, parseFiniteNumber, parseRecord, parseString } from "./common";

export type PivotRow = Record<string, string | number | null>;

export interface PivotTableData {
  pivot_table: Record<string, PivotRow>;
  summary: {
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
  };
  dimensions: { rows: number; columns: number };
}

export type PivotTrendsData =
  | { kind: "empty"; trends: []; message: string; time_window: number }
  | {
      kind: "ready";
      all_trends: PivotRow[];
      high_risk_trends: PivotRow[];
      statistics: Record<string, number>;
      time_window: number;
    };

export type PivotRiskScoresData =
  | { kind: "empty"; risk_scores: []; message: string; time_window: number }
  | {
      kind: "ready";
      all_risk_scores: PivotRow[];
      top_10_risks: PivotRow[];
      statistics: Record<string, number>;
      time_window: number;
    };

function parseTimeWindow(value: unknown): number {
  const parsed = parseFiniteNumber(value, "data.time_window");
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new AnalyticsContractError("data.time_window");
  }
  return parsed;
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

function parsePivotRow(value: unknown, path: string): PivotRow {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => {
      if (item === null || typeof item === "string") return [key, item];
      if (typeof item === "number" && Number.isFinite(item)) return [key, item];
      throw new AnalyticsContractError(`${path}.[key]`);
    }),
  );
}

function parsePivotRows(value: unknown, path: string): PivotRow[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError(path);
  return value.map((item, index) => parsePivotRow(item, `${path}.${index}`));
}

function parsePivotTableRows(value: unknown, path: string): Record<string, PivotRow> {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, parsePivotRow(item, `${path}.[key]`)]),
  );
}

function parseRequiredStatistics(
  value: unknown,
  path: string,
  fields: readonly string[],
  integerFields: readonly string[] = [],
): Record<string, number> {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    fields.map((field) => {
      if (!(field in record)) throw new AnalyticsContractError(`${path}.${field}`);
      const fieldPath = `${path}.${field}`;
      if (integerFields.includes(field)) {
        return [field, parseNonNegativeInteger(record[field], fieldPath)];
      }
      const parsed = parseFiniteNumber(record[field], fieldPath);
      if (parsed < 0) throw new AnalyticsContractError(fieldPath);
      return [field, parsed];
    }),
  );
}

function hasAnyField(record: Record<string, unknown>, fields: readonly string[]): boolean {
  return fields.some((field) => field in record);
}

export function parsePivotTable(value: unknown): PivotTableData {
  const record = parseRecord(value, "data");
  const summary = parseRecord(record.summary, "data.summary");
  const timeRange = parseRecord(summary.time_range, "data.summary.time_range");
  const geographicDistribution = parseRecord(
    summary.geographic_distribution,
    "data.summary.geographic_distribution",
  );
  const summaryDimensions = parseRecord(summary.dimensions, "data.summary.dimensions");
  const dimensions = parseRecord(record.dimensions, "data.dimensions");

  return {
    pivot_table: parsePivotTableRows(record.pivot_table, "data.pivot_table"),
    summary: {
      total_records: parseNonNegativeInteger(summary.total_records, "data.summary.total_records"),
      time_range: {
        start: parseString(timeRange.start, "data.summary.time_range.start"),
        end: parseString(timeRange.end, "data.summary.time_range.end"),
        days: parseNonNegativeInteger(timeRange.days, "data.summary.time_range.days"),
      },
      geographic_distribution: {
        regions: parseNonNegativeIntegerMap(
          geographicDistribution.regions,
          "data.summary.geographic_distribution.regions",
        ),
        continents: parseNonNegativeIntegerMap(
          geographicDistribution.continents,
          "data.summary.geographic_distribution.continents",
        ),
      },
      type_distribution: parseNonNegativeIntegerMap(
        summary.type_distribution,
        "data.summary.type_distribution",
      ),
      severity_distribution: parseNonNegativeIntegerMap(
        summary.severity_distribution,
        "data.summary.severity_distribution",
      ),
      dimensions: {
        time_unique: parseNonNegativeInteger(
          summaryDimensions.time_unique,
          "data.summary.dimensions.time_unique",
        ),
        geo_unique: parseNonNegativeInteger(
          summaryDimensions.geo_unique,
          "data.summary.dimensions.geo_unique",
        ),
        type_unique: parseNonNegativeInteger(
          summaryDimensions.type_unique,
          "data.summary.dimensions.type_unique",
        ),
        severity_unique: parseNonNegativeInteger(
          summaryDimensions.severity_unique,
          "data.summary.dimensions.severity_unique",
        ),
      },
    },
    dimensions: {
      rows: parseNonNegativeInteger(dimensions.rows, "data.dimensions.rows"),
      columns: parseNonNegativeInteger(dimensions.columns, "data.dimensions.columns"),
    },
  };
}

export function parsePivotTrends(value: unknown): PivotTrendsData {
  const record = parseRecord(value, "data");
  const timeWindow = parseTimeWindow(record.time_window);
  const hasEmptyFields = hasAnyField(record, ["trends", "message"]);
  const hasReadyFields = hasAnyField(record, ["all_trends", "high_risk_trends", "statistics"]);

  if (hasEmptyFields && hasReadyFields) {
    throw new AnalyticsContractError("data");
  }

  if (hasEmptyFields) {
    if (!Array.isArray(record.trends) || record.trends.length !== 0) {
      throw new AnalyticsContractError("data.trends");
    }
    return {
      kind: "empty",
      trends: [],
      message: parseString(record.message, "data.message"),
      time_window: timeWindow,
    };
  }

  const allTrends = parsePivotRows(record.all_trends, "data.all_trends");
  const highRiskTrends = parsePivotRows(record.high_risk_trends, "data.high_risk_trends");
  const statistics = parseRequiredStatistics(
    record.statistics,
    "data.statistics",
    ["total_combinations", "increasing", "stable", "decreasing", "high_risk_count"],
    ["total_combinations", "increasing", "stable", "decreasing", "high_risk_count"],
  );
  if (allTrends.length === 0 && highRiskTrends.length === 0) {
    return {
      kind: "empty",
      trends: [],
      message: "时间窗口内数据不足",
      time_window: timeWindow,
    };
  }
  return {
    kind: "ready",
    all_trends: allTrends,
    high_risk_trends: highRiskTrends,
    statistics,
    time_window: timeWindow,
  };
}

export function parsePivotRiskScores(value: unknown): PivotRiskScoresData {
  const record = parseRecord(value, "data");
  const timeWindow = parseTimeWindow(record.time_window);
  const hasEmptyFields = hasAnyField(record, ["risk_scores", "message"]);
  const hasReadyFields = hasAnyField(record, ["all_risk_scores", "top_10_risks", "statistics"]);

  if (hasEmptyFields && hasReadyFields) {
    throw new AnalyticsContractError("data");
  }

  if (hasEmptyFields) {
    if (!Array.isArray(record.risk_scores) || record.risk_scores.length !== 0) {
      throw new AnalyticsContractError("data.risk_scores");
    }
    return {
      kind: "empty",
      risk_scores: [],
      message: parseString(record.message, "data.message"),
      time_window: timeWindow,
    };
  }

  const allRiskScores = parsePivotRows(record.all_risk_scores, "data.all_risk_scores");
  const top10Risks = parsePivotRows(record.top_10_risks, "data.top_10_risks");
  const statistics = parseRequiredStatistics(
    record.statistics,
    "data.statistics",
    ["total_combinations", "max_risk_score", "avg_risk_score", "min_risk_score"],
    ["total_combinations"],
  );
  if (allRiskScores.length === 0 && top10Risks.length === 0) {
    return {
      kind: "empty",
      risk_scores: [],
      message: "时间窗口内数据不足",
      time_window: timeWindow,
    };
  }
  return {
    kind: "ready",
    all_risk_scores: allRiskScores,
    top_10_risks: top10Risks,
    statistics,
    time_window: timeWindow,
  };
}
