/**
 * 提供图表数据钻取弹窗组件。
 */
import React from "react";
import ReactDOM from "react-dom";
import type { Hazard } from "../types";

interface ChartDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  filteredHazards: Hazard[];
  drilldownType: "type" | "severity" | "source" | "date";
  drilldownValue: string;
}

const ChartDrilldownModal: React.FC<ChartDrilldownModalProps> = ({
  isOpen,
  onClose,
  title,
  filteredHazards,
  drilldownValue,
}) => {
  if (!isOpen) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "未知";
      return date.toLocaleString("zh-CN");
    } catch {
      return "未知";
    }
  };

  const formatLocation = (hazard: Hazard) => {
    if (hazard.geometry?.coordinates) {
      const [lng, lat] = hazard.geometry.coordinates;
      return `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    }
    return "未知";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "extreme":
        return "var(--drilldown-danger)";
      case "severe":
        return "var(--drilldown-danger)";
      case "moderate":
        return "var(--drilldown-warning)";
      case "minor":
        return "var(--drilldown-accent)";
      default:
        return "var(--drilldown-muted)";
    }
  };

  const modalContent = (
    <div
      className="chart-drilldown-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(1, 8, 20, 0.82)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "20px",
        overflow: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="chart-drilldown-panel"
        style={{
          backgroundColor: "var(--drilldown-surface)",
          borderRadius: "12px",
          maxWidth: "900px",
          width: "100%",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
          position: "relative",
          zIndex: 1000000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "24px",
            borderBottom: "1px solid var(--drilldown-border-soft)",
          }}
        >
          <div>
            <h3 className="chart-drilldown-title">{title}</h3>
            <p className="chart-drilldown-subtitle">
              {filteredHazards.length} {filteredHazards.length === 1 ? "条灾害" : "条灾害"}
            </p>
          </div>
          <button
            className="chart-drilldown-close"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--drilldown-muted)",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "6px",
              transition: "all 0.2s",
            }}
            onClick={onClose}
            aria-label="关闭灾害详情"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div
          style={{
            padding: "16px 24px",
            backgroundColor: "var(--drilldown-inset)",
            borderBottom: "1px solid var(--drilldown-border-soft)",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <span className="chart-drilldown-muted">筛选条件:</span>
          <span className="chart-drilldown-filter-value">{drilldownValue.replace(/_/g, " ")}</span>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "16px 24px",
          }}
        >
          {filteredHazards.length === 0 ? (
            <div className="chart-drilldown-empty">
              <p>未找到匹配的灾害数据</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredHazards.map((hazard, index) => (
                <div
                  key={`${hazard.id}-${index}`}
                  className="chart-drilldown-card"
                  style={{
                    backgroundColor: "var(--drilldown-card)",
                    borderRadius: "8px",
                    padding: "16px",
                    border: "1px solid var(--drilldown-border-soft)",
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    className="chart-drilldown-fields"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                    }}
                  >
                    <h4 className="chart-drilldown-card-title">{hazard.title || "未知灾害"}</h4>
                    <span
                      style={{
                        backgroundColor: getSeverityColor(hazard.severity || "unknown"),
                        color: "#07172b",
                        padding: "4px 12px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                      }}
                    >
                      {hazard.severity || "未知"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="chart-drilldown-field-label">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                        类型:
                      </span>
                      <span className="chart-drilldown-field-value">
                        {hazard.type.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="chart-drilldown-field-label">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        位置:
                      </span>
                      <span className="chart-drilldown-field-value">{formatLocation(hazard)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="chart-drilldown-field-label">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        时间:
                      </span>
                      <span className="chart-drilldown-field-value">
                        {formatDate(hazard.timestamp || "")}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="chart-drilldown-field-label">
                        <svg
                          width="16"
                          height="16"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        来源:
                      </span>
                      <span className="chart-drilldown-field-value">{hazard.source || "未知"}</span>
                    </div>

                    {hazard.description && (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          display: "flex",
                          gap: "8px",
                          marginTop: "8px",
                        }}
                      >
                        <span className="chart-drilldown-field-label">
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          详情:
                        </span>
                        <span style={{ color: "var(--drilldown-secondary)", lineHeight: "1.5" }}>
                          {hazard.description}
                        </span>
                      </div>
                    )}

                    {hazard.magnitude && (
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            color: "var(--drilldown-muted)",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <svg
                            width="16"
                            height="16"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          震级:
                        </span>
                        <span style={{ color: "var(--drilldown-accent)", fontWeight: "bold" }}>
                          {hazard.magnitude.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 24px",
            borderTop: "1px solid var(--drilldown-border-soft)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            backgroundColor: "var(--drilldown-surface)",
          }}
        >
          <div style={{ display: "flex", gap: "32px", fontSize: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span className="chart-drilldown-muted">总灾害数:</span>
              <span className="chart-drilldown-stat-value">{filteredHazards.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span className="chart-drilldown-muted">平均严重性:</span>
              <span className="chart-drilldown-stat-value">
                {filteredHazards.length > 0
                  ? (
                      filteredHazards.reduce((acc, h) => {
                        const severity = (h.severity || "").toLowerCase();
                        if (severity === "extreme") return acc + 4;
                        if (severity === "severe") return acc + 3;
                        if (severity === "moderate") return acc + 2;
                        if (severity === "minor") return acc + 1;
                        return acc;
                      }, 0) / filteredHazards.length
                    ).toFixed(1)
                  : "暂无"}
              </span>
            </div>
          </div>
          <button
            className="chart-drilldown-footer-button"
            style={{
              padding: "10px 24px",
              backgroundColor: "var(--drilldown-card)",
              color: "var(--drilldown-text)",
              border: "1px solid var(--drilldown-border)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              transition: "all 0.2s",
            }}
            onClick={onClose}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );

  // 使用 Portal 将弹窗渲染到 body 根部，避免被父容器遮挡
  return ReactDOM.createPortal(modalContent, document.body);
};

export default ChartDrilldownModal;
