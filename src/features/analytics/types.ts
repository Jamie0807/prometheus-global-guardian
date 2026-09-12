import type { Hazard as AppHazard } from "../../types";
import type { AnalyticsSuccess } from "../../services/analytics/contracts/common";
import type { PredictionsData } from "../../services/analytics/contracts/predictions";
export type { PredictionModelResult } from "../../services/analytics/contracts/predictions";
import type { RiskAssessmentData } from "../../services/analytics/contracts/risk";
import type { StatisticsData } from "../../services/analytics/contracts/statistics";
export type {
  PivotRiskScoresData,
  PivotTrendsData,
} from "../../services/analytics/contracts/pivot";

export type AnalyticsHazard = AppHazard & {
  properties?: {
    type?: string;
    magnitude?: number | string;
    severity?: string;
    episodealertlevel?: number | string;
    alertlevel?: number | string;
    mag?: number | string;
    magnitudeValue?: number | string;
  };
  geometry: AppHazard["geometry"] & {
    magnitudeValue?: number | string;
    magnitude?: number | string;
  };
};

export type NumberMap = Record<string, number>;
export type StatisticsResponse = AnalyticsSuccess<StatisticsData>;
export type PredictionsResponse = AnalyticsSuccess<PredictionsData>;
export type RiskAssessmentResponse = AnalyticsSuccess<RiskAssessmentData>;

export interface ConfidenceInterval {
  mean?: number;
  lowerBound?: number;
  upperBound?: number;
  marginOfError?: number;
}

export interface TrendAnalysis {
  trend?: string;
  slope?: number;
  intercept?: number;
  r_squared?: number;
}

export interface CorrelationValue {
  magnitude?: number;
  populationExposed?: number;
}

export interface FourDimensionalPivot {
  timeDimension?: NumberMap;
  geoDimension?: NumberMap;
  typeDimension?: NumberMap;
  severityDimension?: NumberMap;
  crossAnalysis?: NumberMap;
}

export interface OverviewStatisticsView {
  magnitudeMean: number | null;
  magnitudeStandardDeviation: number | null;
  inferentialStatistics?: {
    confidenceIntervals?: {
      magnitude?: ConfidenceInterval;
    };
  };
  anomalyDetection?: {
    anomalyStatistics?: {
      totalRecords: number;
      iqrOutliers: number;
      zscoreOutliers: number;
      dataQualityScore: number;
    };
  };
  descriptiveStatistics?: {
    variabilityMeasures?: {
      standardDeviation?: number | null;
      range?: number | null;
      coefficientOfVariation?: number | null;
    };
    distributionMetrics?: {
      skewness?: number | null;
      q50?: number | null;
      iqr?: number | null;
    };
    typeDistribution?: {
      mostCommon?: string;
      counts: NumberMap;
      percentages: NumberMap;
      fourDimensionalPivot?: FourDimensionalPivot;
    };
  };
  correlationAnalysis?: {
    pearsonCorrelation?: Record<string, CorrelationValue>;
    spearmanCorrelation?: Record<string, CorrelationValue>;
  };
  timeSeriesAnalysis?: {
    trendAnalysis?: TrendAnalysis;
  };
}

export interface RiskRecommendation {
  ruleId?: string;
  severity?: string;
  message?: string;
  metrics?: Record<string, unknown>;
}

export interface TypeRisk {
  count?: number;
  riskScore?: number;
  averageMagnitude?: number;
  weight?: number;
}

export interface GeographicRisk {
  location?: {
    lat?: number;
    lon?: number;
  };
  hazardCount?: number;
  riskLevel?: string;
}

export type ServiceStatus = "checking" | "online" | "offline";
export type AnalyticsTab = "overview" | "charts" | "predictions" | "risk" | "quality";
