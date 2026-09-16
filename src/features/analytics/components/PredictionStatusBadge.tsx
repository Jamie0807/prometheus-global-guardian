/**
 * 提供预测状态徽章组件。
 */
import { getPredictionDisplay } from "../../../services/analytics/analyticsPresentation";
import type { PredictionModelResult } from "../../../services/analytics/contracts/predictions";

interface PredictionStatusBadgeProps {
  prediction: PredictionModelResult;
}

export default function PredictionStatusBadge({ prediction }: PredictionStatusBadgeProps) {
  const display = getPredictionDisplay(prediction);

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: "4px",
        backgroundColor: display.badgeColor,
        color: "#fff",
        fontSize: "11px",
        fontWeight: "bold",
      }}
    >
      {display.label}
    </span>
  );
}
