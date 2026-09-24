/**
 * 提供预测分析标签页内容组件。
 */
import {
  formatAnalyticsNumber,
  formatAnalyticsPercent,
  formatRiskRecommendation,
  getPredictionDisplay,
  getRiskLevelLabel,
} from "../../../../services/analytics/analyticsPresentation";
import type { PredictionModelResult, PredictionsResponse } from "../../types";
import PredictionStatusBadge from "../PredictionStatusBadge";
import AnalyticsIcon from "../AnalyticsIcon";

interface PredictionsTabProps {
  predictions: PredictionsResponse;
}

function next7Days(prediction: PredictionModelResult): number[] | undefined {
  return prediction.status === "ready" ? prediction.predictions.next7Days : undefined;
}

export default function PredictionsTab({ predictions }: PredictionsTabProps) {
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
        <AnalyticsIcon name="forecast" size={20} />
        预测模型结果
      </h3>

      {/* 总体风险评估 */}
      {predictions.data.overallRiskAssessment.status === "failed" && (
        <p role="status">模型不可用</p>
      )}
      {predictions.data?.overallRiskAssessment && (
        <div
          className="analytics-prediction-summary analytics-surface"
          style={{
            padding: "25px",
            borderRadius: "12px",
            marginBottom: "30px",
          }}
        >
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            总体风险评估
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                风险分数
              </div>
              <div
                style={{
                  color: "var(--analytics-state-normal, #67e8f9)",
                  fontSize: "32px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsNumber(predictions.data.overallRiskAssessment.overallRiskScore, 1)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                风险等级
              </div>
              <div
                style={{
                  color: "#fff",
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {getRiskLevelLabel(predictions.data.overallRiskAssessment.riskLevel)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                平均准确率
              </div>
              <div
                style={{
                  color: "var(--analytics-state-normal, #67e8f9)",
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsPercent(predictions.data.overallRiskAssessment.averageAccuracy)}
              </div>
            </div>
          </div>
          {predictions.data.overallRiskAssessment.recommendation && (
            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  color: "var(--analytics-state-normal, #67e8f9)",
                  fontSize: "12px",
                  marginBottom: "5px",
                }}
              >
                <AnalyticsIcon name="idea" size={14} /> 建议
              </div>
              <div style={{ color: "#fff", fontSize: "14px" }}>
                {
                  formatRiskRecommendation({
                    message: predictions.data.overallRiskAssessment.recommendation,
                  }).text
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* 多灾害类型7天趋势预测 */}
      <div style={{ marginBottom: "30px" }}>
        <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
          <AnalyticsIcon name="trend" />
          多灾害类型7天趋势预测
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "15px",
          }}
        >
          {predictions.data?.earthquakePrediction && (
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="analytics-icon-heading"
                  style={{
                    color: "var(--analytics-state-normal, #67e8f9)",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  <AnalyticsIcon name="earthquake" size={18} />
                  地震预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.earthquakePrediction} />
              </div>

              {/* 7天预测数据 */}
              {next7Days(predictions.data.earthquakePrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      color: "var(--analytics-muted, #888)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}
                  >
                    未来 7 天预测：
                  </div>
                  {next7Days(predictions.data.earthquakePrediction)?.map(
                    (count: number, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--analytics-border-soft, #333)",
                        }}
                      >
                        <span style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
                          第 {idx + 1} 天
                        </span>
                        <span
                          style={{
                            color: "var(--analytics-state-normal, #67e8f9)",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {getPredictionDisplay(predictions.data.earthquakePrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 火山预测 */}
          {predictions.data?.volcanoPrediction && (
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="analytics-icon-heading"
                  style={{
                    color: "var(--analytics-chart-4)",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  <AnalyticsIcon name="volcano" size={18} />
                  火山预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.volcanoPrediction} />
              </div>
              {next7Days(predictions.data.volcanoPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      color: "var(--analytics-muted, #888)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}
                  >
                    未来 7 天预测：
                  </div>
                  {next7Days(predictions.data.volcanoPrediction)?.map(
                    (count: number, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--analytics-border-soft, #333)",
                        }}
                      >
                        <span style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
                          第 {idx + 1} 天
                        </span>
                        <span
                          style={{
                            color: "var(--analytics-chart-4)",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {getPredictionDisplay(predictions.data.volcanoPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 风暴预测 */}
          {predictions.data?.stormPrediction && (
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="analytics-icon-heading"
                  style={{
                    color: "var(--analytics-chart-3)",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  <AnalyticsIcon name="storm" size={18} />
                  风暴预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.stormPrediction} />
              </div>
              {next7Days(predictions.data.stormPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      color: "var(--analytics-muted, #888)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}
                  >
                    未来 7 天预测：
                  </div>
                  {next7Days(predictions.data.stormPrediction)?.map(
                    (count: number, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--analytics-border-soft, #333)",
                        }}
                      >
                        <span style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
                          第 {idx + 1} 天
                        </span>
                        <span
                          style={{
                            color: "var(--analytics-chart-3)",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {getPredictionDisplay(predictions.data.stormPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 洪水预测 */}
          {predictions.data?.floodPrediction && (
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="analytics-icon-heading"
                  style={{
                    color: "var(--analytics-chart-1)",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  <AnalyticsIcon name="flood" size={18} />
                  洪水预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.floodPrediction} />
              </div>
              {next7Days(predictions.data.floodPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      color: "var(--analytics-muted, #888)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}
                  >
                    未来 7 天预测：
                  </div>
                  {next7Days(predictions.data.floodPrediction)?.map(
                    (count: number, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--analytics-border-soft, #333)",
                        }}
                      >
                        <span style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
                          第 {idx + 1} 天
                        </span>
                        <span
                          style={{
                            color: "var(--analytics-chart-1)",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {getPredictionDisplay(predictions.data.floodPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 野火预测 */}
          {predictions.data?.wildfirePrediction && (
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  className="analytics-icon-heading"
                  style={{
                    color: "var(--analytics-chart-4)",
                    fontWeight: "bold",
                    fontSize: "16px",
                  }}
                >
                  <AnalyticsIcon name="wildfire" size={18} />
                  野火预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.wildfirePrediction} />
              </div>
              {next7Days(predictions.data.wildfirePrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div
                    style={{
                      color: "var(--analytics-muted, #888)",
                      fontSize: "11px",
                      marginBottom: "8px",
                    }}
                  >
                    未来 7 天预测：
                  </div>
                  {next7Days(predictions.data.wildfirePrediction)?.map(
                    (count: number, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "4px 0",
                          borderBottom: "1px solid var(--analytics-border-soft, #333)",
                        }}
                      >
                        <span style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
                          第 {idx + 1} 天
                        </span>
                        <span
                          style={{
                            color: "var(--analytics-chart-4)",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginTop: "5px",
                  }}
                >
                  {getPredictionDisplay(predictions.data.wildfirePrediction).detail}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 模型权重 */}
      {predictions.data?.overallRiskAssessment?.modelWeights && (
        <div
          style={{
            backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid var(--analytics-border-soft, #333)",
          }}
        >
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            模型权重分配
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
            }}
          >
            {Object.entries(predictions.data.overallRiskAssessment.modelWeights).map(
              ([type, weight]: [string, number]) => (
                <div key={type} style={{ textAlign: "center" }}>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    {type}
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-state-normal, #67e8f9)",
                      fontSize: "24px",
                      fontWeight: "bold",
                      marginTop: "5px",
                    }}
                  >
                    {(weight * 100).toFixed(0)}%
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
