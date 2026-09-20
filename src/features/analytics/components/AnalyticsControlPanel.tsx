/**
 * 提供分析页面的控制面板组件。
 */
import { type ReactNode } from "react";
import { AlertBox, LoadingSpinner } from "../../../components/DataVisualization";
import AnalyticsIcon from "./AnalyticsIcon";
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
      className="analytics-surface"
      style={{
        padding: "30px",
        borderRadius: "16px",
        marginBottom: "30px",
      }}
    >
      <h2
        className="analytics-heading"
        style={{
          marginBottom: "24px",
          fontSize: "20px",
          fontWeight: "bold",
        }}
      >
        <AnalyticsIcon name="analysis" size={20} />
        Python分析功能
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
            className="analytics-action"
            style={{
              marginTop: "10px",
              padding: "12px 24px",
              border: "1px solid var(--analytics-border)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              boxShadow: "none",
              transition: "all 0.3s ease",
            }}
          >
            <AnalyticsIcon name="refresh" />
            重试连接
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
          className="analytics-surface--inset"
          style={{
            marginBottom: "20px",
            padding: "16px",
            borderRadius: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                color: "var(--analytics-state-normal)",
                fontSize: "14px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <AnalyticsIcon name="check" size={16} />
                分析完成
              </span>
            </div>
            <div style={{ color: "#888", fontSize: "12px" }}>
              已生成统计分析、预测模型和风险评估报告
            </div>
          </div>
          <button
            onClick={() => void onRunAnalysis()}
            className="analytics-action"
            style={{
              padding: "12px 24px",
              border: "1px solid var(--analytics-border)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              whiteSpace: "nowrap",
              boxShadow: "none",
              transition: "all 0.3s ease",
            }}
          >
            <AnalyticsIcon name="refresh" />
            重新分析
          </button>
        </div>
      ) : null}

      {loading ? <LoadingSpinner message="正在分析数据，请稍候..." /> : null}
      {children}
    </div>
  );
}
