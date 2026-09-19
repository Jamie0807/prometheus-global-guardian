/**
 * 提供灾害数据到 GeoJSON 要素的转换工具。
 */
import type { Hazard } from "../../../types";
import type { HazardLayerId, HazardSourceId } from "../../../types";
import { HAZARD_COLORS, defaultColor } from "../../../config/hazardColors";

export interface HazardPointGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface HazardPointFeature<TProperties> {
  type: "Feature";
  properties: TProperties;
  geometry: HazardPointGeometry;
}

export interface HazardFeatureCollection<TProperties> {
  type: "FeatureCollection";
  features: HazardPointFeature<TProperties>[];
}

export interface HazardLodProperties {
  readonly id: string;
  readonly eventId: string;
  readonly sourceId: HazardSourceId;
  readonly layerId: HazardLayerId;
  readonly title: string;
  readonly type: string;
  readonly severity: string | undefined;
  readonly color: string;
}

export interface HazardHeatmapProperties {
  readonly magnitude: number;
  readonly type: string;
}

function getPointCoordinates(hazard: Hazard): [number, number] | null {
  const [longitude, latitude] = hazard.geometry.coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  return [longitude, latitude];
}

function getHeatmapMagnitude(hazard: Hazard): number {
  return typeof hazard.magnitude === "number" && Number.isFinite(hazard.magnitude)
    ? hazard.magnitude
    : 3;
}

export function createLodFeatureCollection(
  hazards: readonly Hazard[],
): HazardFeatureCollection<HazardLodProperties> {
  const features: HazardPointFeature<HazardLodProperties>[] = [];
  const seenEventIds = new Set<string>();

  for (const hazard of hazards) {
    const coordinates = getPointCoordinates(hazard);
    if (!coordinates) continue;
    if (seenEventIds.has(hazard.eventId)) continue;
    seenEventIds.add(hazard.eventId);

    features.push({
      type: "Feature",
      properties: {
        id: hazard.id,
        eventId: hazard.eventId,
        sourceId: hazard.sourceId,
        layerId: hazard.layerId,
        title: hazard.title,
        type: hazard.type,
        severity: hazard.severity,
        color: HAZARD_COLORS[hazard.type] ?? defaultColor,
      },
      geometry: { type: "Point", coordinates },
    });
  }

  return { type: "FeatureCollection", features };
}

export function createHeatmapFeatureCollection(
  hazards: readonly Hazard[],
): HazardFeatureCollection<HazardHeatmapProperties> {
  const features: HazardPointFeature<HazardHeatmapProperties>[] = [];

  for (const hazard of hazards) {
    const coordinates = getPointCoordinates(hazard);
    if (!coordinates) continue;

    features.push({
      type: "Feature",
      properties: {
        magnitude: getHeatmapMagnitude(hazard),
        type: hazard.type,
      },
      geometry: { type: "Point", coordinates },
    });
  }

  return { type: "FeatureCollection", features };
}
