/**
 * 提供数据质量监控展示组件。
 */
import React, { useCallback, useEffect, useState } from "react";
import { assessDataQuality, getQualityThresholds } from "../services/analytics/analyticsService";
import {
  formatAnalyticsNumber,
  localizeAnalyticsMessage,
} from "../services/analytics/analyticsPresentation";
import type { QualityReportData, QualityThresholds } from "../services/analytics/contracts/quality";
import type { Hazard } from "../types";
import { createClientLogger } from "../utils/logger";

const logger = createClientLogger("data-quality-monitor");

// 添加旋转动画样式
const spinKeyframes = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// 注入样式到页面
if (typeof document !== "undefined") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = spinKeyframes;
  document.head.appendChild(styleSheet);
}

interface DataQualityMonitorProps {
  hazards: Hazard[];
  source?: string;
}

const CANONICAL_SOURCE_IDS = new Set(["disasteraware", "usgs", "nasa-eonet", "gdacs"]);

const DataQualityMonitor: React.FC<DataQualityMonitorProps> = ({
  hazards,
  source = "DisasterAWARE",
}) => {
  const [qualityReport, setQualityReport] = useState<QualityReportData | null>(null);
  const [thresholds, setThresholds] = useState<QualityThresholds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonicalSources = hazards.map((hazard) => hazard.sourceId);
  const hasCanonicalSource = canonicalSources.some(
    (sourceId) => typeof sourceId === "string" && sourceId.trim().length > 0,
  );
  const hasOneValidCanonicalSource =
    hasCanonicalSource &&
    canonicalSources.every(
      (sourceId) => typeof sourceId === "string" && CANONICAL_SOURCE_IDS.has(sourceId),
    ) &&
    new Set(canonicalSources).size === 1;
  const qualitySource = hasOneValidCanonicalSource
    ? canonicalSources[0]
    : hasCanonicalSource
      ? "unknown"
      : source;

  const loadThresholds = useCallback(async () => {
    try {
      const result = await getQualityThresholds();
      setThresholds(result.data);
    } catch {
      logger.warn("quality_thresholds_load_failed");
    }
  }, []);

  const assessQuality = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await assessDataQuality(hazards, qualitySource);
      setQualityReport(result.data);
    } catch {
      setQualityReport(null);
      setError("质量评估暂时不可用，请稍后重试。");
      logger.error("quality_assessment_failed");
    } finally {
      setLoading(false);
    }
  }, [hazards, qualitySource]);

  useEffect(() => {
    void loadThresholds();
  }, [loadThresholds]);

  useEffect(() => {
    if (hazards && hazards.length > 0) {
      void assessQuality();
    }
  }, [assessQuality, hazards, source]);

  const getStatusBadge = (status: string): React.ReactElement => {
    const colorMap: { [key: string]: { bg: string; text: string } } = {
      pass: {
        bg: "color-mix(in srgb, var(--analytics-state-normal, #67e8f9) 20%, transparent)",
        text: "var(--analytics-state-normal, #67e8f9)",
      },
      warning: {
        bg: "color-mix(in srgb, var(--analytics-state-warning, #fbbf24) 20%, transparent)",
        text: "var(--analytics-state-warning, #fbbf24)",
      },
      fail: {
        bg: "color-mix(in srgb, var(--analytics-state-danger, #fb7185) 20%, transparent)",
        text: "var(--analytics-state-danger, #fb7185)",
      },
      excellent: {
        bg: "color-mix(in srgb, var(--analytics-state-normal, #67e8f9) 20%, transparent)",
        text: "var(--analytics-state-normal, #67e8f9)",
      },
    };

    const normalizedStatus = status.toLowerCase();
    const colors = colorMap[normalizedStatus] || {
      bg: "rgba(158, 158, 158, 0.2)",
      text: "#9E9E9E",
    };

    return (
      <span
        style={{
          padding: "4px 12px",
          borderRadius: "9999px",
          fontSize: "12px",
          fontWeight: "600",
          background: colors.bg,
          color: colors.text,
        }}
      >
        {{
          pass: "通过",
          warning: "警告",
          fail: "失败",
          excellent: "优秀",
        }[normalizedStatus] ?? "未知"}
      </span>
    );
  };

  const renderDimensionCard = (name: keyof QualityThresholds, score: number, label: string) => {
    const percentage = (score * 100).toFixed(1);
    const thresholdScore = thresholds?.[name] ?? 0.9;
    const threshold = (thresholdScore * 100).toFixed(0);
    const scoreColor =
      score >= 0.95
        ? "var(--analytics-state-normal, #67e8f9)"
        : score >= 0.85
          ? "var(--analytics-state-warning, #fbbf24)"
          : "var(--analytics-state-danger, #fb7185)";

    return (
      <div
        className="analytics-quality-dimension analytics-surface--inset"
        style={{
          padding: "16px",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "8px",
          }}
        >
          <h4 className="analytics-heading" style={{ fontSize: "14px", fontWeight: "500" }}>
            {label}
          </h4>
          <span
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: scoreColor,
            }}
          >
            {percentage}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            background: "var(--analytics-surface-inset, #0a0a0a)",
            borderRadius: "9999px",
            height: "8px",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              height: "8px",
              borderRadius: "9999px",
              transition: "all 0.3s ease",
              background: `linear-gradient(90deg, ${scoreColor}, color-mix(in srgb, ${scoreColor} 72%, white))`,
              width: `${percentage}%`,
            }}
          ></div>
        </div>
        <p style={{ fontSize: "12px", color: "var(--analytics-muted, #888)" }}>
          阈值: {threshold}%
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "32px" }}
      >
        <div
          style={{
            animation: "spin 1s linear infinite",
            borderRadius: "50%",
            height: "32px",
            width: "32px",
            border: "2px solid transparent",
            borderTopColor: "var(--analytics-accent, #67e8f9)",
            borderRightColor: "var(--analytics-accent, #67e8f9)",
          }}
        ></div>
        <span style={{ marginLeft: "12px", color: "var(--analytics-accent, #67e8f9)" }}>
          正在评估数据质量...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "color-mix(in srgb, var(--analytics-state-danger, #fb7185) 10%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--analytics-state-danger, #fb7185) 30%, transparent)",
          borderRadius: "8px",
          padding: "16px",
        }}
      >
        <p style={{ color: "var(--analytics-state-danger, #fb7185)", fontWeight: "500" }}>
          质量评估失败
        </p>
        <p
          style={{
            color: "var(--analytics-state-danger, #fb7185)",
            fontSize: "14px",
            marginTop: "4px",
          }}
        >
          {error}
        </p>
      </div>
    );
  }

  if (!qualityReport) {
    return (
      <div
        className="analytics-surface--inset"
        style={{
          borderRadius: "8px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--analytics-muted, #888)" }}>暂无质量评估数据</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 总体得分 */}
      <div
        className="analytics-quality-overall-score analytics-surface"
        style={{
          borderRadius: "12px",
          padding: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3
              className="analytics-heading"
              style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}
            >
              数据质量综合评分
            </h3>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "14px" }}>
              数据源: {source} | 记录数: {qualityReport.totalRecords}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "48px", fontWeight: "bold" }}>
              {formatAnalyticsNumber(qualityReport.overallScore, 1)}
            </div>
            <div style={{ marginTop: "8px" }}>{getStatusBadge(qualityReport.status)}</div>
          </div>
        </div>
      </div>

      {/* 五维质量评估 */}
      <div>
        <h4
          className="analytics-heading"
          style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}
        >
          五维质量评估
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
          }}
        >
          {renderDimensionCard("completeness", qualityReport.detailChecks.completeness, "完整性")}
          {renderDimensionCard("accuracy", qualityReport.detailChecks.accuracy, "准确性")}
          {renderDimensionCard("consistency", qualityReport.detailChecks.consistency, "一致性")}
          {renderDimensionCard("timeliness", qualityReport.detailChecks.timeliness, "时效性")}
          {renderDimensionCard("validity", qualityReport.detailChecks.validity, "有效性")}
        </div>
      </div>

      {/* 问题列表 */}
      {qualityReport.issues && qualityReport.issues.length > 0 && (
        <div
          style={{
            background:
              "color-mix(in srgb, var(--analytics-state-warning, #fbbf24) 6%, transparent)",
            border: "1px solid var(--analytics-border-soft, rgba(148, 193, 225, 0.13))",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--analytics-state-warning, #fbbf24)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              style={{ width: "20px", height: "20px", marginRight: "8px" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            发现的问题 ({qualityReport.issues.length})
          </h4>
          <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {qualityReport.issues.map((issue, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: "14px",
                  color: "var(--analytics-state-warning, #fbbf24)",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ marginRight: "8px" }}>•</span>
                <span>{localizeAnalyticsMessage(issue)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 改进建议 */}
      {qualityReport.recommendations && qualityReport.recommendations.length > 0 && (
        <div
          style={{
            background: "color-mix(in srgb, var(--analytics-chart-2) 8%, transparent)",
            border: "1px solid var(--analytics-border-soft, rgba(148, 193, 225, 0.13))",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "var(--analytics-accent, #67e8f9)",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <svg
              style={{ width: "20px", height: "20px", marginRight: "8px" }}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            改进建议 ({qualityReport.recommendations.length})
          </h4>
          <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {qualityReport.recommendations.map((rec, idx) => (
              <li
                key={idx}
                style={{
                  fontSize: "14px",
                  color: "var(--analytics-chart-2)",
                  display: "flex",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ marginRight: "8px" }}>→</span>
                <span>{localizeAnalyticsMessage(rec)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DataQualityMonitor;
