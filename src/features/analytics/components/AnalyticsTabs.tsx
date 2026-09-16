/**
 * 提供分析页面的标签页切换组件。
 */
import type {
  StatisticsResponse,
  PredictionsResponse,
  RiskAssessmentResponse,
  AnalyticsTab,
} from "../types";

interface AnalyticsTabsProps {
  activeTab: AnalyticsTab;
  statistics: StatisticsResponse | null;
  predictions: PredictionsResponse | null;
  riskAssessment: RiskAssessmentResponse | null;
  onChange: (tab: AnalyticsTab) => void;
}

const TAB_STYLES: Record<AnalyticsTab, { color: string }> = {
  overview: { color: "#4CAF50" },
  charts: { color: "#FF9800" },
  predictions: { color: "#4CAF50" },
  risk: { color: "#4CAF50" },
  quality: { color: "#2196F3" },
};

export default function AnalyticsTabs({
  activeTab,
  statistics,
  predictions,
  riskAssessment,
  onChange,
}: AnalyticsTabsProps) {
  const tabs: Array<{ id: AnalyticsTab; label: string; visible: boolean }> = [
    { id: "overview", label: "📊 统计概览", visible: statistics !== null },
    { id: "charts", label: "📈 图表可视化", visible: true },
    { id: "predictions", label: "🔮 预测结果", visible: predictions !== null },
    { id: "risk", label: "⚠️ 风险评估", visible: riskAssessment !== null },
    { id: "quality", label: "✓ 数据质量", visible: true },
  ];

  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "30px",
        marginBottom: "20px",
        borderBottom: "2px solid rgba(51, 51, 51, 0.5)",
      }}
    >
      {tabs
        .filter((tab) => tab.visible)
        .map((tab) => {
          const color = TAB_STYLES[tab.id].color;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              style={{
                padding: "12px 24px",
                background: isActive
                  ? "linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)"
                  : "transparent",
                color: isActive ? color : "#888",
                border: "none",
                borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "bold",
                borderRadius: "8px 8px 0 0",
                transition: "all 0.3s ease",
                boxShadow: isActive ? `0 -4px 12px ${color}33` : "none",
              }}
            >
              {tab.label}
            </button>
          );
        })}
    </div>
  );
}
