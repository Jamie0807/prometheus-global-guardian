import {
  formatAnalyticsNumber,
  formatAnalyticsSignedPercent,
  getRiskLevelLabel,
  getTrendLabel,
} from "../../../../services/analytics/analyticsPresentation";
import type { AnalyticsRecord, GeographicRisk, TypeRisk } from "../../types";
import RiskRecommendationLine from "../RiskRecommendationLine";

interface RiskTabProps {
  riskAssessment: AnalyticsRecord;
}

export default function RiskTab({ riskAssessment }: RiskTabProps) {
  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        padding: "20px",
        borderRadius: "8px",
        marginTop: "20px",
      }}
    >
      <h3 style={{ color: "#4CAF50", marginBottom: "20px" }}>⚠️ 风险评估报告</h3>

      {/* 总体风险等级 */}
      {riskAssessment.data?.overallRiskScore && (
        <div
          style={{
            backgroundColor: "#1a1a1a",
            padding: "25px",
            borderRadius: "12px",
            border: "2px solid #ff9800",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          <div style={{ color: "#888", fontSize: "14px", marginBottom: "15px" }}>总体风险等级</div>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "bold",
              color: "#4CAF50",
              marginBottom: "10px",
            }}
          >
            风险分数: {formatAnalyticsNumber(riskAssessment.data.overallRiskScore.score, 2)}
          </div>
          <div style={{ fontSize: "18px", color: "#fff" }}>
            等级: {getRiskLevelLabel(riskAssessment.data.overallRiskScore.level)}
          </div>
          <div style={{ fontSize: "14px", color: "#888", marginTop: "10px" }}>
            趋势: {getTrendLabel(riskAssessment.data.overallRiskScore.trend)}
          </div>
        </div>
      )}

      {/* 分类风险 */}
      {riskAssessment.data?.typeRisks && (
        <div style={{ marginBottom: "30px" }}>
          <h4 style={{ color: "#fff", marginBottom: "15px" }}>各类型风险分析</h4>
          {Object.entries(riskAssessment.data.typeRisks).map(([type, risk]: [string, TypeRisk]) => (
            <div
              key={type}
              style={{
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #333",
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
                    <span style={{ color: "#666" }}>事件数: </span>
                    <span style={{ color: "#4CAF50", fontWeight: "bold" }}>{risk.count}</span>
                  </div>
                  <div>
                    <span style={{ color: "#666" }}>风险分数: </span>
                    <span style={{ color: "#fff", fontWeight: "bold" }}>
                      {formatAnalyticsNumber(risk.riskScore, 2)}
                    </span>
                  </div>
                  {risk.averageMagnitude !== undefined && risk.averageMagnitude !== null && (
                    <div>
                      <span style={{ color: "#666" }}>平均震级: </span>
                      <span style={{ color: "#fff", fontWeight: "bold" }}>
                        {formatAnalyticsNumber(risk.averageMagnitude, 2)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span style={{ color: "#666" }}>权重: </span>
                    <span style={{ color: "#888" }}>{risk.weight}</span>
                  </div>
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
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #f44336",
            marginBottom: "20px",
          }}
        >
          <h4 style={{ color: "#f44336", marginBottom: "15px" }}>🗺️ 地理风险分布</h4>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "10px" }}>
            检测到 {riskAssessment.data.geographicRisks.length} 个风险区域
          </div>
          <div style={{ maxHeight: "200px", overflow: "auto" }}>
            {riskAssessment.data.geographicRisks
              .slice(0, 10)
              .map((area: GeographicRisk, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px",
                    borderBottom: "1px solid #333",
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
                      <div style={{ color: "#666", fontSize: "11px", marginTop: "3px" }}>
                        灾害数量: {area.hazardCount}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          area.riskLevel === "HIGH"
                            ? "#f44336"
                            : area.riskLevel === "MODERATE"
                              ? "#ff9800"
                              : "#4CAF50",
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
      {riskAssessment.data?.temporalRisks && (
        <div
          style={{
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #333",
            marginBottom: "20px",
          }}
        >
          <h4 style={{ color: "#fff", marginBottom: "15px" }}>📊 时间趋势分析</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
            }}
          >
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>最近7天</div>
              <div
                style={{
                  color: "#4CAF50",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {riskAssessment.data.temporalRisks.recent7Days}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>前7天</div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {riskAssessment.data.temporalRisks.previous7Days}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>增长率</div>
              <div
                style={{
                  color: "#ff9800",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsSignedPercent(riskAssessment.data.temporalRisks.growthRate)}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>趋势</div>
              <div
                style={{
                  color: "#4CAF50",
                  fontSize: "20px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {getTrendLabel(riskAssessment.data.temporalRisks.trend)}
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
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #4CAF50",
          }}
        >
          <h4 style={{ color: "#4CAF50", marginBottom: "15px" }}>💡 规则建议</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#fff" }}>
            {(
              riskAssessment.data.recommendationDetails ??
              riskAssessment.data.recommendations ??
              []
            ).map((rec, idx) => (
              <RiskRecommendationLine key={idx} recommendation={rec} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
