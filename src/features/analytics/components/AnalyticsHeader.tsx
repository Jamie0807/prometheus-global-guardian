/**
 * 提供分析页面头部组件。
 */
import type { ServiceStatus } from "../types";
import AnalyticsIcon from "./AnalyticsIcon";

interface AnalyticsHeaderProps {
  serviceStatus: ServiceStatus;
  onClose: () => void;
}

export default function AnalyticsHeader({ serviceStatus, onClose }: AnalyticsHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "30px",
      }}
    >
      <h1
        className="analytics-heading"
        style={{ display: "flex", alignItems: "center", gap: "10px" }}
      >
        <AnalyticsIcon name="analysis" size={28} />
        数据分析
        <span
          style={{
            fontSize: "14px",
            padding: "4px 12px",
            borderRadius: "12px",
            backgroundColor:
              serviceStatus === "online"
                ? "color-mix(in srgb, var(--analytics-state-normal) 14%, transparent)"
                : serviceStatus === "checking"
                  ? "color-mix(in srgb, var(--analytics-state-warning) 14%, transparent)"
                  : "color-mix(in srgb, var(--analytics-state-danger) 14%, transparent)",
            border: `1px solid color-mix(in srgb, ${serviceStatus === "online" ? "var(--analytics-state-normal)" : serviceStatus === "checking" ? "var(--analytics-state-warning)" : "var(--analytics-state-danger)"} 32%, transparent)`,
            color:
              serviceStatus === "online"
                ? "var(--analytics-state-normal)"
                : serviceStatus === "checking"
                  ? "var(--analytics-state-warning)"
                  : "var(--analytics-state-danger)",
          }}
        >
          {serviceStatus === "checking"
            ? "检测中..."
            : serviceStatus === "online"
              ? "就绪"
              : "离线"}
        </span>
      </h1>
      <button
        onClick={onClose}
        className="analytics-action"
        style={{
          padding: "12px 24px",
          border: "1px solid var(--analytics-border-soft)",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "500",
          boxShadow: "none",
          transition: "all 0.3s ease",
        }}
      >
        <AnalyticsIcon name="close" size={18} />
        关闭
      </button>
    </div>
  );
}
