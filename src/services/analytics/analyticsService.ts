/**
 * Python Analytics Service API Client
 * 与 FastAPI 后端通信的客户端
 *
 * 优化特性：
 * - 请求超时控制
 * - 自动重试机制
 * - 请求队列管理
 * - 错误处理增强
 */

import { requestRaw } from "../http/httpClient";
import type { Hazard } from "../../types";
import type { AnalyticsResponse, HazardData } from "./analyticsTypes";

const API_BASE_URL = import.meta.env.VITE_PYTHON_API_URL ?? "http://localhost:8001";
const REQUEST_TIMEOUT = 30000; // 30秒超时
const MAX_RETRIES = 3;

type AnalyticsResult<T = unknown> = Omit<AnalyticsResponse<T>, "data"> & { data: T };
type HazardProperties = Record<string, unknown>;
type HazardInput = Partial<Hazard> & {
  properties?: HazardProperties;
};

interface DataQualityReport {
  overallScore: number;
  status: string;
  detailChecks: Record<string, number>;
  totalRecords: number;
  issues: string[];
  recommendations: string[];
}

interface StatisticsData {
  basicStats?: {
    mean?: number;
    std?: number;
  };
}

interface RiskAssessmentData {
  overallRisk?: string;
  riskScore?: number;
}

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
  } catch (error) {
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
    } catch (error) {
      const status =
        error && typeof error === "object" && "status" in error
          ? (error.status as number | undefined)
          : undefined;
      if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
        const responseBody =
          error && typeof error === "object" && "responseBody" in error
            ? String(error.responseBody ?? "")
            : "";
        throw new Error(`请求失败: ${status}${responseBody ? ` ${responseBody}` : ""}`);
      }

      lastError = error instanceof Error ? error : new Error("请求失败");

      // 最后一次尝试失败，抛出错误
      if (i === retries - 1) {
        break;
      }

      // 指数退避：等待 2^i 秒后重试
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      console.log(`请求失败，${delay}ms后重试... (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("请求失败");
}

export type { AnalysisRequest, HazardData } from "./analyticsTypes";

/**
 * 检查服务健康状态（优化：添加超时控制）
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    return response.ok;
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}

/**
 * 获取服务信息
 */
export async function getServiceInfo(): Promise<AnalyticsResult> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/`);
    if (!response.ok) throw new Error("Failed to fetch service info");
    return await response.json();
  } catch (error) {
    console.error("Service info fetch failed:", error);
    throw error;
  }
}

/**
 * 统计分析（优化：添加重试和更好的错误处理）
 */
export async function getStatistics(
  hazards: readonly HazardInput[],
): Promise<AnalyticsResult<StatisticsData>> {
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
      const errorText = await response.text();
      throw new Error(`统计分析失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Statistics fetch failed:", error);
    throw new Error(`统计分析请求失败: ${(error as Error).message}`);
  }
}

/**
 * 预测分析（优化：添加重试和更好的错误处理）
 */
export async function getPredictions(
  hazards: readonly HazardInput[],
  analysisType = "predictions",
  timeRange = 30,
): Promise<AnalyticsResult> {
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
      const errorText = await response.text();
      throw new Error(`预测分析失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Predictions fetch failed:", error);
    throw new Error(`预测分析请求失败: ${(error as Error).message}`);
  }
}

/**
 * ETL 数据处理
 */
export async function processETL(hazards: readonly HazardInput[]): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);
    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/etl/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hazards: formattedData }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ETL API failed: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("ETL processing failed:", error);
    throw error;
  }
}

/**
 * 风险评估（优化：添加重试和更好的错误处理）
 */
export async function getRiskAssessment(
  hazards: readonly HazardInput[],
): Promise<AnalyticsResult<RiskAssessmentData>> {
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
      const errorText = await response.text();
      throw new Error(`风险评估失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Risk assessment failed:", error);
    throw new Error(`风险评估请求失败: ${(error as Error).message}`);
  }
}

/**
 * 综合分析
 */
export async function getComprehensiveAnalysis(
  hazards: readonly HazardInput[],
  analysisType = "comprehensive",
  timeRange = 30,
): Promise<AnalyticsResult> {
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
      const errorText = await response.text();
      throw new Error(`Comprehensive analysis API failed: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Comprehensive analysis failed:", error);
    throw error;
  }
}

/**
 * ========== 新增：数据质量监控和统一模型API ==========
 */

/**
 * 数据质量评估（五维质量监控）
 */
export async function assessDataQuality(
  hazards: readonly HazardInput[],
  source: string = "unknown",
): Promise<AnalyticsResult<DataQualityReport>> {
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
      const errorText = await response.text();
      throw new Error(`质量评估失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Quality assessment failed:", error);
    throw new Error(`质量评估请求失败: ${(error as Error).message}`);
  }
}

/**
 * 转换为统一数据模型
 */
export async function transformToUnifiedModel(
  hazards: readonly HazardInput[],
  source: string,
): Promise<AnalyticsResult> {
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
      const errorText = await response.text();
      throw new Error(`统一模型转换失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Unified model transformation failed:", error);
    throw new Error(`统一模型转换请求失败: ${(error as Error).message}`);
  }
}

/**
 * 合并多数据源
 */
export async function mergeMultiSourceData(
  usgsData?: readonly unknown[],
  nasaData?: readonly unknown[],
  gdacsData?: readonly unknown[],
): Promise<AnalyticsResult> {
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
      const errorText = await response.text();
      throw new Error(`多数据源合并失败: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Multi-source merge failed:", error);
    throw new Error(`多数据源合并请求失败: ${(error as Error).message}`);
  }
}

/**
 * 获取质量阈值配置
 */
export async function getQualityThresholds(): Promise<AnalyticsResult<Record<string, number>>> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/v1/quality/thresholds`, {}, 5000);
    if (!response.ok) {
      throw new Error("Failed to fetch quality thresholds");
    }
    return await response.json();
  } catch (error) {
    console.error("Quality thresholds fetch failed:", error);
    throw error;
  }
}

/**
 * 获取质量历史记录
 */
export async function getQualityHistory(limit: number = 10): Promise<AnalyticsResult> {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/v1/quality/history?limit=${limit}`,
      {},
      5000,
    );
    if (!response.ok) {
      throw new Error("Failed to fetch quality history");
    }
    return await response.json();
  } catch (error) {
    console.error("Quality history fetch failed:", error);
    throw error;
  }
}

/**
 * 格式化灾害数据为 Python API 期望的格式
 */
export function formatHazards(hazards: readonly HazardInput[]): HazardData[] {
  return hazards.map((h, idx) => ({
    id: String(h.id || `hazard-${idx}-${Date.now()}`),
    type: String(h.type || h.properties?.type || "未分类"),
    title: String(h.properties?.title || h.properties?.description || "Unknown Event"),
    coordinates: Array.isArray(h.geometry?.coordinates) ? h.geometry.coordinates : [0, 0],
    timestamp: h.properties?.timestamp ? String(h.properties.timestamp) : new Date().toISOString(),
    magnitude: h.properties?.magnitude ? Number(h.properties.magnitude) : null,
    severity: h.properties?.severity ? String(h.properties.severity) : "unknown",
    source: String(h.properties?.source || "DisasterAWARE"),
    populationExposed: h.properties?.populationExposed
      ? Number(h.properties.populationExposed)
      : null,
  }));
}

// ==================== 4维数据透视表API ====================

/**
 * 创建4维数据透视表（时间×地理×类型×严重性）
 */
export async function create4DPivotTable(
  hazards: readonly HazardInput[],
  options?: {
    timeDim?: "year" | "quarter" | "month" | "week" | "day" | "date_only";
    geoDim?: "region" | "continent" | "geo_grid";
    aggfunc?: "count" | "sum" | "mean";
  },
): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: formattedData,
        time_dim: options?.timeDim || "month",
        geo_dim: options?.geoDim || "region",
        aggfunc: options?.aggfunc || "count",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create 4D pivot table");
    }

    return await response.json();
  } catch (error) {
    console.error("4D pivot table creation failed:", error);
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
): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: formattedData,
        time_range: filters.timeRange,
        regions: filters.regions,
        types: filters.types,
        severities: filters.severities,
      }),
    });

    if (!response.ok) {
      throw new Error("Multi-dimensional query failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Multi-dimensional query failed:", error);
    throw error;
  }
}

/**
 * 4维趋势分析
 */
export async function analyze4DTrends(
  hazards: readonly HazardInput[],
  timeWindow: number = 7,
): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/trend-analysis`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: formattedData,
        time_window: timeWindow,
      }),
    });

    if (!response.ok) {
      throw new Error("4D trend analysis failed");
    }

    return await response.json();
  } catch (error) {
    console.error("4D trend analysis failed:", error);
    throw error;
  }
}

/**
 * 4维风险评分
 */
export async function calculate4DRiskScores(
  hazards: readonly HazardInput[],
  timeWindow: number = 7,
): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/risk-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: formattedData,
        time_window: timeWindow,
      }),
    });

    if (!response.ok) {
      throw new Error("4D risk scoring failed");
    }

    return await response.json();
  } catch (error) {
    console.error("4D risk scoring failed:", error);
    throw error;
  }
}

/**
 * 获取4维数据汇总统计
 */
export async function get4DSummary(hazards: readonly HazardInput[]): Promise<AnalyticsResult> {
  try {
    const formattedData = formatHazards(hazards);

    const response = await fetchWithRetry(`${API_BASE_URL}/api/v1/pivot/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: formattedData,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get 4D summary");
    }

    return await response.json();
  } catch (error) {
    console.error("4D summary fetch failed:", error);
    throw error;
  }
}
