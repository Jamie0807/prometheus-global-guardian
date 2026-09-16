/**
 * 提供分析服务数据到视图模型的转换工具。
 */
import type { StatisticsData } from "../../../services/analytics/contracts/statistics";
import type { OverviewStatisticsView } from "../types";

// 统计端点提供描述性数据，而非综合分析响应。
export function toOverviewStatistics(data: StatisticsData): OverviewStatisticsView {
  const descriptive = data.descriptiveStatistics;
  const mostCommon =
    Object.entries(descriptive.typeDistribution.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    descriptive.typeDistribution.mostCommon;
  return {
    magnitudeMean: descriptive.basicStats.mean.magnitude ?? null,
    magnitudeStandardDeviation: descriptive.basicStats.std.magnitude ?? null,
    descriptiveStatistics: {
      variabilityMeasures: descriptive.variabilityMeasures,
      distributionMetrics: descriptive.distributionMetrics,
      typeDistribution: { ...descriptive.typeDistribution, mostCommon },
    },
  };
}
