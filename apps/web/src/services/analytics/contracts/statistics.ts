/**
 * 定义分析服务的统计数据契约与解析逻辑。
 */
import {
  parseFiniteNumber,
  parseNumberMap,
  parseOptionalFiniteNumber,
  parseRecord,
  parseString,
  AnalyticsContractError,
} from "./common";

export type StatisticsJsonValue =
  | null
  | boolean
  | number
  | string
  | StatisticsJsonValue[]
  | { [key: string]: StatisticsJsonValue };
export type StatisticsJsonObject = { [key: string]: StatisticsJsonValue };

export interface DescriptiveStatistics {
  basicStats: {
    count: number;
    mean: Record<string, number | null>;
    std: Record<string, number | null>;
    min: Record<string, number | null>;
    max: Record<string, number | null>;
  };
  centralTendency: { mean?: number; median?: number; mode?: number | null };
  variabilityMeasures: {
    standardDeviation?: number | null;
    variance?: number | null;
    coefficientOfVariation?: number | null;
    range?: number | null;
  };
  distributionMetrics: {
    q25?: number | null;
    q50?: number | null;
    q75?: number | null;
    iqr?: number | null;
    skewness?: number | null;
    kurtosis?: number | null;
  };
  typeDistribution: {
    counts: Record<string, number>;
    percentages: Record<string, number>;
    mostCommon?: string;
    fourDimensionalPivot?: StatisticsJsonObject;
  };
}

export interface StatisticsData {
  descriptiveStatistics: DescriptiveStatistics;
  inferentialStatistics: {
    confidenceIntervals: StatisticsJsonObject;
    hypothesisTests: StatisticsJsonObject;
    regressionAnalysis: StatisticsJsonObject;
  };
  timeSeriesAnalysis: {
    movingAverages: StatisticsJsonObject;
    trendAnalysis: StatisticsJsonObject;
    seasonalDecomposition: StatisticsJsonObject;
    autocorrelation: StatisticsJsonObject;
  };
  correlationAnalysis: {
    pearsonCorrelation: StatisticsJsonObject;
    spearmanCorrelation: StatisticsJsonObject;
    mutualInformation: StatisticsJsonObject;
  };
  anomalyDetection: {
    outlierDetection: StatisticsJsonObject;
    anomalyStatistics: StatisticsJsonObject;
  };
  performanceMetrics: StatisticsJsonObject;

  // 为使用旧版 Python 数据结构解析器的调用方保留兼容别名。
  basicStats?: DescriptiveStatistics["basicStats"];
  centralTendency?: DescriptiveStatistics["centralTendency"];
  variabilityMeasures?: DescriptiveStatistics["variabilityMeasures"];
  distributionMetrics?: DescriptiveStatistics["distributionMetrics"];
  typeDistribution?: DescriptiveStatistics["typeDistribution"];
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  return parseRecord(value, path);
}

function nonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}

function nullableNumberMap(value: unknown, path: string): Record<string, number | null> {
  const record = recordAt(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      parseOptionalFiniteNumber(item, `${path}.[key]`) ?? null,
    ]),
  );
}

function optionalNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowNull = true,
): number | null | undefined {
  if (!(key in record)) return undefined;
  return allowNull
    ? parseOptionalFiniteNumber(record[key], `${path}.${key}`)
    : parseFiniteNumber(record[key], `${path}.${key}`);
}

function parseJsonValue(value: unknown, path: string): StatisticsJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return parseFiniteNumber(value, path);
  if (Array.isArray(value))
    return value.map((item, index) => parseJsonValue(item, `${path}.${index}`));
  const record = recordAt(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, parseJsonValue(item, `${path}.[key]`)]),
  );
}

function parseJsonObject(value: unknown, path: string): StatisticsJsonObject {
  const record = recordAt(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, parseJsonValue(item, `${path}.[key]`)]),
  );
}

function parseNamedJsonObject<const Keys extends readonly string[]>(
  value: unknown,
  path: string,
  keys: Keys,
): StatisticsJsonObject & { [Key in Keys[number]]: StatisticsJsonObject } {
  const record = parseRecord(value, path);
  const parsed = parseJsonObject(record, path);
  for (const key of keys) {
    if (!(key in record)) throw new AnalyticsContractError(`${path}.${key}`);
    parsed[key] = parseJsonObject(record[key], `${path}.${key}`);
  }
  return parsed as StatisticsJsonObject & { [Key in Keys[number]]: StatisticsJsonObject };
}

function parseDescriptiveStatistics(value: unknown, path: string): DescriptiveStatistics {
  const root = recordAt(value, path);
  const basic = recordAt(root.basicStats, `${path}.basicStats`);
  const tendency = recordAt(root.centralTendency, `${path}.centralTendency`);
  const variability = recordAt(root.variabilityMeasures, `${path}.variabilityMeasures`);
  const distribution = recordAt(root.distributionMetrics, `${path}.distributionMetrics`);
  const type = recordAt(root.typeDistribution, `${path}.typeDistribution`);
  const counts = Object.fromEntries(
    Object.entries(recordAt(type.counts, `${path}.typeDistribution.counts`)).map(([key, item]) => [
      key,
      nonNegativeInteger(item, `${path}.typeDistribution.counts.[key]`),
    ]),
  );
  const percentages = parseNumberMap(type.percentages, `${path}.typeDistribution.percentages`);
  for (const percent of Object.values(percentages)) {
    if (percent < 0 || percent > 100) {
      throw new AnalyticsContractError(`${path}.typeDistribution.percentages.[key]`);
    }
  }

  const fourDimensionalPivot =
    type.fourDimensionalPivot === undefined
      ? undefined
      : parseJsonObject(type.fourDimensionalPivot, `${path}.typeDistribution.fourDimensionalPivot`);
  const mostCommon =
    type.mostCommon === undefined
      ? undefined
      : parseString(type.mostCommon, `${path}.typeDistribution.mostCommon`);

  return {
    basicStats: {
      count: nonNegativeInteger(basic.count, `${path}.basicStats.count`),
      mean: nullableNumberMap(basic.mean, `${path}.basicStats.mean`),
      std: nullableNumberMap(basic.std, `${path}.basicStats.std`),
      min: nullableNumberMap(basic.min, `${path}.basicStats.min`),
      max: nullableNumberMap(basic.max, `${path}.basicStats.max`),
    },
    centralTendency: {
      mean: optionalNumber(tendency, "mean", `${path}.centralTendency`, false) as
        | number
        | undefined,
      median: optionalNumber(tendency, "median", `${path}.centralTendency`, false) as
        | number
        | undefined,
      mode: optionalNumber(tendency, "mode", `${path}.centralTendency`) as
        | number
        | null
        | undefined,
    },
    variabilityMeasures: Object.fromEntries(
      ["standardDeviation", "variance", "coefficientOfVariation", "range"].flatMap((key) => {
        const parsed = optionalNumber(variability, key, `${path}.variabilityMeasures`);
        return parsed === undefined ? [] : [[key, parsed]];
      }),
    ) as DescriptiveStatistics["variabilityMeasures"],
    distributionMetrics: Object.fromEntries(
      ["q25", "q50", "q75", "iqr", "skewness", "kurtosis"].flatMap((key) => {
        const parsed = optionalNumber(distribution, key, `${path}.distributionMetrics`);
        return parsed === undefined ? [] : [[key, parsed]];
      }),
    ) as DescriptiveStatistics["distributionMetrics"],
    typeDistribution: {
      counts,
      percentages,
      ...(mostCommon === undefined ? {} : { mostCommon }),
      ...(fourDimensionalPivot === undefined ? {} : { fourDimensionalPivot }),
    },
  };
}

export function parseStatistics(value: unknown): StatisticsData {
  const root = recordAt(value, "data");
  const isPythonShape = "descriptiveStatistics" in root;
  const descriptiveStatistics = parseDescriptiveStatistics(
    isPythonShape ? root.descriptiveStatistics : root,
    isPythonShape ? "data.descriptiveStatistics" : "data",
  );
  const auxiliary = (key: string): StatisticsJsonObject => {
    if (isPythonShape && !(key in root)) throw new AnalyticsContractError(`data.${key}`);
    return parseJsonObject(key in root ? root[key] : {}, `data.${key}`);
  };

  const inferentialStatistics: StatisticsData["inferentialStatistics"] = isPythonShape
    ? parseNamedJsonObject(root.inferentialStatistics, "data.inferentialStatistics", [
        "confidenceIntervals",
        "hypothesisTests",
        "regressionAnalysis",
      ] as const)
    : (auxiliary("inferentialStatistics") as StatisticsData["inferentialStatistics"]);
  const timeSeriesAnalysis: StatisticsData["timeSeriesAnalysis"] = isPythonShape
    ? parseNamedJsonObject(root.timeSeriesAnalysis, "data.timeSeriesAnalysis", [
        "movingAverages",
        "trendAnalysis",
        "seasonalDecomposition",
        "autocorrelation",
      ] as const)
    : (auxiliary("timeSeriesAnalysis") as StatisticsData["timeSeriesAnalysis"]);
  const correlationAnalysis: StatisticsData["correlationAnalysis"] = isPythonShape
    ? parseNamedJsonObject(root.correlationAnalysis, "data.correlationAnalysis", [
        "pearsonCorrelation",
        "spearmanCorrelation",
        "mutualInformation",
      ] as const)
    : (auxiliary("correlationAnalysis") as StatisticsData["correlationAnalysis"]);
  const anomalyDetection: StatisticsData["anomalyDetection"] = isPythonShape
    ? parseNamedJsonObject(root.anomalyDetection, "data.anomalyDetection", [
        "outlierDetection",
        "anomalyStatistics",
      ] as const)
    : (auxiliary("anomalyDetection") as StatisticsData["anomalyDetection"]);
  const performanceMetrics = auxiliary("performanceMetrics");

  return {
    descriptiveStatistics,
    inferentialStatistics,
    timeSeriesAnalysis,
    correlationAnalysis,
    anomalyDetection,
    performanceMetrics,
    ...(isPythonShape
      ? {}
      : {
          basicStats: descriptiveStatistics.basicStats,
          centralTendency: descriptiveStatistics.centralTendency,
          variabilityMeasures: descriptiveStatistics.variabilityMeasures,
          distributionMetrics: descriptiveStatistics.distributionMetrics,
          typeDistribution: descriptiveStatistics.typeDistribution,
        }),
  };
}
