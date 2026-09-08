import { getPredictionDisplay } from "../../../services/analytics/analyticsPresentation";
import type { PredictionSummary } from "../types";

interface PredictionStatusBadgeProps {
  prediction: PredictionSummary;
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
