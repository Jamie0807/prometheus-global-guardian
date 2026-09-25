import { createHazardEventId, resolveHazardLayerId } from "@pgg/hazard-domain";
import type { ServerHazard } from "./hazard-source.js";

type DisasterAwareHazard = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: DisasterAwareHazard, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readFiniteNumber(record: DisasterAwareHazard, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStableHazardEventId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

export function adaptDisasterAwareHazards(payload: unknown): ServerHazard[] {
  if (!Array.isArray(payload)) return [];

  return payload.filter(isRecord).flatMap((hazard) => {
    const latitude = readFiniteNumber(hazard, "latitude");
    const longitude = readFiniteNumber(hazard, "longitude");
    const sourceEventId = readStableHazardEventId(hazard.hazard_ID);
    if (!sourceEventId) return [];

    const eventId = createHazardEventId("disasteraware", sourceEventId);
    const type = readString(hazard, "type_ID", "UNKNOWN");
    const observedAt = readString(hazard, "create_Date");
    const updatedAt = readString(hazard, "last_Update");
    const severity = readString(hazard, "severity_ID");

    return [
      {
        schemaVersion: "1",
        eventId,
        sourceEventId,
        sourceId: "disasteraware",
        layerId: resolveHazardLayerId(type),
        id: eventId,
        title: readString(hazard, "hazard_Name", "Unknown Hazard"),
        type,
        geometry: {
          type: "Point",
          coordinates:
            latitude === undefined || longitude === undefined ? [0, 0] : [longitude, latitude],
        },
        description: readString(
          hazard,
          "description",
          readString(hazard, "hazard_Name", "No description available"),
        ),
        source: readString(hazard, "creator", "DisasterAWARE"),
        ...(severity ? { severity } : {}),
        ...(observedAt ? { timestamp: observedAt, observedAt } : {}),
        ...(updatedAt ? { updatedAt } : {}),
      } satisfies ServerHazard,
    ];
  });
}
