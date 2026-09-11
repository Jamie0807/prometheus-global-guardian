import type { AnalyticsSuccess } from "../../src/services/analytics/contracts/common";
import type { PivotTrendsData } from "../../src/services/analytics/contracts/pivot";
import type { PivotQueryData } from "../../src/services/analytics/contracts/pivotQuery";
import type { PivotSummaryData } from "../../src/services/analytics/contracts/pivotSummary";
import type { RiskAssessmentData } from "../../src/services/analytics/contracts/risk";
import type { StatisticsData } from "../../src/services/analytics/contracts/statistics";

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
// @ts-expect-error RiskAssessmentData cannot be used as StatisticsData
const invalid: AnalyticsSuccess<StatisticsData> = validRiskAssessment;
const invalidTemporal: AnalyticsSuccess<RiskAssessmentData> = {
  ...validRiskAssessment,
  data: {
    ...validRiskAssessment.data,
    temporalRisks: {
      // @ts-expect-error Temporal risk counts must be numbers, not strings.
      recent7Days: "0",
      previous7Days: 0,
      growthRate: 0,
      trend: "stable",
    },
  },
};

// @ts-expect-error A discriminated union must be narrowed before ready-only fields are read
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

// @ts-expect-error Pivot query and summary data are distinct contracts
const invalidSummary: PivotSummaryData = validPivotQuery;

export { invalid, invalidSummary, invalidTemporal, statistics, validPivotQuery };
export type { UnnarrowedPivotRows };
