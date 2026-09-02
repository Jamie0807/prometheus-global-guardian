export interface HazardData {
  id: string;
  type: string;
  title: string;
  coordinates: number[];
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
}

export interface AnalyticsResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  [key: string]: unknown;
}
