/**
 * 提供分析质量标签页内容组件。
 */
import DataQualityMonitor from "../../../../components/DataQualityMonitor";
import type { AnalyticsHazard } from "../../types";

interface AnalyticsQualityTabProps {
  hazards: AnalyticsHazard[];
}

export default function AnalyticsQualityTab({ hazards }: AnalyticsQualityTabProps) {
  return (
    <div
      className="analytics-surface analytics-tab-panel"
      style={{
        padding: "24px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      <DataQualityMonitor hazards={hazards} source="DisasterAWARE" />
    </div>
  );
}
