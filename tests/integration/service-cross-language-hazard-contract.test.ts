/** 验证前端与分析服务共享的灾害输入契约保持兼容。 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { formatHazards } from "../../apps/web/src/services/analytics/analyticsService";
import { AnalyticsContractError } from "../../apps/web/src/services/analytics/contracts/common";
import {
  parseAnalyticsHazardData,
  parseAnalyticsHazardDataArray,
} from "../../apps/web/src/services/analytics/contracts/hazardInput";

type AnalyticsHazardFixture = {
  valid: { complete: unknown; nullableOptionalValues: unknown; omittedDefaults: unknown };
  invalid: Array<{ rule: string; value: unknown }>;
};

type CanonicalHazardFixture = {
  valid: {
    complete: Record<string, unknown>;
    optionalOmitted: Record<string, unknown>;
    unknownType: Record<string, unknown>;
  };
  invalid: Array<{ rule: string; value: Record<string, unknown> }>;
};

const fixture = JSON.parse(
  readFileSync(
    new URL("../../packages/contracts/analytics-hazard-data.json", import.meta.url),
    "utf8",
  ),
) as AnalyticsHazardFixture;

const canonicalFixture = JSON.parse(
  readFileSync(new URL("../../packages/contracts/hazard-event.json", import.meta.url), "utf8"),
) as CanonicalHazardFixture;

function toAnalyticsHazard(event: Record<string, unknown>): Record<string, unknown> {
  const geometry = event.geometry as { coordinates: [number, number, ...number[]] };
  return {
    id: event.eventId,
    type: event.type,
    title: event.title,
    coordinates: geometry.coordinates.slice(0, 2),
    timestamp: event.observedAt ?? "2026-09-11T00:00:00.000Z",
    source: event.sourceId,
    schemaVersion: event.schemaVersion,
    eventId: event.eventId,
    sourceEventId: event.sourceEventId,
    sourceId: event.sourceId,
    layerId: event.layerId,
    ...(event.observedAt === undefined ? {} : { observedAt: event.observedAt }),
    ...(event.updatedAt === undefined ? {} : { updatedAt: event.updatedAt }),
    ...(event.severity === undefined ? {} : { severity: event.severity }),
    ...(event.confidence === undefined ? {} : { confidence: event.confidence }),
    ...(event.magnitude === undefined ? {} : { magnitude: event.magnitude }),
  };
}

describe("cross-language analytics hazard contract", () => {
  it("preserves canonical fields while adapting geometry to legacy analytics coordinates", () => {
    const canonical = toAnalyticsHazard(canonicalFixture.valid.complete);
    const canonicalInput = { ...canonicalFixture.valid.complete, source: "usgs" };

    expect(formatHazards([canonicalInput])).toMatchObject([canonical]);
    expect(parseAnalyticsHazardData(canonical)).toEqual(canonical);
  });

  it("normalizes unknown canonical layers to unknown in the shared sample", () => {
    const canonical = toAnalyticsHazard({
      ...canonicalFixture.valid.unknownType,
      layerId: "future-layer",
    });

    expect(parseAnalyticsHazardData(canonical)).toMatchObject({ layerId: "unknown" });
    expect(formatHazards([canonical])).toMatchObject([{ layerId: "unknown" }]);
  });

  it("rejects canonical confidence outside the inclusive range", () => {
    for (const confidence of [-0.01, 1.01, null, "0.8"]) {
      expect(() =>
        parseAnalyticsHazardData(
          toAnalyticsHazard({ ...canonicalFixture.valid.complete, confidence }),
        ),
      ).toThrowError(expect.objectContaining({ path: "hazard.confidence" }));
    }
  });

  it("rejects canonical event IDs that disagree with source identity", () => {
    expect(() =>
      parseAnalyticsHazardData(
        toAnalyticsHazard({
          ...canonicalFixture.valid.complete,
          eventId: "usgs:other-event",
        }),
      ),
    ).toThrowError(expect.objectContaining({ path: "hazard.eventId" }));
  });

  it("accepts omitted canonical optional fields while rejecting explicit null", () => {
    const omitted = toAnalyticsHazard(canonicalFixture.valid.optionalOmitted);
    expect(parseAnalyticsHazardData(omitted)).toEqual(omitted);

    for (const field of [
      "schemaVersion",
      "eventId",
      "sourceEventId",
      "sourceId",
      "layerId",
      "observedAt",
      "updatedAt",
      "confidence",
    ] as const) {
      expect(() =>
        parseAnalyticsHazardData({
          ...omitted,
          [field]: null,
        }),
      ).toThrowError(expect.objectContaining({ path: `hazard.${field}` }));
    }
  });

  it("rejects every invalid shared canonical sample", () => {
    for (const entry of canonicalFixture.invalid) {
      expect(() => parseAnalyticsHazardData(toAnalyticsHazard(entry.value))).toThrow(
        AnalyticsContractError,
      );
    }
  });

  it("keeps the existing legacy analytics sample compatible", () => {
    expect(parseAnalyticsHazardData(fixture.valid.complete)).toEqual(fixture.valid.complete);
  });

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

  it("replaces a blank source timestamp with a valid request timestamp", () => {
    const [formatted] = formatHazards([
      {
        id: "gdacs-without-timestamp",
        timestamp: "",
        geometry: { type: "Point", coordinates: [12.5, 41.9] },
      },
    ]);

    expect(formatted.timestamp).not.toBe("");
    expect(parseAnalyticsHazardData(formatted)).toEqual(formatted);
  });

  it("truncates an external title to the Python request limit", () => {
    const [formatted] = formatHazards([
      {
        id: "gdacs-with-long-title",
        title: "灾".repeat(257),
        geometry: { type: "Point", coordinates: [12.5, 41.9] },
      },
    ]);

    expect(formatted.title).toHaveLength(256);
    expect(parseAnalyticsHazardData(formatted)).toEqual(formatted);
  });
});
