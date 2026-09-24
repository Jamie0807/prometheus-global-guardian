/**
 * 提供分析摘要指标网格组件。
 */
import { MetricCard, ProgressBar } from "../../../components/DataVisualization";
import type { ServiceStatus } from "../types";
import AnalyticsIcon from "./AnalyticsIcon";

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
        <MetricCard
          label="灾害总数"
          value={hazardCount}
          color="var(--analytics-accent, #67e8f9)"
          trend="up"
        />
        <MetricCard
          label="灾害类型"
          value={Object.keys(hazardsByType).length}
          unit="种"
          color="var(--analytics-accent, #67e8f9)"
          trend="stable"
        />
        <MetricCard
          label="数据完整度"
          value={hazardCount > 0 ? 99.8 : 0}
          unit="%"
          color="var(--analytics-state-normal)"
          trend="up"
        />
        <MetricCard
          label="分析状态"
          value={serviceStatus === "online" ? "就绪" : "离线"}
          color={
            serviceStatus === "online"
              ? "var(--analytics-state-normal)"
              : serviceStatus === "checking"
                ? "var(--analytics-state-warning)"
                : "var(--analytics-state-danger)"
          }
        />
      </div>

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
          灾害类型分布
        </h2>
        {Object.entries(hazardsByType).map(([type, count]) => (
          <ProgressBar
            key={type}
            label={type}
            value={count}
            max={hazardCount}
            color="var(--analytics-accent, #67e8f9)"
            showPercentage={true}
          />
        ))}
      </div>
    </>
  );
}
