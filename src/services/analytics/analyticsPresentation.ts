export type PredictionStatus = "ready" | "insufficient_data" | "model_error" | "no_result";

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

const PREDICTION_STATUS_LABELS: Record<PredictionStatus, string> = {
  ready: "可用",
  insufficient_data: "样本不足",
  model_error: "模型失败",
  no_result: "暂无结果",
};

const PREDICTION_STATUS_COLORS: Record<PredictionStatus, string> = {
  ready: "#4CAF50",
  insufficient_data: "#666",
  model_error: "#EF5350",
  no_result: "#777",
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  MINIMAL: "极低风险",
  LOW: "低风险",
  MODERATE: "中风险",
  HIGH: "高风险",
  CRITICAL: "严重风险",
};

const TREND_LABELS: Record<string, string> = {
  increasing: "上升",
  decreasing: "下降",
  stable: "稳定",
};

const RECOMMENDATION_SEVERITY_LABELS: Record<string, string> = {
  critical: "紧急处置",
  warning: "重点关注",
  info: "常规监测",
};

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

export function formatAnalyticsNumber(value: unknown, digits = 1): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? "暂无数据" : numericValue.toFixed(digits);
}

export function formatAnalyticsPercent(value: unknown): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null
    ? "暂无数据"
    : `${Math.min(100, Math.max(0, numericValue)).toFixed(1)}%`;
}

export function formatAnalyticsSignedPercent(value: unknown): string {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? "暂无数据" : `${numericValue.toFixed(1)}%`;
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

export function localizeAnalyticsMessage(value: unknown): string {
  if (typeof value !== "string") {
    return "暂无说明";
  }

  const translations: Array<[string, string]> = [
    ["Missing required fields:", "缺少必填字段："],
    ["Found unknown hazard types:", "发现未知灾害类型："],
    ["Found unknown data sources:", "发现未知数据源："],
    ["Found invalid severity levels:", "发现无效严重程度："],
    ["Add missing fields:", "补充缺失字段："],
    ["Standardize hazard type naming", "统一灾害类型命名"],
    ["Verify and standardize data source names", "校验并统一数据源名称"],
    ["Recalculate severity levels using standard thresholds", "使用标准阈值重新计算严重程度"],
  ];

  const translation = translations.find(([prefix]) => value.startsWith(prefix));
  if (!translation) {
    return value;
  }

  return `${translation[1]}${value.slice(translation[0].length)}`;
}

export function getPredictionDisplay(input: PredictionDisplayInput): PredictionDisplay {
  const status =
    input.status === "ready" ||
    input.status === "insufficient_data" ||
    input.status === "model_error"
      ? input.status
      : input.error
        ? "model_error"
        : "no_result";
  const accuracy = toFiniteNumber(input.accuracy);
  const dataPoints = toFiniteNumber(input.dataPoints);
  const minimumDataPoints = toFiniteNumber(input.minimumDataPoints);

  let detail = "暂无预测结果";
  if (status === "insufficient_data") {
    detail = `已有 ${formatCount(dataPoints)} 条，至少需要 ${formatCount(minimumDataPoints)} 条`;
  } else if (status === "model_error") {
    detail = "模型计算失败，暂无法提供预测";
  } else if (status === "ready") {
    detail = "预测结果可用";
  }

  return {
    status,
    label: PREDICTION_STATUS_LABELS[status],
    detail,
    accuracyLabel:
      accuracy === null ? "暂无数据" : `${Math.min(100, Math.max(0, accuracy)).toFixed(1)}%`,
    badgeColor: PREDICTION_STATUS_COLORS[status],
  };
}

export function getRiskLevelLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "未知风险";
  }

  return RISK_LEVEL_LABELS[value.toUpperCase()] ?? "未知风险";
}

export function getTrendLabel(value: unknown): string {
  if (typeof value !== "string") {
    return "未知趋势";
  }

  return TREND_LABELS[value.toLowerCase()] ?? "未知趋势";
}

export function formatRiskRecommendation(input: RiskRecommendationInput): {
  severityLabel: string;
  text: string;
} {
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

  let text = typeof input.message === "string" ? input.message : "请关注当前分析结果。";
  if (ruleId === "overall_critical" && score && threshold) {
    text = `总体风险达到 ${score} 分（阈值 ${threshold} 分），建议立即启动应急响应。`;
  } else if (ruleId === "overall_high" && score && threshold) {
    text = `总体风险达到 ${score} 分（阈值 ${threshold} 分），建议加强监测并准备响应团队。`;
  } else if (ruleId === "temporal_increasing" && growthRate) {
    text = `近期灾害活动增长 ${growthRate}%，建议加强监测。`;
  } else if (ruleId === "earthquake_activity" && eventCount !== null && threshold) {
    text = `地震事件达到 ${formatCount(eventCount)} 条（阈值 ${threshold} 条），建议复核建筑安全预案。`;
  } else if (ruleId === "standard_monitoring") {
    text = "当前风险处于常规监测范围，建议维持标准监测流程。";
  } else if (text.startsWith("Low risk.")) {
    text = "当前风险处于常规监测范围，建议维持标准监测流程。";
  } else if (text.startsWith("Moderate risk.")) {
    text = "当前风险处于中风险范围，建议继续监测并更新应急预案。";
  } else if (text.startsWith("High risk detected.")) {
    text = "检测到高风险，建议加强监测并准备响应团队。";
  } else if (text.startsWith("Immediate action required.")) {
    text = "需要立即处置，建议启动应急响应流程。";
  }

  return {
    severityLabel: RECOMMENDATION_SEVERITY_LABELS[severity] ?? "提示",
    text,
  };
}
