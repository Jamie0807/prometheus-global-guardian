import type {
  Hazard,
  HazardFeedResponse,
  HazardSourceId,
  HazardSourceState,
  HazardSourceStatus,
} from "../../../types";
import {
  HazardContractError,
  parseCoordinates,
  parseFiniteNumber,
  parseNonNegativeInteger,
  parseOptionalString,
  parseRecord,
  parseString,
} from "./common";

function parseSourceId(value: unknown, path: string): HazardSourceId {
  const id = parseString(value, path);
  switch (id) {
    case "disasteraware":
    case "usgs":
    case "nasa-eonet":
    case "gdacs":
      return id;
    default:
      throw new HazardContractError(path);
  }
}

function parseSourceState(value: unknown, path: string): HazardSourceState {
  const state = parseString(value, path);
  switch (state) {
    case "success":
    case "empty":
    case "unavailable":
    case "fallback":
    case "stale":
      return state;
    default:
      throw new HazardContractError(path);
  }
}

function parseBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new HazardContractError(path);
  return value;
}

function parseDescription(value: unknown, path: string): string {
  if (typeof value !== "string") throw new HazardContractError(path);
  return value;
}

function parseHazard(value: unknown, path: string): Hazard {
  const hazard = parseRecord(value, path);
  const geometryPath = `${path}.geometry`;
  const geometry = parseRecord(hazard.geometry, geometryPath);
  const severity = parseOptionalString(hazard.severity, `${path}.severity`);
  const magnitude =
    hazard.magnitude === undefined
      ? undefined
      : parseFiniteNumber(hazard.magnitude, `${path}.magnitude`);
  const timestamp = parseOptionalString(hazard.timestamp, `${path}.timestamp`);
  const url = parseOptionalString(hazard.url, `${path}.url`);

  return {
    id: parseString(hazard.id, `${path}.id`),
    title: parseString(hazard.title, `${path}.title`),
    type: parseString(hazard.type, `${path}.type`),
    geometry: {
      type: parseString(geometry.type, `${geometryPath}.type`),
      coordinates: parseCoordinates(geometry.coordinates, `${geometryPath}.coordinates`),
    },
    description: parseDescription(hazard.description, `${path}.description`),
    source: parseString(hazard.source, `${path}.source`),
    ...(severity === undefined ? {} : { severity }),
    ...(magnitude === undefined ? {} : { magnitude }),
    ...(timestamp === undefined ? {} : { timestamp }),
    ...(url === undefined ? {} : { url }),
  };
}

function parseSourceStatus(value: unknown, path: string): HazardSourceStatus {
  const status = parseRecord(value, path);
  const fetchedAt = parseOptionalString(status.fetchedAt, `${path}.fetchedAt`);
  const message = parseOptionalString(status.message, `${path}.message`);

  return {
    id: parseSourceId(status.id, `${path}.id`),
    status: parseSourceState(status.status, `${path}.status`),
    count: parseNonNegativeInteger(status.count, `${path}.count`),
    ...(fetchedAt === undefined ? {} : { fetchedAt }),
    ...(message === undefined ? {} : { message }),
  };
}

export function parseHazardFeed(value: unknown): HazardFeedResponse {
  const root = parseRecord(value, "response");
  if (!Array.isArray(root.hazards)) throw new HazardContractError("hazards");
  const meta = parseRecord(root.meta, "meta");
  if (!Array.isArray(meta.sources)) throw new HazardContractError("meta.sources");

  return {
    hazards: root.hazards.map((hazard, index) => parseHazard(hazard, `hazards.${index}`)),
    meta: {
      primary: parseSourceId(meta.primary, "meta.primary"),
      fallbackUsed: parseBoolean(meta.fallbackUsed, "meta.fallbackUsed"),
      stale: parseBoolean(meta.stale, "meta.stale"),
      generatedAt: parseString(meta.generatedAt, "meta.generatedAt"),
      sources: meta.sources.map((source, index) =>
        parseSourceStatus(source, `meta.sources.${index}`),
      ),
    },
  };
}
