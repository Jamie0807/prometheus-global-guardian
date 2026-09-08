import { useMemo, useState } from "react";
import AnalyticsControlPanel from "./components/AnalyticsControlPanel";
import AnalyticsHeader from "./components/AnalyticsHeader";
import AnalyticsSummaryGrid from "./components/AnalyticsSummaryGrid";
import AnalyticsTabs from "./components/AnalyticsTabs";
import AnalyticsChartsTab from "./components/tabs/AnalyticsChartsTab";
import AnalyticsQualityTab from "./components/tabs/AnalyticsQualityTab";
import OverviewTab from "./components/tabs/OverviewTab";
import PredictionsTab from "./components/tabs/PredictionsTab";
import RiskTab from "./components/tabs/RiskTab";
import { useAnalyticsData } from "./hooks/useAnalyticsData";
import { STYLES } from "./styles";
import type { AnalyticsPageProps, AnalyticsTab } from "./types";
import { buildHazardsByType, buildIntensitySeries } from "./utils/analyticsTransforms";

export default function AnalyticsPage({ hazards, onClose }: AnalyticsPageProps) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const {
    serviceStatus,
    predictions,
    statistics,
    riskAssessment,
    pivot4DTrends,
    pivot4DRiskScores,
    loading,
    checkServiceStatus,
    resetAndRunAnalysis,
  } = useAnalyticsData(hazards);

  const hazardsByType = useMemo(() => buildHazardsByType(hazards), [hazards]);
  const intensityData = useMemo(() => buildIntensitySeries(hazards), [hazards]);
  const hasResults = statistics !== null || predictions !== null || riskAssessment !== null;

  return (
    <div style={STYLES.container}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", color: "#fff" }}>
        <AnalyticsHeader serviceStatus={serviceStatus} onClose={onClose} />
        <AnalyticsSummaryGrid
          hazardCount={hazards.length}
          hazardsByType={hazardsByType}
          serviceStatus={serviceStatus}
        />
        <AnalyticsControlPanel
          serviceStatus={serviceStatus}
          loading={loading}
          statistics={statistics}
          predictions={predictions}
          riskAssessment={riskAssessment}
          onCheckService={checkServiceStatus}
          onRunAnalysis={resetAndRunAnalysis}
        >
          {hasResults && !loading ? (
            <AnalyticsTabs
              activeTab={activeTab}
              statistics={statistics}
              predictions={predictions}
              riskAssessment={riskAssessment}
              onChange={setActiveTab}
            />
          ) : null}

          {activeTab === "overview" && statistics ? (
            <OverviewTab
              hazards={hazards}
              hazardsByType={hazardsByType}
              intensityData={intensityData}
              statistics={statistics}
              pivot4DTrends={pivot4DTrends}
              pivot4DRiskScores={pivot4DRiskScores}
            />
          ) : null}
          {activeTab === "charts" ? <AnalyticsChartsTab hazards={hazards} /> : null}
          {activeTab === "predictions" && predictions ? (
            <PredictionsTab predictions={predictions} />
          ) : null}
          {activeTab === "risk" && riskAssessment ? (
            <RiskTab riskAssessment={riskAssessment} />
          ) : null}
          {activeTab === "quality" ? <AnalyticsQualityTab hazards={hazards} /> : null}
        </AnalyticsControlPanel>
      </div>
    </div>
  );
}
