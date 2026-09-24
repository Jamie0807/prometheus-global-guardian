/**
 * 提供图表自定义提示框组件。
 */
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
                <span className="tooltip-label">占比：</span>
                <span className="tooltip-value">{data.percentage}%</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">灾害总数：</span>
                <span className="tooltip-value">{totalHazards}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">相对影响：</span>
                <span className="tooltip-value">
                  {data.percentage > 30 ? "高" : data.percentage > 15 ? "中" : "低"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">💡 点击查看详情</div>
          </div>
        );

      case "severity": {
        const severityDescriptions: Record<string, string> = {
          Extreme: "需要立即处置，可能危及生命",
          Severe: "威胁显著，请为影响做好准备",
          Moderate: "可能造成损害，请保持警惕",
          Minor: "风险较低，请持续关注",
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
                {severityDescriptions[data.severity] || "未知严重程度"}
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">占比：</span>
                <span className="tooltip-value">
                  {((data.count / totalHazards) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">优先级：</span>
                <span className="tooltip-value">
                  {data.severity === "Extreme" || data.severity === "Severe"
                    ? "🔴 高"
                    : data.severity === "Moderate"
                      ? "🟡 中"
                      : "🟢 低"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">💡 点击查看全部 {data.severity} 灾害</div>
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
              <h4>{new Date(label || "").toLocaleDateString("zh-CN")}</h4>
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
                <span className="tooltip-label">事件总数：</span>
                <span className="tooltip-value">{totalForDate}</span>
              </div>
              {totalForDate > 5 && <div className="tooltip-alert">⚠️ 高活跃度日期</div>}
            </div>
            <div className="tooltip-footer">💡 点击查看当日灾害</div>
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
                <span className="tooltip-label">数据点：</span>
                <span className="tooltip-value">{data.count}</span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">覆盖率：</span>
                <span className="tooltip-value">
                  {((data.count / totalHazards) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="tooltip-row">
                <span className="tooltip-label">可靠性：</span>
                <span className="tooltip-value">
                  {data.count > 50 ? "⭐⭐⭐ 高" : data.count > 20 ? "⭐⭐ 中" : "⭐ 成长中"}
                </span>
              </div>
            </div>
            <div className="tooltip-footer">💡 点击查看该来源的全部灾害</div>
          </div>
        );

      default:
        return null;
    }
  };

  return renderTooltipContent();
};

export default CustomChartTooltip;
