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

export interface AnalyticsResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: unknown;
}
