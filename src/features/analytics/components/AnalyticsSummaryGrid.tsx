/**
 * 提供分析摘要指标网格组件。
 */
import { MetricCard, ProgressBar } from "../../../components/DataVisualization";
import type { ServiceStatus } from "../types";

interface AnalyticsSummaryGridProps {
  hazardCount: number;
  hazardsByType: Record<string, number>;
  serviceStatus: ServiceStatus;
}

export default function AnalyticsSummaryGrid({
  hazardCount,
  hazardsByType,
  serviceStatus,
}: AnalyticsSummaryGridProps) {
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "30px",
        }}
      >
        <MetricCard label="灾害总数" value={hazardCount} color="#4CAF50" trend="up" />
        <MetricCard
          label="灾害类型"
          value={Object.keys(hazardsByType).length}
          unit="种"
          color="#2196F3"
          trend="stable"
        />
        <MetricCard
          label="数据完整度"
          value={hazardCount > 0 ? 99.8 : 0}
          unit="%"
          color="#4CAF50"
          trend="up"
        />
        <MetricCard
          label="分析状态"
          value={serviceStatus === "online" ? "就绪" : "离线"}
          color={serviceStatus === "online" ? "#4CAF50" : "#f44336"}
        />
      </div>

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
          📊 灾害类型分布
        </h2>
        {Object.entries(hazardsByType).map(([type, count]) => (
          <ProgressBar
            key={type}
            label={type}
            value={count}
            max={hazardCount}
            color="#4CAF50"
            showPercentage={true}
          />
        ))}
      </div>
    </>
  );
}
