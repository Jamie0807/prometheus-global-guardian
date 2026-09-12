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
import type { AnalyticsHazard, AnalyticsTab } from "./types";
import { buildHazardsByType, buildIntensitySeries } from "./utils/analyticsTransforms";
import { useMapState } from "../map/state/MapStateContext";
import { useUIState } from "../../state/UIStateContext";

export default function AnalyticsPage() {
  const { hazards } = useMapState();
  const { closeView } = useUIState();
  const analyticsHazards = hazards as AnalyticsHazard[];
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
  } = useAnalyticsData(analyticsHazards);

  const hazardsByType = useMemo(() => buildHazardsByType(analyticsHazards), [analyticsHazards]);
  const intensityData = useMemo(() => buildIntensitySeries(analyticsHazards), [analyticsHazards]);
  const hasResults = statistics !== null || predictions !== null || riskAssessment !== null;

  return (
    <div style={STYLES.container}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", color: "#fff" }}>
        <AnalyticsHeader serviceStatus={serviceStatus} onClose={closeView} />
        <AnalyticsSummaryGrid
          hazardCount={analyticsHazards.length}
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
              hazards={analyticsHazards}
              hazardsByType={hazardsByType}
              intensityData={intensityData}
              statistics={statistics}
              pivot4DTrends={pivot4DTrends}
              pivot4DRiskScores={pivot4DRiskScores}
            />
          ) : null}
          {activeTab === "charts" ? <AnalyticsChartsTab hazards={analyticsHazards} /> : null}
          {activeTab === "predictions" && predictions ? (
            <PredictionsTab predictions={predictions} />
          ) : null}
          {activeTab === "risk" && riskAssessment ? (
            <RiskTab riskAssessment={riskAssessment} />
          ) : null}
          {activeTab === "quality" ? <AnalyticsQualityTab hazards={analyticsHazards} /> : null}
        </AnalyticsControlPanel>
      </div>
    </div>
  );
}
