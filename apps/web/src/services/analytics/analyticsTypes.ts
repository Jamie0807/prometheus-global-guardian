/**
 * 定义分析服务的数据类型及兼容类型。
 */
import type { AnalyticsSuccess } from "./contracts/common";
import type { HazardLayerId, HazardSourceId } from "@pgg/hazard-domain";

export type {
  AnalyticsErrorEnvelope,
  AnalyticsResponseMetadata,
  AnalyticsSuccess,
} from "./contracts/common";
export type { StatisticsData } from "./contracts/statistics";
export type {
  OverallPredictionAssessment,
  PredictionModelResult,
  PredictionStatus,
  PredictionsData,
} from "./contracts/predictions";
export type { RiskAssessmentData } from "./contracts/risk";
export type { AnalyticsServiceInfo } from "./contracts/serviceInfo";
export type { QualityHistoryData } from "./contracts/qualityHistory";
export type { ETLProcessData } from "./contracts/etl";
export type { ComprehensiveAnalysisData } from "./contracts/comprehensive";
export type {
  SourceComparisonData,
  UnifiedMergeData,
  UnifiedTransformData,
} from "./contracts/unified";
export type { AnalyticsJsonTreeRecord, AnalyticsJsonTreeValue } from "./contracts/records";
export type { PivotQueryData } from "./contracts/pivotQuery";
export type { PivotSummaryData } from "./contracts/pivotSummary";

export type HazardCoordinates = [longitude: number, latitude: number];

export interface HazardData {
  id: string;
  type: string;
  title: string;
  coordinates: HazardCoordinates;
  timestamp: string;
  magnitude?: number | null;
  severity?: string;
  source?: string;
  populationExposed?: number | null;
  schemaVersion?: "1";
  eventId?: string;
  sourceEventId?: string;
  sourceId?: HazardSourceId;
  layerId?: HazardLayerId;
  observedAt?: string;
  updatedAt?: string;
  confidence?: number;
}

export interface AnalysisRequest {
  hazards: HazardData[];
  analysisType?: string;
  timeRange?: number;
  time_dim?: "year" | "quarter" | "month" | "week" | "day" | "date_only";
  geo_dim?: "region" | "continent" | "geo_grid";
  aggfunc?: "count" | "sum" | "mean";
  time_range?: [start: string, end: string];
  regions?: string[];
  types?: string[];
  severities?: string[];
  time_window?: number;
}

export type AnalyticsResponse<T = unknown> = AnalyticsSuccess<T>;

/** 在旧端点适配器迁移至数据契约期间保留的旧版数据结构。 */
export interface LegacyAnalyticsResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: unknown;
}
