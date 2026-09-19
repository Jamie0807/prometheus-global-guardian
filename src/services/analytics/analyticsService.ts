/**
 * Python 分析服务 API 客户端
 * 与 FastAPI 后端通信的客户端
 *
 * 客户端能力：
 * - 请求超时控制
 * - 自动重试机制
 * - 错误处理增强
 */

import { requestRaw } from "../http/httpClient";
import type { Hazard } from "../../types";
import type { AnalysisRequest, HazardData } from "./analyticsTypes";
import type { HazardSourceId } from "../../../shared/hazards/hazard-event";
import type { AnalyticsSuccess } from "./contracts/common";
import {
  AnalyticsBusinessError,
  AnalyticsContractError,
  parseAnalyticsSuccess,
} from "./contracts/common";
import { parseAnalyticsHazardData } from "./contracts/hazardInput";
import { parsePredictions, type PredictionsData } from "./contracts/predictions";
import { parseRiskAssessment, type RiskAssessmentData } from "./contracts/risk";
import { parseStatistics, type StatisticsData } from "./contracts/statistics";
import {
  parseQualityReport,
  parseQualityThresholds,
  type QualityReportData,
  type QualityThresholds,
} from "./contracts/quality";
import {
  parsePivotRiskScores,
  parsePivotTable,
  parsePivotTrends,
  type PivotRiskScoresData,
  type PivotTableData,
  type PivotTrendsData,
} from "./contracts/pivot";
import { createClientLogger } from "../../utils/logger";
import { parseAnalyticsServiceInfo, type AnalyticsServiceInfo } from "./contracts/serviceInfo";
import { parseQualityHistory, type QualityHistoryData } from "./contracts/qualityHistory";
import { parseETLProcess, type ETLProcessData } from "./contracts/etl";
import {
  parseComprehensiveAnalysis,
  type ComprehensiveAnalysisData,
} from "./contracts/comprehensive";
import {
  parseUnifiedMerge,
  parseUnifiedTransform,
  type UnifiedMergeData,
  type UnifiedTransformData,
} from "./contracts/unified";
import { parsePivotQuery, type PivotQueryData } from "./contracts/pivotQuery";
import { parsePivotSummary, type PivotSummaryData } from "./contracts/pivotSummary";

const API_BASE_URL = import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8001";
const REQUEST_TIMEOUT = 30000; // 30秒超时
const MAX_RETRIES = 3;
const logger = createClientLogger("analytics-service");

type HazardProperties = Record<string, unknown>;
type HazardInput = Partial<Hazard> & {
  populationExposed?: number | null;
  properties?: HazardProperties;
};

/**
 * 带超时控制的fetch
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT,
): Promise<Response> {
  try {
    return await requestRaw(url, options, { timeoutMs: timeout });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Request timed out") {
      throw new Error("请求超时，请检查网络连接或稍后重试");
    }
    throw error;
  }
}

/**
 * 带重试的请求函数
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.ok) {
        return response;
      }
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        await throwAnalyticsResponseError(response);
      }
      if (i === retries - 1) {
        await throwAnalyticsResponseError(response);
      }
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      logger.warn("request_retry_scheduled", { attempt: i + 1, delay, retries });
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      if (error instanceof AnalyticsBusinessError || error instanceof AnalyticsContractError) {
        throw error;
      }
      const status =
        error && typeof error === "object" && "status" in error
          ? (error.status as number | undefined)
          : undefined;
      if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
        throw new AnalyticsBusinessError();
      }

      lastError =
        status !== undefined
          ? new AnalyticsBusinessError()
          : error instanceof Error
            ? error
            : new Error("请求失败");

      // 最后一次网络尝试失败，抛出错误
      if (i === retries - 1) {
        break;
      }

      // 指数退避：等待 2^i 秒后重试
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      logger.warn("request_retry_scheduled", { attempt: i + 1, delay, retries });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("请求失败");
}

async function readAnalyticsJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new AnalyticsContractError("response.body");
  }
}

async function throwAnalyticsResponseError(response: Response): Promise<never> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AnalyticsBusinessError();
  }

  try {
    parseAnalyticsSuccess(payload, () => undefined);
  } catch (error: unknown) {
    if (error instanceof AnalyticsBusinessError) throw error;
  }
  throw new AnalyticsBusinessError();
}

export type { AnalysisRequest, HazardData } from "./analyticsTypes";

/**
 * 在 5 秒超时内检查服务健康状态。
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    return response.ok;
  } catch {
    logger.debug("health_check_failed");
    return false;
  }
}

/**
 * 获取服务信息
 */
export async function getServiceInfo(): Promise<AnalyticsServiceInfo> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/`);
    if (!response.ok) throw new Error("Failed to fetch service info");
    const payload = await readAnalyticsJson(response);
    return parseAnalyticsServiceInfo(payload);
  } catch (error: unknown) {
    logger.error("service_info_fetch_failed");
    throw error;
  }
}

/**
 * 请求统计分析；可重试暂时性失败。
 */
export async function getStatistics(
  hazards: readonly HazardInput[],
): Promise<AnalyticsSuccess<StatisticsData>> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error("没有数据可供分析");
    }

    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/statistics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazards: formattedData }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseStatistics);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("statistics_fetch_failed");
    throw new Error("统计分析请求失败");
  }
}

/**
 * 请求预测分析；可重试暂时性失败。
 */
export async function getPredictions(
  hazards: readonly HazardInput[],
  analysisType = "predictions",
  timeRange = 30,
): Promise<AnalyticsSuccess<PredictionsData>> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error("没有数据可供预测");
    }

    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazards: formattedData,
        analysisType,
        timeRange,
      }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePredictions);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("predictions_fetch_failed");
    throw new Error("预测分析请求失败");
  }
}

/**
 * ETL 数据处理
 */
export async function processETL(
  hazards: readonly HazardInput[],
): Promise<AnalyticsSuccess<ETLProcessData>> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/etl/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazards: formattedData }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseETLProcess);
  } catch (error: unknown) {
    logger.error("etl_processing_failed");
    throw error;
  }
}

/**
 * 请求风险评估；可重试暂时性失败。
 */
export async function getRiskAssessment(
  hazards: readonly HazardInput[],
): Promise<AnalyticsSuccess<RiskAssessmentData>> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error("没有数据可供风险评估");
    }

    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/risk-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazards: formattedData }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseRiskAssessment);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("risk_assessment_failed");
    throw new Error("风险评估请求失败");
  }
}

/**
 * 综合分析
 */
export async function getComprehensiveAnalysis(
  hazards: readonly HazardInput[],
  analysisType = "comprehensive",
  timeRange = 30,
): Promise<AnalyticsSuccess<ComprehensiveAnalysisData>> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazards: formattedData,
        analysisType,
        timeRange,
      }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseComprehensiveAnalysis);
  } catch (error: unknown) {
    logger.error("comprehensive_analysis_failed");
    throw error;
  }
}

/**
 * ========== 数据质量监控和统一模型 API ==========
 */

/**
 * 数据质量评估（五维质量监控）
 */
export async function assessDataQuality(
  hazards: readonly HazardInput[],
  source: string = "unknown",
): Promise<AnalyticsSuccess<QualityReportData>> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error("没有数据可供质量评估");
    }

    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/quality/assess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazards: formattedData,
        source,
      }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseQualityReport);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("quality_assessment_failed");
    throw new Error("质量评估请求失败");
  }
}

/**
 * 转换为统一数据模型
 */
export async function transformToUnifiedModel(
  hazards: readonly HazardInput[],
  source: string,
): Promise<AnalyticsSuccess<UnifiedTransformData>> {
  try {
    if (!hazards || hazards.length === 0) {
      throw new Error("没有数据可供转换");
    }

    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/unified-model/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hazards: formattedData,
        source,
      }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseUnifiedTransform);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("unified_model_transformation_failed");
    throw new Error("统一模型转换请求失败");
  }
}

/**
 * 合并多数据源
 */
export async function mergeMultiSourceData(
  usgsData?: readonly unknown[],
  nasaData?: readonly unknown[],
  gdacsData?: readonly unknown[],
): Promise<AnalyticsSuccess<UnifiedMergeData>> {
  try {
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/unified-model/merge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usgs_data: usgsData || null,
        nasa_data: nasaData || null,
        gdacs_data: gdacsData || null,
      }),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseUnifiedMerge);
  } catch (error: unknown) {
    if (error instanceof AnalyticsContractError || error instanceof AnalyticsBusinessError)
      throw error;
    logger.error("multi_source_merge_failed");
    throw new Error("多数据源合并请求失败");
  }
}

/**
 * 获取质量阈值配置
 */
export async function getQualityThresholds(): Promise<AnalyticsSuccess<QualityThresholds>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/quality/thresholds`, {}, 5000);
    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }
    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseQualityThresholds);
  } catch (error) {
    logger.error("quality_thresholds_fetch_failed");
    throw error;
  }
}

/**
 * 获取质量历史记录
 */
export async function getQualityHistory(
  limit: number = 10,
): Promise<AnalyticsSuccess<QualityHistoryData>> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/quality/history?limit=${limit}`,
      {},
      5000,
    );
    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }
    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parseQualityHistory);
  } catch (error) {
    logger.error("quality_history_fetch_failed");
    throw error;
  }
}

/**
 * 格式化灾害数据为 Python API 期望的格式
 */
export function formatHazards(hazards: readonly HazardInput[]): HazardData[] {
  return hazards.map((hazard, idx) => {
    const properties = hazard.properties;
    const eventId = readCanonicalField(hazard, properties, "eventId");
    const sourceEventId = readCanonicalField(hazard, properties, "sourceEventId");
    const sourceId = readCanonicalField(hazard, properties, "sourceId");
    const layerId = readCanonicalField(hazard, properties, "layerId");
    const schemaVersion = readCanonicalField(hazard, properties, "schemaVersion");
    const observedAt = readCanonicalField(hazard, properties, "observedAt");
    const updatedAt = readCanonicalField(hazard, properties, "updatedAt");
    const confidence = readCanonicalField(hazard, properties, "confidence");
    const source = hazard.source ?? properties?.source ?? sourceLabel(sourceId);

    const candidate = {
      id: String(hazard.id ?? eventId ?? properties?.id ?? `hazard-${idx}-${Date.now()}`),
      type: String(hazard.type ?? properties?.type ?? "未分类"),
      title: toBoundedText(
        hazard.title ?? properties?.title ?? hazard.description ?? properties?.description,
        "Unknown Event",
        256,
      ),
      coordinates: toCoordinates(hazard.geometry?.coordinates, `hazards.${idx}.coordinates`) ??
        toCoordinates(properties?.coordinates, `hazards.${idx}.properties.coordinates`) ?? [0, 0],
      timestamp: toBoundedText(
        hazard.timestamp ?? properties?.timestamp ?? observedAt,
        new Date().toISOString(),
        64,
      ),
      magnitude: toNullableNumber(
        hazard.magnitude ?? properties?.magnitude,
        `hazards.${idx}.magnitude`,
      ),
      severity: String(hazard.severity ?? properties?.severity ?? "unknown"),
      source: String(source ?? "DisasterAWARE"),
      populationExposed: toNullableNumber(
        hazard.populationExposed ?? properties?.populationExposed,
        `hazards.${idx}.populationExposed`,
      ),
      ...(schemaVersion === undefined ? {} : { schemaVersion }),
      ...(eventId === undefined ? {} : { eventId }),
      ...(sourceEventId === undefined ? {} : { sourceEventId }),
      ...(sourceId === undefined ? {} : { sourceId }),
      ...(layerId === undefined ? {} : { layerId }),
      ...(observedAt === undefined ? {} : { observedAt }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
      ...(confidence === undefined ? {} : { confidence }),
    };

    return parseAnalyticsHazardData(candidate, `hazards.${idx}`);
  });
}

function readCanonicalField(
  hazard: HazardInput,
  properties: HazardProperties | undefined,
  key: string,
): unknown {
  if (Object.prototype.hasOwnProperty.call(hazard, key)) {
    return hazard[key as keyof HazardInput];
  }
  if (properties && Object.prototype.hasOwnProperty.call(properties, key)) {
    return properties[key];
  }
  return undefined;
}

function sourceLabel(sourceId: unknown): string | undefined {
  switch (sourceId as HazardSourceId | undefined) {
    case "disasteraware":
      return "DisasterAWARE";
    case "usgs":
      return "USGS";
    case "nasa-eonet":
      return "NASA EONET";
    case "gdacs":
      return "GDACS";
    default:
      return undefined;
  }
}

function toCoordinates(value: unknown, path: string): HazardData["coordinates"] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length < 2) {
    throw new AnalyticsContractError(path);
  }

  // GeoJSON Position 可能包含第三个海拔或深度值；分析服务只使用经度和纬度。
  const [longitude, latitude] = value;
  if (
    typeof longitude !== "number" ||
    !Number.isFinite(longitude) ||
    typeof latitude !== "number" ||
    !Number.isFinite(latitude)
  ) {
    throw new AnalyticsContractError(path);
  }
  return [longitude, latitude];
}

function toBoundedText(value: unknown, fallback: string, maximum: number): string {
  const text = value === null || value === undefined ? "" : String(value);
  return (text.trim() === "" ? fallback : text).slice(0, maximum);
}

function toNullableNumber(value: unknown, path: string): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AnalyticsContractError(path);
  }
  return value;
}

// ==================== 4维数据透视表API ====================

/**
 * 创建4维数据透视表（时间×地理×类型×严重性）
 */
export async function create4DPivotTable(
  hazards: readonly HazardInput[],
  options?: {
    timeDim?: NonNullable<AnalysisRequest["time_dim"]>;
    geoDim?: NonNullable<AnalysisRequest["geo_dim"]>;
    aggfunc?: NonNullable<AnalysisRequest["aggfunc"]>;
  },
): Promise<AnalyticsSuccess<PivotTableData>> {
  try {
    const formattedData = formatHazards(hazards);
    const request = {
      hazards: formattedData,
      time_dim: options?.timeDim ?? "month",
      geo_dim: options?.geoDim ?? "region",
      aggfunc: options?.aggfunc ?? "count",
    } satisfies AnalysisRequest;

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePivotTable);
  } catch (error) {
    logger.error("pivot_table_creation_failed");
    throw error;
  }
}

/**
 * 多维度联合查询
 */
export async function multiDimensionalQuery(
  hazards: readonly HazardInput[],
  filters: {
    timeRange?: [string, string];
    regions?: string[];
    types?: string[];
    severities?: string[];
  },
): Promise<AnalyticsSuccess<PivotQueryData>> {
  try {
    const formattedData = formatHazards(hazards);
    const request = {
      hazards: formattedData,
      time_range: filters.timeRange,
      regions: filters.regions,
      types: filters.types,
      severities: filters.severities,
    } satisfies AnalysisRequest;

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePivotQuery);
  } catch (error) {
    logger.error("multi_dimensional_query_failed");
    throw error;
  }
}

/**
 * 4维趋势分析
 */
export async function analyze4DTrends(
  hazards: readonly HazardInput[],
  timeWindow: number = 7,
): Promise<AnalyticsSuccess<PivotTrendsData>> {
  try {
    const formattedData = formatHazards(hazards);
    const request = {
      hazards: formattedData,
      time_window: timeWindow,
    } satisfies AnalysisRequest;

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/trend-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePivotTrends);
  } catch (error) {
    logger.error("trend_analysis_failed");
    throw error;
  }
}

/**
 * 4维风险评分
 */
export async function calculate4DRiskScores(
  hazards: readonly HazardInput[],
  timeWindow: number = 7,
): Promise<AnalyticsSuccess<PivotRiskScoresData>> {
  try {
    const formattedData = formatHazards(hazards);
    const request = {
      hazards: formattedData,
      time_window: timeWindow,
    } satisfies AnalysisRequest;

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/risk-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePivotRiskScores);
  } catch (error) {
    logger.error("risk_scoring_failed");
    throw error;
  }
}

/**
 * 获取4维数据汇总统计
 */
export async function get4DSummary(
  hazards: readonly HazardInput[],
): Promise<AnalyticsSuccess<PivotSummaryData>> {
  try {
    const formattedData = formatHazards(hazards);
    const request = {
      hazards: formattedData,
    } satisfies AnalysisRequest;

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await throwAnalyticsResponseError(response);
    }

    const payload = await readAnalyticsJson(response);
    return parseAnalyticsSuccess(payload, parsePivotSummary);
  } catch (error) {
    logger.error("summary_fetch_failed");
    throw error;
  }
}
