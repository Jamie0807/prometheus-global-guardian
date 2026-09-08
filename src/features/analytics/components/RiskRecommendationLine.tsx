import { formatRiskRecommendation } from "../../../services/analytics/analyticsPresentation";
import type { RiskRecommendation } from "../types";

interface RiskRecommendationLineProps {
  recommendation: RiskRecommendation | string;
}

export default function RiskRecommendationLine({ recommendation }: RiskRecommendationLineProps) {
  const display =
    typeof recommendation === "string"
      ? formatRiskRecommendation({ message: recommendation })
      : formatRiskRecommendation(recommendation);

  return (
    <li style={{ marginBottom: "8px", fontSize: "14px" }}>
      <strong style={{ color: "#FFD54F" }}>{display.severityLabel}: </strong>
      {display.text}
    </li>
  );
}
