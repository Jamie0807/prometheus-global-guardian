import { useEffect, useState } from "react";
import {
  analyze4DTrends,
  calculate4DRiskScores,
  checkHealth,
  create4DPivotTable,
  getPredictions,
  getRiskAssessment,
  getStatistics,
} from "../../../services/analytics/analyticsService";
import { notify } from "../../../utils/notifications";
import { createClientLogger } from "../../../utils/logger";
import type {
  AnalyticsHazard,
  AnalyticsRecord,
  PivotRiskRecord,
  PivotTrendRecord,
  ServiceStatus,
} from "../types";
import { buildAnalyticsDataHash } from "../utils/analyticsTransforms";

const logger = createClientLogger("analytics-data");

export interface AnalyticsDataState {
  serviceStatus: ServiceStatus;
  predictions: AnalyticsRecord | null;
  statistics: AnalyticsRecord | null;
  riskAssessment: AnalyticsRecord | null;
  pivot4DTrends: PivotTrendRecord | null;
  pivot4DRiskScores: PivotRiskRecord | null;
  loading: boolean;
  checkServiceStatus: () => Promise<void>;
  runAnalysis: () => Promise<void>;
  resetAndRunAnalysis: () => Promise<void>;
}

export function useAnalyticsData(hazards: AnalyticsHazard[]): AnalyticsDataState {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("checking");
  const [predictions, setPredictions] = useState<AnalyticsRecord | null>(null);
  const [statistics, setStatistics] = useState<AnalyticsRecord | null>(null);
  const [riskAssessment, setRiskAssessment] = useState<AnalyticsRecord | null>(null);
  const [pivot4DTrends, setPivot4DTrends] = useState<PivotTrendRecord | null>(null);
  const [pivot4DRiskScores, setPivot4DRiskScores] = useState<PivotRiskRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [lastAnalyzedDataHash, setLastAnalyzedDataHash] = useState("");

  useEffect(() => {
    logger.debug("pivot_trends_updated", { hasData: pivot4DTrends !== null });
  }, [pivot4DTrends]);

  useEffect(() => {
    logger.debug("pivot_risk_scores_updated", { hasData: pivot4DRiskScores !== null });
  }, [pivot4DRiskScores]);

  const checkServiceStatus = async () => {
    setServiceStatus("checking");
    try {
      const isOnline = await checkHealth();
      setServiceStatus(isOnline ? "online" : "offline");

      if (isOnline) {
        notify.success("服务就绪", "Python分析服务已连接");
      } else {
        notify.error("服务离线", "无法连接到Python分析服务");
      }
    } catch {
      setServiceStatus("offline");
      notify.error("连接失败", "检查服务状态失败");
    }
  };

  const executeAnalysis = async (isRetry = false) => {
    if (hazards.length === 0) {
      notify.warning("无数据", "没有数据可供分析");
      return;
    }

    const dataHash = buildAnalyticsDataHash(hazards);
    if (dataHash === lastAnalyzedDataHash && !isRetry) {
      notify.info("使用缓存", "数据未变化，使用上次分析结果");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    const dataSize = Math.min(hazards.length, 100);
    notify.info("开始分析", `正在运行综合分析，处理 ${dataSize} 条记录...`);

    try {
      const analysisData = hazards.slice(0, 100);
      const [statsResult, predResult, riskResult] = await Promise.all([
        getStatistics(analysisData),
        getPredictions(analysisData),
        getRiskAssessment(analysisData),
      ]);

      setStatistics(statsResult as AnalyticsRecord);
      setPredictions(predResult as AnalyticsRecord);
      setRiskAssessment(riskResult as AnalyticsRecord);
      setHasAnalyzed(true);
      setLastAnalyzedDataHash(dataHash);
      setRetryCount(0);

      try {
        const pivotData = await create4DPivotTable(analysisData);
        logger.debug("pivot_table_created", { success: pivotData.success });

        const trendsResult = await analyze4DTrends(analysisData);
        logger.debug("trend_analysis_completed", { success: Boolean(trendsResult?.success) });
        if (trendsResult?.success) {
          const trendsData = trendsResult.data || { message: "时间窗口内数据不足" };
          logger.debug("trend_data_updated");
          setPivot4DTrends(trendsData as PivotTrendRecord);
        } else {
          logger.warn("trend_analysis_unavailable");
        }

        const riskScoresResult = await calculate4DRiskScores(analysisData);
        logger.debug("risk_scoring_completed", { success: Boolean(riskScoresResult?.success) });
        if (riskScoresResult?.success) {
          const riskData = riskScoresResult.data || { message: "时间窗口内数据不足" };
          logger.debug("risk_score_data_updated");
          setPivot4DRiskScores(riskData as PivotRiskRecord);
        } else {
          logger.warn("risk_scoring_unavailable");
        }
      } catch {
        logger.warn("enhanced_analysis_fallback");
      }

      notify.success(
        "分析完成",
        "综合分析成功完成！包含统计分析、预测模型、风险评估和4维透视表增强",
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "分析失败";
      logger.error("analysis_execution_failed");
      setErrorMessage(errorMessage);

      if (retryCount < 3 && !isRetry) {
        setRetryCount((previous) => previous + 1);
        notify.warning("分析失败", `正在重试... (第 ${retryCount + 1} 次)`);
        setTimeout(() => void executeAnalysis(true), 2000 * (retryCount + 1));
      } else {
        notify.error("分析失败", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = () => executeAnalysis(false);

  const resetAndRunAnalysis = async () => {
    setHasAnalyzed(false);
    setStatistics(null);
    setPredictions(null);
    setRiskAssessment(null);
    await executeAnalysis(false);
  };

  useEffect(() => {
    void checkServiceStatus();
  }, []);

  useEffect(() => {
    if (serviceStatus === "online" && !hasAnalyzed && hazards.length > 0) {
      void executeAnalysis();
    }
    // 保持现有自动分析触发条件，避免函数身份变化导致重复请求。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceStatus, hasAnalyzed, hazards.length]);

  return {
    serviceStatus,
    predictions,
    statistics,
    riskAssessment,
    pivot4DTrends,
    pivot4DRiskScores,
    loading,
    checkServiceStatus,
    runAnalysis,
    resetAndRunAnalysis,
  };
}
