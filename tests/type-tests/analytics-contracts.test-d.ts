/** 验证分析领域契约的 TypeScript 类型兼容性和收窄要求。 */
import type { AnalyticsSuccess } from "../../apps/web/src/services/analytics/contracts/common";
import type { HazardData } from "../../apps/web/src/services/analytics/analyticsTypes";
import type { PivotTrendsData } from "../../apps/web/src/services/analytics/contracts/pivot";
import type { PivotQueryData } from "../../apps/web/src/services/analytics/contracts/pivotQuery";
import type { PivotSummaryData } from "../../apps/web/src/services/analytics/contracts/pivotSummary";
import type { RiskAssessmentData } from "../../apps/web/src/services/analytics/contracts/risk";
import type { StatisticsData } from "../../apps/web/src/services/analytics/contracts/statistics";

const validStatistics = {
  success: true,
  data: {
    descriptiveStatistics: {
      basicStats: {
        count: 1,
        mean: { magnitude: 0 },
        std: { magnitude: null },
        min: { magnitude: 0 },
        max: { magnitude: 0 },
      },
      centralTendency: { mean: 0, median: 0, mode: null },
      variabilityMeasures: {},
      distributionMetrics: {},
      typeDistribution: { counts: { FLOOD: 1 }, percentages: { FLOOD: 100 } },
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
    correlationAnalysis: { pearsonCorrelation: {}, spearmanCorrelation: {}, mutualInformation: {} },
    anomalyDetection: { outlierDetection: {}, anomalyStatistics: {} },
    performanceMetrics: {},
  },
} satisfies AnalyticsSuccess<StatisticsData>;

const validRiskAssessment = {
  success: true,
  data: {
    overallRiskScore: { score: 0, level: "MINIMAL" },
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
  },
} satisfies AnalyticsSuccess<RiskAssessmentData>;

const statistics: AnalyticsSuccess<StatisticsData> = validStatistics;
// @ts-expect-error RiskAssessmentData 不能作为 StatisticsData 使用。
const invalid: AnalyticsSuccess<StatisticsData> = validRiskAssessment;
const invalidTemporal: AnalyticsSuccess<RiskAssessmentData> = {
  ...validRiskAssessment,
  data: {
    ...validRiskAssessment.data,
    temporalRisks: {
      // @ts-expect-error 时间段风险计数必须为数字，不能是字符串。
      recent7Days: "0",
      previous7Days: 0,
      growthRate: 0,
      trend: "stable",
    },
  },
};

// @ts-expect-error 判别联合必须先收窄，才能读取仅在 ready 状态下存在的字段。
type UnnarrowedPivotRows = PivotTrendsData["all_trends"];

const validPivotQuery = {
  results: [{ metadata: { tags: ["flood", null] } }],
  total_count: 1,
  query_params: {
    time_range: ["2026-09-01", "2026-09-03"],
    regions: ["Asia-Pacific"],
    types: ["FLOOD"],
    severities: ["WATCH"],
  },
} satisfies PivotQueryData;

const validHazard = {
  id: "hazard-zero",
  type: "FLOOD",
  title: "Zero-value hazard",
  coordinates: [0, 0],
  timestamp: "2026-09-11T00:00:00.000Z",
  magnitude: 0,
  populationExposed: 0,
} satisfies HazardData;

const invalidHazardCoordinates: HazardData = {
  ...validHazard,
  // @ts-expect-error Hazard 坐标必须是数值经度和纬度。
  coordinates: ["0", 0],
};

const invalidHazardPopulation: HazardData = {
  ...validHazard,
  // @ts-expect-error 暴露人口存在时必须为数值。
  populationExposed: "0",
};

// @ts-expect-error Pivot 查询和汇总数据是不同的契约。
const invalidSummary: PivotSummaryData = validPivotQuery;

export {
  invalid,
  invalidHazardCoordinates,
  invalidHazardPopulation,
  invalidSummary,
  invalidTemporal,
  statistics,
  validHazard,
  validPivotQuery,
};
export type { UnnarrowedPivotRows };
