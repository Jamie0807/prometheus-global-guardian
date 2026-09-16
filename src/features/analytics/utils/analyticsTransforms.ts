/**
 * 提供分析数据聚合与转换工具。
 */
import { getHazardIntensity } from "../../../utils/hazardMetrics";
import type { AnalyticsHazard } from "../types";

export interface IntensitySeriesPoint {
  x: string;
  y: number;
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

export function buildAnalyticsDataHash(hazards: AnalyticsHazard[]): string {
  return `${hazards.length}_${hazards[0]?.id || ""}_${hazards[hazards.length - 1]?.id || ""}`;
}
