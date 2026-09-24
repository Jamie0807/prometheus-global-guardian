/**
 * 提供分析页面的标签页切换组件。
 */
import type {
  StatisticsResponse,
  PredictionsResponse,
  RiskAssessmentResponse,
  AnalyticsTab,
} from "../types";
import AnalyticsIcon, { type AnalyticsIconName } from "./AnalyticsIcon";

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  statistics: StatisticsResponse | null;
  predictions: PredictionsResponse | null;
  riskAssessment: RiskAssessmentResponse | null;
  onChange: (tab: AnalyticsTab) => void;
}

export default function AnalyticsTabs({
  activeTab,
  statistics,
  predictions,
  riskAssessment,
  onChange,
}: AnalyticsTabsProps) {
  const tabs: Array<{
    id: AnalyticsTab;
    label: string;
    icon: AnalyticsIconName;
    visible: boolean;
  }> = [
    { id: "overview", label: "统计概览", icon: "analysis", visible: statistics !== null },
    { id: "charts", label: "图表可视化", icon: "chart", visible: true },
    { id: "predictions", label: "预测结果", icon: "forecast", visible: predictions !== null },
    { id: "risk", label: "风险评估", icon: "warning", visible: riskAssessment !== null },
    { id: "quality", label: "数据质量", icon: "check", visible: true },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "30px",
        marginBottom: "20px",
        borderBottom: "2px solid var(--analytics-border-soft)",
      }}
    >
      {tabs
        .filter((tab) => tab.visible)
        .map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`analytics-tab${isActive ? " is-active" : ""}`}
              onClick={() => onChange(tab.id)}
              style={{
                padding: "12px 24px",
                background: "transparent",
                border: "none",
                borderBottom: "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                borderRadius: "8px 8px 0 0",
                transition: "all 0.3s ease",
                boxShadow: "none",
              }}
            >
              <AnalyticsIcon name={tab.icon} />
              {tab.label}
            </button>
          );
        })}
    </div>
  );
}
