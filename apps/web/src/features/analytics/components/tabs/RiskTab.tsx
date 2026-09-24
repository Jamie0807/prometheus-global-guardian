/**
 * 提供风险分析标签页内容组件。
 */
import {
  formatAnalyticsNumber,
  formatAnalyticsSignedPercent,
  getRiskLevelLabel,
  getTrendLabel,
} from "../../../../services/analytics/analyticsPresentation";
import type { RiskAssessmentResponse } from "../../types";
import RiskRecommendationLine from "../RiskRecommendationLine";
import AnalyticsIcon from "../AnalyticsIcon";

interface RiskTabProps {
  riskAssessment: RiskAssessmentResponse;
}

export default function RiskTab({ riskAssessment }: RiskTabProps) {
  const temporalRisks = riskAssessment.data.temporalRisks;
  const hasTemporalRisks = temporalRisks !== null;
  return (
    <div
      className="analytics-surface analytics-tab-panel"
      style={{
        padding: "20px",
        borderRadius: "8px",
        marginTop: "20px",
      }}
    >
      <h3 className="analytics-heading" style={{ marginBottom: "20px" }}>
        <AnalyticsIcon name="warning" size={20} />
        风险评估报告
      </h3>

      {/* 总体风险等级 */}
      {riskAssessment.data?.overallRiskScore && (
        <div
          className="analytics-risk-summary analytics-surface--inset"
          style={{
            padding: "25px",
            borderRadius: "12px",
            border: "1px solid var(--analytics-border-soft, #333)",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              color: "var(--analytics-muted, #888)",
              fontSize: "14px",
              marginBottom: "15px",
            }}
          >
            总体风险等级
          </div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "var(--analytics-state-normal, #67e8f9)",
              marginBottom: "10px",
            }}
          >
            风险分数: {formatAnalyticsNumber(riskAssessment.data.overallRiskScore.score, 2)}
          </div>
          <div style={{ fontSize: "18px", color: "#fff" }}>
            等级: {getRiskLevelLabel(riskAssessment.data.overallRiskScore.level)}
          </div>
          <div
            style={{ fontSize: "14px", color: "var(--analytics-muted, #888)", marginTop: "10px" }}
          >
            趋势: {getTrendLabel(hasTemporalRisks ? temporalRisks.trend : "UNKNOWN")}
          </div>
        </div>
      )}

      {/* 分类风险 */}
      {riskAssessment.data?.typeRisks && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            各类型风险分析
          </h4>
          {Object.entries(riskAssessment.data.typeRisks).map(([type, risk]) => (
            <div
              key={type}
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
                marginBottom: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <span style={{ color: "#fff", fontWeight: "bold", fontSize: "16px" }}>{type}</span>
                <div
                  style={{
                    display: "flex",
                    gap: "15px",
                    alignItems: "center",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--analytics-muted, #666)" }}>事件数: </span>
                    <span
                      style={{
                        color: "var(--analytics-state-normal, #67e8f9)",
                        fontWeight: "bold",
                      }}
                    >
                      {risk.count}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: "var(--analytics-muted, #666)" }}>风险分数: </span>
                    <span style={{ color: "#fff", fontWeight: "bold" }}>
                      {formatAnalyticsNumber(risk.riskScore, 2)}
                    </span>
                  </div>
                  {risk.averageMagnitude !== undefined && risk.averageMagnitude !== null && (
                    <div>
                      <span style={{ color: "var(--analytics-muted, #666)" }}>平均震级: </span>
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {formatAnalyticsNumber(risk.averageMagnitude, 2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 地理风险分布 */}
      {riskAssessment.data?.geographicRisks && riskAssessment.data.geographicRisks.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid var(--analytics-border-soft, #333)",
            marginBottom: "20px",
          }}
        >
          <h4 className="analytics-heading analytics-icon-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="map" />
            地理风险分布
          </h4>
          <div
            style={{
              fontSize: "12px",
              color: "var(--analytics-muted, #888)",
              marginBottom: "10px",
            }}
          >
            检测到 {riskAssessment.data.geographicRisks.length} 个风险区域
          </div>
          <div style={{ maxHeight: "200px", overflow: "auto" }}>
            {riskAssessment.data.geographicRisks.slice(0, 10).map((area, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px",
                  borderBottom: "1px solid var(--analytics-border-soft, #333)",
                  fontSize: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ color: "#fff" }}>
                      位置: [{area.location?.lat?.toFixed(4)}, {area.location?.lon?.toFixed(4)}]
                    </div>
                    <div
                      style={{
                        color: "var(--analytics-muted, #666)",
                        fontSize: "11px",
                        marginTop: "3px",
                      }}
                    >
                      灾害数量: {area.hazardCount}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      backgroundColor:
                        area.riskLevel === "HIGH"
                          ? "var(--analytics-state-warning, #fbbf24)"
                          : area.riskLevel === "MODERATE"
                            ? "var(--analytics-chart-2)"
                            : "var(--analytics-state-normal, #67e8f9)",
                      color: "#fff",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    {area.riskLevel}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 时间趋势 */}
      {hasTemporalRisks && (
        <div
          style={{
            backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid var(--analytics-border-soft, #333)",
            marginBottom: "20px",
          }}
        >
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="trend" />
            时间趋势分析
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>最近7天</div>
              <div
                style={{
                  color: "var(--analytics-state-normal, #67e8f9)",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsNumber(temporalRisks.recent7Days, 0)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>前7天</div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsNumber(temporalRisks.previous7Days, 0)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>增长率</div>
              <div
                style={{
                  color: "var(--analytics-state-warning, #fbbf24)",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsSignedPercent(temporalRisks.growthRate)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>趋势</div>
              <div
                style={{
                  color: "var(--analytics-state-normal, #67e8f9)",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {getTrendLabel(temporalRisks.trend)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 建议 */}
      {((riskAssessment.data?.recommendationDetails?.length ?? 0) > 0 ||
        (riskAssessment.data?.recommendations?.length ?? 0) > 0) && (
        <div
          style={{
            backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid var(--analytics-border-soft, #333)",
          }}
        >
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="forecast" />
            规则建议
          </h4>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#fff" }}>
            {(riskAssessment.data.recommendationDetails.length > 0
              ? riskAssessment.data.recommendationDetails
              : riskAssessment.data.recommendations
            ).map((rec, idx) => (
              <RiskRecommendationLine key={idx} recommendation={rec} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
