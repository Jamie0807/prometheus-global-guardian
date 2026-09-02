import React from "react";
import type { TooltipPayloadEntry } from "recharts";

interface TooltipData {
  [key: string]: string | number | undefined;
  type: string;
  severity: string;
  source: string;
  count: number;
  percentage: number;
  color: string;
  date?: string;
}

function formatTooltipValue(value: TooltipPayloadEntry["value"]): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  return value?.join(", ") ?? "";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadEntry>;
  label?: string;
  chartType: "type" | "severity" | "timeline" | "source";
  totalHazards: number;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  chartType,
  totalHazards,
}) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = (payload[0]?.payload ?? {}) as TooltipData;

  const renderTooltipContent = () => {
    switch (chartType) {
      case "type":
        return (
          <div className="custom-tooltip">
            <div className="tooltip-header">
              <h4>{data.type.replace(/_/g, " ")}</h4>
              <span className="tooltip-badge" style={{ backgroundColor: data.color }}>
                {data.count}
              </span>
            </div>
            <div className="tooltip-content">
              <div className="tooltip-row">
                <span className="tooltip-label">Percentage:</span>
                <span className="tooltip-value">{data.percentage}%</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Total Hazards:</span>
                <span className="tooltip-value">{totalHazards}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Relative Impact:</span>
                <span className="tooltip-value">
                  {data.percentage > 30 ? "High" : data.percentage > 15 ? "Medium" : "Low"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">💡 Click to view details</div>
          </div>
        );

      case "severity": {
        const severityDescriptions: Record<string, string> = {
          Extreme: "Immediate action required - life-threatening situation",
          Severe: "Significant threat - prepare for impact",
          Moderate: "Potential for damage - stay alert",
          Minor: "Low risk - monitor situation",
        };

        return (
          <div className="custom-tooltip">
            <div className="tooltip-header">
              <h4>{data.severity}</h4>
              <span className="tooltip-badge" style={{ backgroundColor: data.color }}>
                {data.count}
              </span>
            </div>
            <div className="tooltip-content">
              <div className="tooltip-description">
                {severityDescriptions[data.severity] || "Unknown severity level"}
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Percentage:</span>
                <span className="tooltip-value">
                  {((data.count / totalHazards) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Priority Level:</span>
                <span className="tooltip-value">
                  {data.severity === "Extreme" || data.severity === "Severe"
                    ? "🔴 High"
                    : data.severity === "Moderate"
                      ? "🟡 Medium"
                      : "🟢 Low"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">
              💡 Click to view all {data.severity.toLowerCase()} hazards
            </div>
          </div>
        );
      }

      case "timeline": {
        const totalForDate = Object.values(data).reduce((acc: number, value: unknown) => {
          if (typeof value === "number") return acc + value;
          return acc;
        }, 0);

        return (
          <div className="custom-tooltip">
            <div className="tooltip-header">
              <h4>
                {new Date(label || "").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </h4>
            </div>
            <div className="tooltip-content timeline-tooltip">
              {payload.map((entry: TooltipPayloadEntry, index: number) => {
                if (!entry.value || entry.value === 0) return null;
                return (
                  <div key={index} className="tooltip-row">
                    <div className="tooltip-legend-item">
                      <span
                        className="tooltip-legend-color"
                        style={{ backgroundColor: entry.stroke }}
                      />
                      <span className="tooltip-label">{String(entry.name ?? "")}:</span>
                    </div>
                    <span className="tooltip-value">{formatTooltipValue(entry.value)}</span>
                  </div>
                );
              })}
              <div className="tooltip-divider" />
              <div className="tooltip-row tooltip-total">
                <span className="tooltip-label">Total Events:</span>
                <span className="tooltip-value">{totalForDate}</span>
              </div>
              {totalForDate > 5 && <div className="tooltip-alert">⚠️ High activity day</div>}
            </div>
            <div className="tooltip-footer">💡 Click to view hazards on this date</div>
          </div>
        );
      }

      case "source":
        return (
          <div className="custom-tooltip">
            <div className="tooltip-header">
              <h4>{data.source}</h4>
              <span className="tooltip-badge" style={{ backgroundColor: "#60a5fa" }}>
                {data.count}
              </span>
            </div>
            <div className="tooltip-content">
              <div className="tooltip-row">
                <span className="tooltip-label">Data Points:</span>
                <span className="tooltip-value">{data.count}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Coverage:</span>
                <span className="tooltip-value">
                  {((data.count / totalHazards) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">Reliability:</span>
                <span className="tooltip-value">
                  {data.count > 50 ? "⭐⭐⭐ High" : data.count > 20 ? "⭐⭐ Medium" : "⭐ Growing"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">💡 Click to view all hazards from this source</div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderTooltipContent();
};

export default CustomChartTooltip;
