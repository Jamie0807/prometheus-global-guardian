/** 验证前端与分析服务共享的灾害输入契约保持兼容。 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { formatHazards } from "../src/services/analytics/analyticsService";
import { AnalyticsContractError } from "../src/services/analytics/contracts/common";
import {
  parseAnalyticsHazardData,
  parseAnalyticsHazardDataArray,
} from "../src/services/analytics/contracts/hazardInput";

type AnalyticsHazardFixture = {
  valid: { complete: unknown; nullableOptionalValues: unknown; omittedDefaults: unknown };
  invalid: Array<{ rule: string; value: unknown }>;
};

const fixture = JSON.parse(
  readFileSync(new URL("../contracts/analytics-hazard-data.json", import.meta.url), "utf8"),
) as AnalyticsHazardFixture;

describe("cross-language analytics hazard contract", () => {
  it("accepts the shared valid hazard samples without changing their values", () => {
    expect(parseAnalyticsHazardData(fixture.valid.complete)).toEqual(fixture.valid.complete);
    expect(parseAnalyticsHazardData(fixture.valid.nullableOptionalValues)).toEqual(
      fixture.valid.nullableOptionalValues,
    );
    expect(parseAnalyticsHazardDataArray([fixture.valid.complete])).toEqual([
      fixture.valid.complete,
    ]);
  });

  it("applies Python-compatible defaults to the shared omitted-field sample", () => {
    expect(parseAnalyticsHazardData(fixture.valid.omittedDefaults)).toEqual({
      ...fixture.valid.omittedDefaults,
      type: "unknown",
      title: "Unknown Event",
      coordinates: [0, 0],
      source: "DisasterAWARE",
    });
  });

  it("rejects every shared invalid sample with a safe contract error", () => {
    for (const entry of fixture.invalid) {
      try {
        parseAnalyticsHazardData(entry.value);
        throw new Error(`Expected ${entry.rule} fixture to fail`);
      } catch (error: unknown) {
        expect(error).toMatchObject({ code: "ANALYTICS_RESPONSE_INVALID" });
        expect(String(error)).not.toContain(entry.rule);
      }
    }
  });

  it("rejects runtime non-finite magnitudes", () => {
    expect(() =>
      parseAnalyticsHazardData({ ...fixture.valid.complete, magnitude: Number.NaN }),
    ).toThrow(AnalyticsContractError);
  });

  it("rejects out-of-range coordinates before constructing an analytics request", () => {
    expect(() =>
      formatHazards([{ id: "bad", geometry: { type: "Point", coordinates: [181, 0] } }]),
    ).toThrow(AnalyticsContractError);
  });

  it("uses longitude and latitude from a GeoJSON position with altitude", () => {
    expect(
      formatHazards([
        {
          id: "earthquake-with-depth",
          geometry: { type: "Point", coordinates: [-156.47, 56.191, 17.8] },
        },
      ]),
    ).toMatchObject([{ coordinates: [-156.47, 56.191] }]);
  });
});
