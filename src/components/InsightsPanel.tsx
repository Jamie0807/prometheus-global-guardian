import React, { useCallback, useState, useEffect } from "react";
import { getRiskAssessment } from "../services/analytics/analyticsService";
import type { RiskAssessmentData } from "../services/analytics/contracts/risk";
import {
  formatAnalyticsNumber,
  getRiskLevelLabel,
} from "../services/analytics/analyticsPresentation";
import type { Hazard } from "../types";
import { createClientLogger } from "../utils/logger";

const logger = createClientLogger("insights-panel");

type InsightsHazard = Hazard & {
  properties?: {
    type?: string;
    severity?: string;
    timestamp?: string;
  };
};

const InsightsPanel: React.FC<{ hazards: InsightsHazard[] }> = ({ hazards }) => {
  const [riskData, setRiskData] = useState<RiskAssessmentData | null>(null);
  const [loading, setLoading] = useState(false);
  const recentHazards = hazards.slice(0, 3);

  const loadRiskAssessment = useCallback(async () => {
    if (hazards.length === 0) return;

    setLoading(true);
    try {
      const result = await getRiskAssessment(hazards.slice(0, 50));
      if (result.success) {
        setRiskData(result.data);
      }
    } catch {
      logger.error("risk_assessment_load_failed");
    } finally {
      setLoading(false);
    }
  }, [hazards]);

  useEffect(() => {
    if (hazards.length > 0) {
      void loadRiskAssessment();
    }
  }, [hazards.length, loadRiskAssessment]);

  return (
    <div style={{ backgroundColor: "#1a1a1a", padding: "20px", borderRadius: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ color: "#4CAF50", margin: 0 }}>最新灾害</h3>
        {loading && <span style={{ color: "#888", fontSize: "12px" }}>分析中...</span>}
      </div>

      {recentHazards.length > 0 ? (
        recentHazards.map((h, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "#2a2a2a",
              padding: "12px",
              borderRadius: "6px",
              marginBottom: "8px",
            }}
          >
            <div style={{ color: "#fff", fontWeight: "bold" }}>
              {h.properties?.type || "未知类型"}
            </div>
            <div style={{ color: "#888", fontSize: "14px", marginTop: "4px" }}>
              {h.properties?.severity || "N/A"} | {h.properties?.timestamp || "时间未知"}
            </div>
          </div>
        ))
      ) : (
        <p style={{ color: "#888" }}>暂无数据</p>
      )}

      {riskData && (
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #333" }}>
          <h4 style={{ color: "#4CAF50", fontSize: "14px", marginBottom: "12px" }}>
            🐍 Python 风险评估
          </h4>

          {riskData.overallRiskScore && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            >
              <div style={{ color: "#888", fontSize: "12px" }}>综合风险等级</div>
              <div
                style={{
                  color: ["HIGH", "CRITICAL"].includes(
                    riskData.overallRiskScore.level.toUpperCase(),
                  )
                    ? "#f44336"
                    : riskData.overallRiskScore.level.toUpperCase() === "MODERATE"
                      ? "#ff9800"
                      : "#4CAF50",
                  fontSize: "18px",
                  fontWeight: "bold",
                  marginTop: "4px",
                }}
              >
                {getRiskLevelLabel(riskData.overallRiskScore.level)}
              </div>
            </div>
          )}

          {riskData.overallRiskScore && (
            <div
              style={{
                padding: "12px",
                backgroundColor: "#2a2a2a",
                borderRadius: "6px",
              }}
            >
              <div style={{ color: "#888", fontSize: "12px" }}>风险评分</div>
              <div
                style={{ color: "#fff", fontSize: "18px", fontWeight: "bold", marginTop: "4px" }}
              >
                {formatAnalyticsNumber(riskData.overallRiskScore.score, 1)} / 100
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InsightsPanel;
