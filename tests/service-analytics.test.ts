import { describe, expect, it, vi } from "vitest";

import { formatHazards } from "../src/services/analytics/analyticsService";

describe("analytics service", () => {
  it("normalizes source properties and preserves explicit timestamps", () => {
    const result = formatHazards([
      {
        id: "hazard-1",
        type: "FLOOD",
        properties: {
          title: "River flood",
          timestamp: "2024-01-01T00:00:00.000Z",
          magnitude: 4,
          severity: "WATCH",
          source: "GDACS",
          populationExposed: 12,
        },
        geometry: { coordinates: [1, 2] },
      },
    ]);

    expect(result).toEqual([
      {
        id: "hazard-1",
        type: "FLOOD",
        title: "River flood",
        coordinates: [1, 2],
        timestamp: "2024-01-01T00:00:00.000Z",
        magnitude: 4,
        severity: "WATCH",
        source: "GDACS",
        populationExposed: 12,
      },
    ]);
  });

  it("uses safe fallbacks for missing fields", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-02-03T04:05:06.000Z"));

    const result = formatHazards([{}]);

    expect(result[0]).toMatchObject({
      id: "hazard-0-1706933106000",
      type: "未分类",
      title: "Unknown Event",
      coordinates: [0, 0],
      timestamp: "2024-02-03T04:05:06.000Z",
      magnitude: null,
      severity: "unknown",
      source: "DisasterAWARE",
      populationExposed: null,
    });
    vi.useRealTimers();
  });
});
