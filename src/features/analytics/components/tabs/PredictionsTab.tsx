import {
  formatAnalyticsNumber,
  formatAnalyticsPercent,
  formatRiskRecommendation,
  getPredictionDisplay,
  getRiskLevelLabel,
} from "../../../../services/analytics/analyticsPresentation";
import type { PredictionModelResult, PredictionsResponse } from "../../types";
import PredictionStatusBadge from "../PredictionStatusBadge";

interface PredictionsTabProps {
  predictions: PredictionsResponse;
}

function next7Days(prediction: PredictionModelResult): number[] | undefined {
  return prediction.status === "ready" ? prediction.predictions.next7Days : undefined;
}

export default function PredictionsTab({ predictions }: PredictionsTabProps) {
  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        padding: "20px",
        borderRadius: "8px",
        marginTop: "20px",
      }}
    >
      <h3 style={{ color: "#4CAF50", marginBottom: "20px" }}>🔮 预测模型结果</h3>

      {/* 总体风险评估 */}
      {predictions.data.overallRiskAssessment.status === "failed" && (
        <p role="status">模型不可用</p>
      )}
      {predictions.data?.overallRiskAssessment && (
        <div
          style={{
            backgroundColor: "#1a1a1a",
            padding: "25px",
            borderRadius: "12px",
            border: "2px solid #4CAF50",
            marginBottom: "30px",
          }}
        >
          <h4 style={{ color: "#4CAF50", marginBottom: "15px" }}>📊 总体风险评估</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "20px",
            }}
          >
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>风险分数</div>
              <div
                style={{
                  color: "#4CAF50",
                  fontSize: "32px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {formatAnalyticsNumber(predictions.data.overallRiskAssessment.overallRiskScore, 1)}
              </div>
            </div>
            <div>
              <div style={{ color: "#888", fontSize: "12px" }}>风险等级</div>
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
              <div style={{ color: "#888", fontSize: "12px" }}>平均准确率</div>
              <div
                style={{
                  color: "#4CAF50",
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
                backgroundColor: "#0a0a0a",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
            >
              <div style={{ color: "#4CAF50", fontSize: "12px", marginBottom: "5px" }}>💡 建议</div>
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
        <h4 style={{ color: "#fff", marginBottom: "15px" }}>📈 多灾害类型7天趋势预测</h4>

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
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #4CAF50",
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
                <span style={{ color: "#4CAF50", fontWeight: "bold", fontSize: "16px" }}>
                  🌍 地震预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.earthquakePrediction} />
              </div>

              {/* 7天预测数据 */}
              {next7Days(predictions.data.earthquakePrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ color: "#888", fontSize: "11px", marginBottom: "8px" }}>
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
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <span style={{ color: "#888", fontSize: "11px" }}>第 {idx + 1} 天</span>
                        <span style={{ color: "#4CAF50", fontSize: "11px", fontWeight: "bold" }}>
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
                  {getPredictionDisplay(predictions.data.earthquakePrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 火山预测 */}
          {predictions.data?.volcanoPrediction && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #FF9800",
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
                <span style={{ color: "#FF9800", fontWeight: "bold", fontSize: "16px" }}>
                  🌋 火山预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.volcanoPrediction} />
              </div>
              {next7Days(predictions.data.volcanoPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ color: "#888", fontSize: "11px", marginBottom: "8px" }}>
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
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <span style={{ color: "#888", fontSize: "11px" }}>第 {idx + 1} 天</span>
                        <span style={{ color: "#FF9800", fontSize: "11px", fontWeight: "bold" }}>
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
                  {getPredictionDisplay(predictions.data.volcanoPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 风暴预测 */}
          {predictions.data?.stormPrediction && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #2196F3",
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
                <span style={{ color: "#2196F3", fontWeight: "bold", fontSize: "16px" }}>
                  ⛈️ 风暴预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.stormPrediction} />
              </div>
              {next7Days(predictions.data.stormPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ color: "#888", fontSize: "11px", marginBottom: "8px" }}>
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
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <span style={{ color: "#888", fontSize: "11px" }}>第 {idx + 1} 天</span>
                        <span style={{ color: "#2196F3", fontSize: "11px", fontWeight: "bold" }}>
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
                  {getPredictionDisplay(predictions.data.stormPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 洪水预测 */}
          {predictions.data?.floodPrediction && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #00BCD4",
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
                <span style={{ color: "#00BCD4", fontWeight: "bold", fontSize: "16px" }}>
                  🌊 洪水预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.floodPrediction} />
              </div>
              {next7Days(predictions.data.floodPrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ color: "#888", fontSize: "11px", marginBottom: "8px" }}>
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
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <span style={{ color: "#888", fontSize: "11px" }}>第 {idx + 1} 天</span>
                        <span style={{ color: "#00BCD4", fontSize: "11px", fontWeight: "bold" }}>
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
                  {getPredictionDisplay(predictions.data.floodPrediction).detail}
                </div>
              )}
            </div>
          )}

          {/* 野火预测 */}
          {predictions.data?.wildfirePrediction && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                padding: "15px",
                borderRadius: "8px",
                border: "1px solid #FF5722",
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
                <span style={{ color: "#FF5722", fontWeight: "bold", fontSize: "16px" }}>
                  🔥 野火预测
                </span>
                <PredictionStatusBadge prediction={predictions.data.wildfirePrediction} />
              </div>
              {next7Days(predictions.data.wildfirePrediction) ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ color: "#888", fontSize: "11px", marginBottom: "8px" }}>
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
                          borderBottom: "1px solid #333",
                        }}
                      >
                        <span style={{ color: "#888", fontSize: "11px" }}>第 {idx + 1} 天</span>
                        <span style={{ color: "#FF5722", fontSize: "11px", fontWeight: "bold" }}>
                          {count.toFixed(1)} 次
                        </span>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div style={{ color: "#888", fontSize: "12px", marginTop: "5px" }}>
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
            backgroundColor: "#1a1a1a",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #333",
          }}
        >
          <h4 style={{ color: "#fff", marginBottom: "15px" }}>⚖️ 模型权重分配</h4>
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
                  <div style={{ color: "#888", fontSize: "12px" }}>{type}</div>
                  <div
                    style={{
                      color: "#4CAF50",
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
