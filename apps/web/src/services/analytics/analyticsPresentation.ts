/**
 * 提供分析展示层的状态与文案转换工具。
 */
export type PredictionStatus = "ready" | "insufficient_data" | "model_error" | "no_result";
export type AnalyticsLocale = "zh-CN" | "en-US";

export interface PredictionDisplayInput {
  status?: unknown;
  accuracy?: unknown;
  dataPoints?: unknown;
  minimumDataPoints?: unknown;
  confidence?: unknown;
  error?: unknown;
}

export interface PredictionDisplay {
  status: PredictionStatus;
  label: string;
  detail: string;
  accuracyLabel: string;
  badgeColor: string;
}

export interface RiskRecommendationInput {
  ruleId?: unknown;
  severity?: unknown;
  message?: unknown;
  metrics?: unknown;
}

export interface QualityPresentationReport {
  overallScore: number;
  status: string;
  detailChecks: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
  };
  totalRecords: number;
  issues: string[];
  recommendations: string[];
}

interface AnalyticsCopy {
  noDataLabel: string;
  predictionStatusLabels: Record<PredictionStatus, string>;
  predictionDetails: Record<PredictionStatus, string>;
  insufficientDataDetail: (dataPoints: string, minimumDataPoints: string) => string;
  riskLevelLabels: Record<string, string>;
  trendLabels: Record<string, string>;
  recommendationSeverityLabels: Record<string, string>;
  qualityMessageTranslations: Array<[string, string]>;
  qualityDynamicMessages: {
    oldRecords: (count: string) => string;
  };
  unknownRecommendation: string;
  standardMonitoringRecommendation: string;
  legacyRecommendations: Array<[string, string]>;
  recommendationMessages: {
    overallCritical: (score: string, threshold: string) => string;
    overallHigh: (score: string, threshold: string) => string;
    temporalIncreasing: (growthRate: string) => string;
    earthquakeActivity: (eventCount: string, threshold: string) => string;
  };
}

const PREDICTION_STATUS_COLORS: Record<PredictionStatus, string> = {
  ready: "#4CAF50",
  insufficient_data: "#666",
  model_error: "#EF5350",
  no_result: "#777",
};

const ANALYTICS_COPY: Record<AnalyticsLocale, AnalyticsCopy> = {
  "zh-CN": {
    noDataLabel: "暂无数据",
    predictionStatusLabels: {
      ready: "可用",
      insufficient_data: "样本不足",
      model_error: "模型失败",
      no_result: "暂无结果",
    },
    predictionDetails: {
      ready: "预测结果可用",
      insufficient_data: "暂无预测结果",
      model_error: "模型计算失败，暂无法提供预测",
      no_result: "暂无预测结果",
    },
    insufficientDataDetail: (dataPoints, minimumDataPoints) =>
      `已有 ${dataPoints} 条，至少需要 ${minimumDataPoints} 条`,
    riskLevelLabels: {
      MINIMAL: "极低风险",
      LOW: "低风险",
      MODERATE: "中风险",
      HIGH: "高风险",
      CRITICAL: "严重风险",
    },
    trendLabels: {
      increasing: "上升",
      decreasing: "下降",
      stable: "稳定",
    },
    recommendationSeverityLabels: {
      critical: "紧急处置",
      warning: "重点关注",
      info: "常规监测",
    },
    qualityMessageTranslations: [
      ["Missing required fields:", "缺少必填字段："],
      ["Found unknown hazard types:", "发现未知灾害类型："],
      ["Found unknown data sources:", "发现未知数据源："],
      ["Found invalid severity levels:", "发现无效严重程度："],
      ["Add missing fields:", "补充缺失字段："],
      ["Standardize hazard type naming", "统一灾害类型命名"],
      ["Verify and standardize data source names", "校验并统一数据源名称"],
      ["Recalculate severity levels using standard thresholds", "使用标准阈值重新计算严重程度"],
      ["Update or archive outdated records", "更新或归档过期记录"],
    ],
    qualityDynamicMessages: {
      oldRecords: (count) => `${count} 条记录超过 30 天`,
    },
    unknownRecommendation: "请关注当前分析结果。",
    standardMonitoringRecommendation: "当前风险处于常规监测范围，建议维持标准监测流程。",
    legacyRecommendations: [
      ["Low risk.", "当前风险处于常规监测范围，建议维持标准监测流程。"],
      ["Moderate risk.", "当前风险处于中风险范围，建议继续监测并更新应急预案。"],
      ["High risk detected.", "检测到高风险，建议加强监测并准备响应团队。"],
      ["Immediate action required.", "需要立即处置，建议启动应急响应流程。"],
    ],
    recommendationMessages: {
      overallCritical: (score, threshold) =>
        `总体风险达到 ${score} 分（阈值 ${threshold} 分），建议立即启动应急响应。`,
      overallHigh: (score, threshold) =>
        `总体风险达到 ${score} 分（阈值 ${threshold} 分），建议加强监测并准备响应团队。`,
      temporalIncreasing: (growthRate) => `近期灾害活动增长 ${growthRate}%，建议加强监测。`,
      earthquakeActivity: (eventCount, threshold) =>
        `地震事件达到 ${eventCount} 条（阈值 ${threshold} 条），建议复核建筑安全预案。`,
    },
  },
  "en-US": {
    noDataLabel: "No data",
    predictionStatusLabels: {
      ready: "Available",
      insufficient_data: "Insufficient data",
      model_error: "Model failed",
      no_result: "No result",
    },
    predictionDetails: {
      ready: "Prediction is available",
      insufficient_data: "No prediction result",
      model_error: "Model calculation failed; prediction is temporarily unavailable",
      no_result: "No prediction result",
    },
    insufficientDataDetail: (dataPoints, minimumDataPoints) =>
      `${dataPoints} records available; at least ${minimumDataPoints} required`,
    riskLevelLabels: {
      MINIMAL: "Minimal risk",
      LOW: "Low risk",
      MODERATE: "Moderate risk",
      HIGH: "High risk",
      CRITICAL: "Critical risk",
    },
    trendLabels: {
      increasing: "Increasing",
      decreasing: "Decreasing",
      stable: "Stable",
    },
    recommendationSeverityLabels: {
      critical: "Critical action",
      warning: "Priority attention",
      info: "Routine monitoring",
    },
    qualityMessageTranslations: [
      ["Missing required fields:", "Missing required fields:"],
      ["Found unknown hazard types:", "Found unknown hazard types:"],
      ["Found unknown data sources:", "Found unknown data sources:"],
      ["Found invalid severity levels:", "Found invalid severity levels:"],
      ["Add missing fields:", "Add missing fields:"],
      ["Standardize hazard type naming", "Standardize hazard type naming"],
      ["Verify and standardize data source names", "Verify and standardize data source names"],
      [
        "Recalculate severity levels using standard thresholds",
        "Recalculate severity levels using standard thresholds",
      ],
      ["Update or archive outdated records", "Update or archive outdated records"],
    ],
    qualityDynamicMessages: {
      oldRecords: (count) => `${count} records are older than 30 days`,
    },
    unknownRecommendation: "Please review the current analysis results.",
    standardMonitoringRecommendation: "Risk is within the routine monitoring range.",
    legacyRecommendations: [
      ["Low risk.", "Risk is low. Maintain standard monitoring procedures."],
      ["Moderate risk.", "Risk is moderate. Continue monitoring and update contingency plans."],
      ["High risk detected.", "High risk detected. Enhance monitoring and prepare response teams."],
      [
        "Immediate action required.",
        "Immediate action required. Activate emergency response protocols.",
      ],
    ],
    recommendationMessages: {
      overallCritical: (score, threshold) =>
        `Overall risk reached ${score} (threshold ${threshold}); activate emergency response.`,
      overallHigh: (score, threshold) =>
        `Overall risk reached ${score} (threshold ${threshold}); enhance monitoring and prepare response teams.`,
      temporalIncreasing: (growthRate) =>
        `Recent hazard activity increased by ${growthRate}%; intensify monitoring.`,
      earthquakeActivity: (eventCount, threshold) =>
        `Earthquake events reached ${eventCount} (threshold ${threshold}); review building safety protocols.`,
    },
  },
};

function getAnalyticsCopy(locale: AnalyticsLocale = "zh-CN"): AnalyticsCopy {
  return ANALYTICS_COPY[locale] ?? ANALYTICS_COPY["zh-CN"];
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatCount(value: number | null): string {
  return value === null ? "?" : String(Math.max(0, Math.trunc(value)));
}

function formatMetric(value: unknown): string | null {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? null : numericValue.toFixed(1);
}

export function formatAnalyticsNumber(
  value: unknown,
  digits = 1,
  locale: AnalyticsLocale = "zh-CN",
): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null
    ? getAnalyticsCopy(locale).noDataLabel
    : numericValue.toFixed(digits);
}

export function formatAnalyticsPercent(value: unknown, locale: AnalyticsLocale = "zh-CN"): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null
    ? getAnalyticsCopy(locale).noDataLabel
    : `${Math.min(100, Math.max(0, numericValue)).toFixed(1)}%`;
}

export function formatAnalyticsSignedPercent(
  value: unknown,
  locale: AnalyticsLocale = "zh-CN",
): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null
    ? getAnalyticsCopy(locale).noDataLabel
    : `${numericValue.toFixed(1)}%`;
}

export function normalizeQualityScore(value: unknown): number | null {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) {
    return null;
  }

  return Math.min(1, Math.max(0, numericValue));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeQualityList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function normalizeQualityReport(input: unknown): QualityPresentationReport | null {
  if (!isRecord(input)) {
    return null;
  }

  const rawChecks = isRecord(input.detailChecks) ? input.detailChecks : {};
  const dimensionNames = [
    "completeness",
    "accuracy",
    "consistency",
    "timeliness",
    "validity",
  ] as const;
  const detailChecks = Object.fromEntries(
    dimensionNames.map((name) => [name, normalizeQualityScore(rawChecks[name]) ?? 0]),
  ) as QualityPresentationReport["detailChecks"];
  const rawOverallScore = toFiniteNumber(input.overallScore);
  const overallScore = normalizeQualityScore(
    rawOverallScore === null ? null : rawOverallScore > 1 ? rawOverallScore / 100 : rawOverallScore,
  );
  const totalRecords = toFiniteNumber(input.totalRecords);

  return {
    overallScore: (overallScore ?? 0) * 100,
    status: typeof input.status === "string" ? input.status.toLowerCase() : "unknown",
    detailChecks,
    totalRecords: totalRecords === null ? 0 : Math.max(0, Math.trunc(totalRecords)),
    issues: normalizeQualityList(input.issues),
    recommendations: normalizeQualityList(input.recommendations),
  };
}

export function localizeAnalyticsMessage(
  value: unknown,
  locale: AnalyticsLocale = "zh-CN",
): string {
  if (typeof value !== "string") {
    return locale === "en-US" ? "No description available" : "暂无说明";
  }

  const copy = getAnalyticsCopy(locale);
  const translations = copy.qualityMessageTranslations;

  const oldRecordsMatch = value.match(/^(\d+)\s+records are older than 30 days$/);
  if (oldRecordsMatch) {
    return copy.qualityDynamicMessages.oldRecords(oldRecordsMatch[1]);
  }

  const translation = translations.find(([prefix]) => value.startsWith(prefix));
  if (!translation) {
    return value;
  }

  return `${translation[1]}${value.slice(translation[0].length)}`;
}

export function getPredictionDisplay(
  input: PredictionDisplayInput,
  locale: AnalyticsLocale = "zh-CN",
): PredictionDisplay {
  const copy = getAnalyticsCopy(locale);
  const status =
    input.status === "failed"
      ? "model_error"
      : input.status === "ready" ||
          input.status === "insufficient_data" ||
          input.status === "model_error"
        ? input.status
        : input.error
          ? "model_error"
          : "no_result";
  const accuracy = toFiniteNumber(input.accuracy);
  const dataPoints = toFiniteNumber(input.dataPoints);
  const minimumDataPoints = toFiniteNumber(input.minimumDataPoints);

  let detail = copy.predictionDetails[status];
  if (status === "insufficient_data") {
    detail = copy.insufficientDataDetail(formatCount(dataPoints), formatCount(minimumDataPoints));
  }

  return {
    status,
    label: copy.predictionStatusLabels[status],
    detail,
    accuracyLabel:
      accuracy === null ? copy.noDataLabel : `${Math.min(100, Math.max(0, accuracy)).toFixed(1)}%`,
    badgeColor: PREDICTION_STATUS_COLORS[status],
  };
}

export function getRiskLevelLabel(value: unknown, locale: AnalyticsLocale = "zh-CN"): string {
  if (typeof value !== "string") {
    return locale === "en-US" ? "Unknown risk" : "未知风险";
  }

  return (
    getAnalyticsCopy(locale).riskLevelLabels[value.toUpperCase()] ??
    (locale === "en-US" ? "Unknown risk" : "未知风险")
  );
}

export function getTrendLabel(value: unknown, locale: AnalyticsLocale = "zh-CN"): string {
  if (typeof value !== "string") {
    return locale === "en-US" ? "Unknown trend" : "未知趋势";
  }

  return (
    getAnalyticsCopy(locale).trendLabels[value.toLowerCase()] ??
    (locale === "en-US" ? "Unknown trend" : "未知趋势")
  );
}

export function formatRiskRecommendation(
  input: RiskRecommendationInput,
  locale: AnalyticsLocale = "zh-CN",
): {
  severityLabel: string;
  text: string;
} {
  const copy = getAnalyticsCopy(locale);
  const ruleId = typeof input.ruleId === "string" ? input.ruleId : "unknown";
  const severity = typeof input.severity === "string" ? input.severity.toLowerCase() : "info";
  const metrics =
    typeof input.metrics === "object" && input.metrics !== null
      ? (input.metrics as Record<string, unknown>)
      : {};
  const score = formatMetric(metrics.score);
  const threshold = formatMetric(metrics.threshold);
  const growthRate = formatMetric(metrics.growthRate);
  const eventCount = toFiniteNumber(metrics.eventCount);

  let text = typeof input.message === "string" ? input.message : copy.unknownRecommendation;
  if (ruleId === "overall_critical" && score && threshold) {
    text = copy.recommendationMessages.overallCritical(score, threshold);
  } else if (ruleId === "overall_high" && score && threshold) {
    text = copy.recommendationMessages.overallHigh(score, threshold);
  } else if (ruleId === "temporal_increasing" && growthRate) {
    text = copy.recommendationMessages.temporalIncreasing(growthRate);
  } else if (ruleId === "earthquake_activity" && eventCount !== null && threshold) {
    text = copy.recommendationMessages.earthquakeActivity(formatCount(eventCount), threshold);
  } else if (ruleId === "standard_monitoring") {
    text = copy.standardMonitoringRecommendation;
  } else {
    const legacyRecommendation = copy.legacyRecommendations.find(([prefix]) =>
      text.startsWith(prefix),
    );
    if (legacyRecommendation) {
      text = legacyRecommendation[1];
    }
  }

  return {
    severityLabel:
      copy.recommendationSeverityLabels[severity] ?? (locale === "en-US" ? "Notice" : "提示"),
    text,
  };
}
