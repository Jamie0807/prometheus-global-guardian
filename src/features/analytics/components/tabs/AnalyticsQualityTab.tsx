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
      style={{
        background: "linear-gradient(135deg, #0a0a0a 0%, #050505 100%)",
        padding: "24px",
        borderRadius: "12px",
        marginTop: "20px",
        border: "1px solid rgba(33, 150, 243, 0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <DataQualityMonitor hazards={hazards} source="DisasterAWARE" />
    </div>
  );
}
