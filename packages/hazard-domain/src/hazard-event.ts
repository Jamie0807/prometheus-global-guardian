export type HazardSourceId = "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";

export type HazardLayerId =
  | "earthquake"
  | "volcanic"
  | "hydrological"
  | "meteorological"
  | "fire"
  | "land"
  | "drought"
  | "unknown";

export interface HazardEvent {
  schemaVersion: "1";
  eventId: string;
  sourceEventId: string;
  sourceId: HazardSourceId;
  layerId: HazardLayerId;
  type: string;
  title: string;
  geometry: { type: string; coordinates: number[] };
  observedAt?: string;
  updatedAt?: string;
  severity?: string;
  confidence?: number;
  magnitude?: number;
  description: string;
  url?: string;
}

export function createHazardEventId(sourceId: HazardSourceId, sourceEventId: string): string {
  if (sourceEventId.trim() === "") {
    throw new TypeError("sourceEventId must not be empty");
  }

  return `${sourceId}:${sourceEventId}`;
}
