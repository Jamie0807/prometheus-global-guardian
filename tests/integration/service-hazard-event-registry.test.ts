/** 验证共享灾害事件模型、逻辑图层注册表和跨语言样本。 */
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import * as hazardDomain from "../../packages/hazard-domain/src/index";
import { createHazardEventId, resolveHazardLayerId } from "../../packages/hazard-domain/src/index";

type HazardEventContractFixture = {
  valid: {
    complete: Record<string, unknown>;
    optionalOmitted: Record<string, unknown>;
    unknownType: Record<string, unknown>;
  };
  invalid: Array<{ rule: string; value: Record<string, unknown> }>;
};

const fixture = JSON.parse(
  readFileSync(new URL("../../packages/contracts/hazard-event.json", import.meta.url), "utf8"),
) as HazardEventContractFixture;

describe("hazard event registry", () => {
  it("exports the hazard event factory from the package entrypoint", () => {
    expect(hazardDomain.createHazardEventId("usgs", "event-1")).toBe("usgs:event-1");
  });

  it("exports the hazard layer registry through the package entrypoint", () => {
    expect(hazardDomain.resolveHazardLayerId("FLOOD")).toBe("hydrological");
    expect(hazardDomain.resolveHazardLayerId("UNRECOGNIZED")).toBe("unknown");
  });

  it("keeps the implementation in the package", () => {
    const eventImplementation = readFileSync(
      new URL("../../packages/hazard-domain/src/hazard-event.ts", import.meta.url),
      "utf8",
    );
    const layerImplementation = readFileSync(
      new URL("../../packages/hazard-domain/src/hazard-layer-registry.ts", import.meta.url),
      "utf8",
    );
    expect(eventImplementation).toContain("export function createHazardEventId");
    expect(layerImplementation).toContain("export const HAZARD_LAYER_REGISTRY");
  });

  it("uses source and upstream event ID to construct a stable canonical ID", () => {
    expect(createHazardEventId("usgs", "abc")).toBe("usgs:abc");
  });

  it("rejects an empty upstream event ID", () => {
    expect(() => createHazardEventId("usgs", " ")).toThrow(TypeError);
  });

  it.each([
    ["EARTHQUAKE", "earthquake"],
    ["VOLCANO", "volcanic"],
    ["FLOOD", "hydrological"],
    ["TSUNAMI", "hydrological"],
    ["STORM", "meteorological"],
    ["TROPICAL_CYCLONE", "meteorological"],
    ["CYCLONE", "meteorological"],
    ["TORNADO", "meteorological"],
    ["WINTERSTORM", "meteorological"],
    ["EXTREMETEMPERATURE", "meteorological"],
    ["WILDFIRE", "fire"],
    ["LANDSLIDE", "land"],
    ["DROUGHT", "drought"],
  ] as const)("maps %s to the %s logical layer", (type, layerId) => {
    expect(resolveHazardLayerId(type)).toBe(layerId);
  });

  it("falls back to the unknown layer for an unrecognized hazard type", () => {
    expect(resolveHazardLayerId("UNRECOGNIZED")).toBe("unknown");
  });

  it("contains complete, omitted-optional, unknown-type, and invalid cross-language samples", () => {
    expect(fixture.valid.complete).toMatchObject({
      schemaVersion: "1",
      eventId: "usgs:usgs-1",
      sourceEventId: "usgs-1",
      sourceId: "usgs",
      layerId: "earthquake",
      observedAt: expect.any(String),
      updatedAt: expect.any(String),
      confidence: 0.8,
    });
    expect(fixture.valid.optionalOmitted).not.toHaveProperty("confidence");
    expect(fixture.valid.unknownType).toMatchObject({
      type: "UNRECOGNIZED",
      layerId: "unknown",
    });
    expect(fixture.invalid.map(({ rule }) => rule)).toEqual(
      expect.arrayContaining(["schema_version", "event_id", "coordinates", "confidence"]),
    );
  });
});
