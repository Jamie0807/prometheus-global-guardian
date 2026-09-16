/**
 * 提供分析图表标签页内容组件。
 */
import ChartsPanel from "../../../../components/ChartsPanel";
import type { AnalyticsHazard } from "../../types";

interface AnalyticsChartsTabProps {
  hazards: AnalyticsHazard[];
}

export default function AnalyticsChartsTab({ hazards }: AnalyticsChartsTabProps) {
  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        padding: "20px",
        borderRadius: "8px",
        marginTop: "20px",
      }}
    >
      <ChartsPanel hazards={hazards} />
    </div>
  );
}
