import { describe, expect, it } from "vitest";
import {
  buildAnalyticsDataHash,
  buildHazardsByType,
  buildIntensitySeries,
} from "../../src/features/analytics/utils/analyticsTransforms";
import type { AnalyticsHazard } from "../../src/features/analytics/types";

function createHazard(overrides: Partial<AnalyticsHazard> = {}): AnalyticsHazard {
  return {
    id: "hazard-1",
    title: "Test hazard",
    type: "EARTHQUAKE",
    geometry: { type: "Point", coordinates: [116.4, 39.9] },
    description: "Test event",
    source: "Test",
    ...overrides,
  };
}

describe("analyticsTransforms", () => {
  it("returns empty aggregates for an empty hazard list", () => {
    expect(buildHazardsByType([])).toEqual({});
    expect(buildIntensitySeries([])).toEqual([]);
    expect(buildAnalyticsDataHash([])).toBe("0__");
  });

  it("uses the top-level hazard type before properties.type", () => {
    const hazards = [
      createHazard({ type: "EARTHQUAKE", properties: { type: "FLOOD" } }),
      createHazard({ id: "hazard-2", type: "EARTHQUAKE" }),
    ];

    expect(buildHazardsByType(hazards)).toEqual({ EARTHQUAKE: 2 });
  });

  it("falls back to properties.type and then the uncategorized label", () => {
    const hazards = [
      createHazard({ type: "", properties: { type: "FLOOD" } }),
      createHazard({ id: "hazard-2", type: "", properties: {} }),
    ];

    expect(buildHazardsByType(hazards)).toEqual({ FLOOD: 1, 未分类: 1 });
  });

  it("filters invalid intensities while preserving original hazard numbers", () => {
    const hazards = [
      createHazard({ magnitude: 4.2 }),
      createHazard({ id: "hazard-2", magnitude: Number.NaN }),
      createHazard({ id: "hazard-3", properties: { mag: "5.6" } }),
      createHazard({ id: "hazard-4", properties: { magnitude: "invalid" } }),
    ];

    expect(buildIntensitySeries(hazards)).toEqual([
      { x: "#1", y: 4.2 },
      { x: "#3", y: 5.6 },
    ]);
  });

  it("builds the existing count-first-id-last-id data hash", () => {
    const hazards = [
      createHazard({ id: "first" }),
      createHazard({ id: "middle" }),
      createHazard({ id: "last" }),
    ];

    expect(buildAnalyticsDataHash(hazards)).toBe("3_first_last");
  });
});
