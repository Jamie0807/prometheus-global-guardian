import type { Hazard as AppHazard } from "../../types";

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

export interface AnalyticsPageProps {
  hazards: AnalyticsHazard[];
  onClose: () => void;
  onRefresh?: (data: AppHazard[]) => void;
}

export type NumberMap = Record<string, number>;

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

export interface AnalyticsData {
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
      standardDeviation?: number;
      range?: number;
      coefficientOfVariation?: number;
    };
    distributionMetrics?: {
      skewness?: number;
      q50?: number;
      iqr?: number;
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
  overallRiskAssessment?: {
    overallRiskScore?: number;
    riskLevel?: string;
    averageAccuracy?: number;
    recommendation?: string;
    modelWeights?: NumberMap;
  };
  earthquakePrediction?: PredictionSummary;
  volcanoPrediction?: PredictionSummary;
  stormPrediction?: PredictionSummary;
  floodPrediction?: PredictionSummary;
  wildfirePrediction?: PredictionSummary;
  overallRiskScore?: {
    score?: number;
    level?: string;
    trend?: string;
  };
  typeRisks?: Record<string, TypeRisk>;
  geographicRisks?: GeographicRisk[];
  temporalRisks?: {
    recent7Days: number;
    previous7Days: number;
    growthRate: number;
    trend: string;
  };
  recommendations?: string[];
  recommendationDetails?: RiskRecommendation[];
}

export interface PredictionSummary {
  status?: string;
  reason?: string;
  dataPoints?: number;
  minimumDataPoints?: number;
  confidence?: number | null;
  accuracy?: number;
  predictions?: {
    next7Days?: number[];
    averageMagnitude?: number;
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

export interface TrendRisk {
  region?: string;
  type?: string;
  trend_slope?: number;
}

export interface PivotRisk {
  region?: string;
  type?: string;
  risk_score?: number;
  total_events?: number;
}

export interface PivotStatistics {
  total_combinations?: number;
  increasing?: number;
  stable?: number;
  decreasing?: number;
  max_risk_score?: number;
  avg_risk_score?: number;
}

export interface AnalyticsRecord {
  success?: boolean;
  data: AnalyticsData;
  message?: string;
  error?: string;
}

export interface PivotTrendRecord {
  message?: string;
  statistics?: PivotStatistics;
  high_risk_trends?: TrendRisk[];
}

export interface PivotRiskRecord {
  message?: string;
  statistics?: PivotStatistics;
  top_10_risks?: PivotRisk[];
  all_risk_scores?: PivotRisk[];
}

export type ServiceStatus = "checking" | "online" | "offline";
export type AnalyticsTab = "overview" | "charts" | "predictions" | "risk" | "quality";
