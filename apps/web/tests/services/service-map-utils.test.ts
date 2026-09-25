/** 验证地图灾害 GeoJSON 转换和缩放级别可见性计算。 */
import { describe, expect, it } from "vitest";

import type { Hazard } from "../../src/types";
import {
  createHeatmapFeatureCollection,
  createLodFeatureCollection,
} from "../../src/features/map/utils/hazardGeojson";
import { getMapLodVisibility } from "../../src/features/map/utils/mapLod";

const validHazard: Hazard = {
  schemaVersion: "1",
  eventId: "disasteraware:hazard-1",
  sourceEventId: "hazard-1",
  sourceId: "disasteraware",
  layerId: "hydrological",
  id: "hazard-1",
  title: "Flood near coast",
  type: "FLOOD",
  severity: "WARNING",
  geometry: { type: "Point", coordinates: [120, 30] },
  description: "Flood warning",
  source: "Test",
  magnitude: 4.2,
};

describe("map LOD visibility", () => {
  it("uses clusters below the cluster threshold", () => {
    expect(getMapLodVisibility(7.9, false)).toEqual({
      showClusters: true,
      showMarkers: false,
      showBuildings: false,
    });
  });

  it("uses markers from the cluster threshold and buildings from the building threshold", () => {
    expect(getMapLodVisibility(8, false)).toEqual({
      showClusters: false,
      showMarkers: true,
      showBuildings: false,
    });
    expect(getMapLodVisibility(14, false)).toEqual({
      showClusters: false,
      showMarkers: true,
      showBuildings: true,
    });
  });

  it("hides all non-heatmap renderers when heatmap mode is active", () => {
    expect(getMapLodVisibility(15, true)).toEqual({
      showClusters: false,
      showMarkers: false,
      showBuildings: false,
    });
  });
});

describe("hazard GeoJSON conversion", () => {
  it("creates LOD features with the hazard identity, severity, and configured color", () => {
    expect(createLodFeatureCollection([validHazard])).toEqual({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            id: "hazard-1",
            eventId: "disasteraware:hazard-1",
            sourceId: "disasteraware",
            layerId: "hydrological",
            title: "Flood near coast",
            type: "FLOOD",
            severity: "WARNING",
            color: "#4A90E2",
          },
          geometry: { type: "Point", coordinates: [120, 30] },
        },
      ],
    });
  });

  it("filters hazards without finite longitude and latitude", () => {
    const invalidHazard: Hazard = {
      ...validHazard,
      id: "invalid-hazard",
      geometry: { type: "Point", coordinates: [Number.NaN, 30] },
    };

    expect(createLodFeatureCollection([validHazard, invalidHazard]).features).toHaveLength(1);
  });

  it("deduplicates repeated event IDs before creating LOD features", () => {
    const duplicate = {
      ...validHazard,
      id: "legacy-duplicate-id",
      title: "Duplicate title",
    };

    const result = createLodFeatureCollection([validHazard, duplicate]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.properties.eventId).toBe("disasteraware:hazard-1");
  });

  it("keeps a valid later record when an earlier duplicate has invalid coordinates", () => {
    const invalidDuplicate = {
      ...validHazard,
      id: "invalid-duplicate",
      geometry: { type: "Point" as const, coordinates: [Number.NaN, 30] },
    };
    const validLaterDuplicate = {
      ...validHazard,
      id: "valid-duplicate",
      geometry: { type: "Point" as const, coordinates: [121, 31] },
    };

    const result = createLodFeatureCollection([invalidDuplicate, validLaterDuplicate]);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry.coordinates).toEqual([121, 31]);
  });

  it("uses the existing heatmap magnitude fallback and preserves zero", () => {
    expect(
      createHeatmapFeatureCollection([
        { ...validHazard, id: "missing-magnitude", magnitude: undefined },
        { ...validHazard, id: "zero-magnitude", magnitude: 0 },
      ]).features.map((feature) => feature.properties.magnitude),
    ).toEqual([3, 0]);
  });
});
