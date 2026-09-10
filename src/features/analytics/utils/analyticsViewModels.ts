import type { StatisticsData } from "../../../services/analytics/contracts/statistics";
import type { OverviewStatisticsView } from "../types";

// The statistics endpoint provides descriptive data, not the combined-analysis response.
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
