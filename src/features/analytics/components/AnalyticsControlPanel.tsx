/**
 * 提供分析页面的控制面板组件。
 */
import { type ReactNode } from "react";
import { AlertBox, LoadingSpinner } from "../../../components/DataVisualization";
import type {
  StatisticsResponse,
  PredictionsResponse,
  RiskAssessmentResponse,
  ServiceStatus,
} from "../types";

interface AnalyticsControlPanelProps {
  serviceStatus: ServiceStatus;
  loading: boolean;
  statistics: StatisticsResponse | null;
  predictions: PredictionsResponse | null;
  riskAssessment: RiskAssessmentResponse | null;
  onCheckService: () => Promise<void>;
  onRunAnalysis: () => Promise<void>;
  children: ReactNode;
}

export default function AnalyticsControlPanel({
  serviceStatus,
  loading,
  statistics,
  predictions,
  riskAssessment,
  onCheckService,
  onRunAnalysis,
  children,
}: AnalyticsControlPanelProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)",
        padding: "30px",
        borderRadius: "16px",
        marginBottom: "30px",
        border: "1px solid rgba(76, 175, 80, 0.2)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <h2
        style={{
          color: "#4CAF50",
          marginBottom: "24px",
          textShadow: "0 0 10px rgba(76, 175, 80, 0.3)",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        🔬 Python分析功能
      </h2>

      {serviceStatus === "offline" ? (
        <div style={{ marginBottom: "20px" }}>
          <AlertBox
            type="error"
            title="Python服务离线"
            message="无法连接到分析服务。请确保Python服务运行在 http://localhost:8001"
          />
          <button
            onClick={() => void onCheckService()}
            style={{
              marginTop: "10px",
              background: "linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)",
              color: "#4CAF50",
              padding: "12px 24px",
              border: "1px solid #4CAF50",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "translateY(-2px)";
              event.currentTarget.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.3)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.2)";
            }}
          >
            🔄 重试连接
          </button>
        </div>
      ) : null}

      {serviceStatus === "online" && loading ? (
        <div style={{ marginBottom: "20px" }}>
          <AlertBox
            type="info"
            title="正在分析"
            message="正在运行综合分析，包括统计分析、预测模型和风险评估..."
          />
        </div>
      ) : null}

      {(statistics || predictions || riskAssessment) && !loading ? (
        <div
          style={{
            marginBottom: "20px",
            padding: "16px",
            background: "linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%)",
            borderRadius: "12px",
            border: "1px solid #4CAF50",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 4px 16px rgba(76, 175, 80, 0.15)",
          }}
        >
          <div>
            <div
              style={{
                color: "#4CAF50",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              ✅ 分析完成
            </div>
            <div style={{ color: "#888", fontSize: "12px" }}>
              已生成统计分析、预测模型和风险评估报告
            </div>
          </div>
          <button
            onClick={() => void onRunAnalysis()}
            style={{
              background: "linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)",
              color: "#4CAF50",
              padding: "12px 24px",
              border: "1px solid #4CAF50",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              whiteSpace: "nowrap",
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.2)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.transform = "translateY(-2px)";
              event.currentTarget.style.boxShadow = "0 6px 20px rgba(76, 175, 80, 0.3)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = "translateY(0)";
              event.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.2)";
            }}
          >
            🔄 重新分析
          </button>
        </div>
      ) : null}

      {loading ? <LoadingSpinner message="正在分析数据，请稍候..." /> : null}
      {children}
    </div>
  );
}
