import React, { useCallback, useEffect, useState } from "react";
import { assessDataQuality, getQualityThresholds } from "../services/analytics/analyticsService";
import {
  formatAnalyticsNumber,
  localizeAnalyticsMessage,
  normalizeQualityReport,
  normalizeQualityScore,
} from "../services/analytics/analyticsPresentation";
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

type QualityReport = NonNullable<ReturnType<typeof normalizeQualityReport>>;

interface DataQualityMonitorProps {
  hazards: Hazard[];
  source?: string;
}

type QualityThresholds = Record<string, number>;

const DataQualityMonitor: React.FC<DataQualityMonitorProps> = ({
  hazards,
  source = "DisasterAWARE",
}) => {
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [thresholds, setThresholds] = useState<QualityThresholds | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThresholds = useCallback(async () => {
    try {
      const result = await getQualityThresholds();
      if (result.success) {
        setThresholds((result.data as QualityThresholds | undefined) ?? null);
      }
    } catch {
      logger.warn("quality_thresholds_load_failed");
    }
  }, []);

  const assessQuality = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await assessDataQuality(hazards, source);
      if (result.success && result.data) {
        setQualityReport(normalizeQualityReport(result.data));
      }
    } catch {
      setError("质量评估暂时不可用，请稍后重试。");
      logger.error("quality_assessment_failed");
    } finally {
      setLoading(false);
    }
  }, [hazards, source]);

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
      pass: { bg: "rgba(76, 175, 80, 0.2)", text: "#66BB6A" },
      warning: { bg: "rgba(255, 193, 7, 0.2)", text: "#FFD54F" },
      fail: { bg: "rgba(239, 83, 80, 0.2)", text: "#EF5350" },
      excellent: { bg: "rgba(33, 150, 243, 0.2)", text: "#64B5F6" },
    };

    const colors = colorMap[status] || { bg: "rgba(158, 158, 158, 0.2)", text: "#9E9E9E" };

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
        }[status.toLowerCase()] ?? "未知"}
      </span>
    );
  };

  const renderDimensionCard = (name: string, score: number, label: string) => {
    const normalizedScore = normalizeQualityScore(score) ?? 0;
    const percentage = (normalizedScore * 100).toFixed(1);
    const thresholdScore = normalizeQualityScore(thresholds?.[name]) ?? 0.9;
    const threshold = (thresholdScore * 100).toFixed(0);
    const isPassing = normalizedScore >= thresholdScore;

    return (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a1a 0%, #252525 100%)",
          padding: "16px",
          borderRadius: "8px",
          border: "1px solid rgba(76, 175, 80, 0.2)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
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
          <h4 style={{ fontSize: "14px", fontWeight: "500", color: "#4CAF50" }}>{label}</h4>
          <span
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color:
                normalizedScore >= 0.95
                  ? "#4CAF50"
                  : normalizedScore >= 0.85
                    ? "#FFA726"
                    : "#EF5350",
            }}
          >
            {percentage}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            background: "#0a0a0a",
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
              background: isPassing
                ? "linear-gradient(90deg, #4CAF50, #66BB6A)"
                : "linear-gradient(90deg, #EF5350, #FF7043)",
              width: `${percentage}%`,
            }}
          ></div>
        </div>
        <p style={{ fontSize: "12px", color: "#888" }}>阈值: {threshold}%</p>
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
            borderTopColor: "#2196F3",
            borderRightColor: "#2196F3",
          }}
        ></div>
        <span style={{ marginLeft: "12px", color: "#4CAF50" }}>正在评估数据质量...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          background: "rgba(239, 83, 80, 0.1)",
          border: "1px solid rgba(239, 83, 80, 0.3)",
          borderRadius: "8px",
          padding: "16px",
        }}
      >
        <p style={{ color: "#EF5350", fontWeight: "500" }}>质量评估失败</p>
        <p style={{ color: "#FF7043", fontSize: "14px", marginTop: "4px" }}>{error}</p>
      </div>
    );
  }

  if (!qualityReport) {
    return (
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "16px",
          textAlign: "center",
        }}
      >
        <p style={{ color: "#888" }}>暂无质量评估数据</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 总体得分 */}
      <div
        style={{
          background: "linear-gradient(135deg, #2196F3 0%, #9C27B0 100%)",
          borderRadius: "12px",
          padding: "24px",
          color: "#fff",
          boxShadow: "0 4px 20px rgba(33, 150, 243, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "4px" }}>
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
        <h4 style={{ fontSize: "18px", fontWeight: "600", color: "#4CAF50", marginBottom: "16px" }}>
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
            background: "rgba(255, 193, 7, 0.1)",
            border: "1px solid rgba(255, 193, 7, 0.3)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#FFC107",
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
                  color: "#FFD54F",
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
            background: "rgba(33, 150, 243, 0.1)",
            border: "1px solid rgba(33, 150, 243, 0.3)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <h4
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#2196F3",
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
                  color: "#64B5F6",
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
