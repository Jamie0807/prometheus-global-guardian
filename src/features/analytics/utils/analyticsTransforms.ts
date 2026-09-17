/**
 * 提供分析数据聚合与转换工具。
 */
import { getHazardIntensity } from "../../../utils/hazardMetrics";
import type { AnalyticsHazard } from "../types";

export interface IntensitySeriesPoint {
  x: string;
  y: number;
}

export interface TimelinePoint {
  date: string;
  count: number;
}

export interface DistributionPoint {
  name: string;
  value: number;
}

export function getHazardTimestamp(hazard: AnalyticsHazard): string | undefined {
  return hazard.timestamp || hazard.properties?.timestamp;
}

export function getHazardSeverity(hazard: AnalyticsHazard): string | undefined {
  return hazard.severity || hazard.properties?.severity;
}

export function formatHazardDate(hazard: AnalyticsHazard): string {
  const timestamp = getHazardTimestamp(hazard);
  if (!timestamp) return "未知日期";

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "未知日期" : date.toLocaleDateString("zh-CN");
}

export function buildHazardsByType(hazards: AnalyticsHazard[]): Record<string, number> {
  return hazards.reduce<Record<string, number>>((accumulator, hazard) => {
    const type = hazard.type || hazard.properties?.type || "未分类";
    accumulator[type] = (accumulator[type] || 0) + 1;
    return accumulator;
  }, {});
}

export function buildIntensitySeries(hazards: AnalyticsHazard[]): IntensitySeriesPoint[] {
  return hazards.flatMap((hazard, index) => {
    const intensity = getHazardIntensity(hazard);
    return intensity === null ? [] : [{ x: `#${index + 1}`, y: intensity }];
  });
}

export function buildTimelineData(hazards: AnalyticsHazard[]): TimelinePoint[] {
  const dateBuckets: Record<string, { count: number; sortValue: number }> = {};

  hazards.forEach((hazard) => {
    const timestamp = getHazardTimestamp(hazard);
    const parsedTimestamp = timestamp ? new Date(timestamp) : undefined;
    const timestampValue = parsedTimestamp?.getTime();
    const hasValidTimestamp =
      parsedTimestamp !== undefined &&
      timestampValue !== undefined &&
      Number.isFinite(timestampValue);
    const date = hasValidTimestamp ? parsedTimestamp.toLocaleDateString("zh-CN") : "未知日期";
    const bucket = dateBuckets[date];

    if (bucket) {
      bucket.count += 1;
      return;
    }

    dateBuckets[date] = {
      count: 1,
      sortValue: hasValidTimestamp ? timestampValue : Number.NEGATIVE_INFINITY,
    };
  });

  return Object.entries(dateBuckets)
    .sort(([, first], [, second]) => first.sortValue - second.sortValue)
    .slice(-30)
    .map(([date, { count }]) => ({ date, count }));
}

export function buildSeverityDistribution(hazards: AnalyticsHazard[]): DistributionPoint[] {
  const severityCount: Record<string, number> = {};

  hazards.forEach((hazard) => {
    const severity = getHazardSeverity(hazard) || "未知";
    severityCount[severity] = (severityCount[severity] || 0) + 1;
  });

  return Object.entries(severityCount).map(([name, value]) => ({ name, value }));
}

export function buildAnalyticsDataHash(hazards: AnalyticsHazard[]): string {
  return `${hazards.length}_${hazards[0]?.id || ""}_${hazards[hazards.length - 1]?.id || ""}`;
}
