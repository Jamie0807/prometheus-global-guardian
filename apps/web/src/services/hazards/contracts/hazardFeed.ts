/**
 * 定义灾害数据源响应契约与解析逻辑。
 */
import type {
  Hazard,
  HazardFeedResponse,
  HazardLayerId,
  HazardSourceId,
  HazardSourceState,
  HazardSourceStatus,
} from "../../../types";
import { createHazardEventId, resolveHazardLayerId } from "@pgg/hazard-domain";
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

function parseSchemaVersion(value: unknown, path: string): "1" {
  if (value !== "1") throw new HazardContractError(path);
  return "1";
}

function parseLayerId(value: unknown, path: string): HazardLayerId {
  const layerId = parseString(value, path);
  switch (layerId) {
    case "earthquake":
    case "volcanic":
    case "hydrological":
    case "meteorological":
    case "fire":
    case "land":
    case "drought":
    case "unknown":
      return layerId;
    default:
      return "unknown";
  }
}

function parseConfidence(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  const confidence = parseFiniteNumber(value, path);
  if (confidence < 0 || confidence > 1) throw new HazardContractError(path);
  return confidence;
}

function parseLegacySourceId(value: unknown, path: string): HazardSourceId {
  const source = parseString(value, path).trim().toLowerCase();
  switch (source) {
    case "disasteraware":
    case "disaster aware":
      return "disasteraware";
    case "usgs":
      return "usgs";
    case "nasa eonet":
    case "nasa-eonet":
      return "nasa-eonet";
    case "gdacs":
      return "gdacs";
    default:
      throw new HazardContractError(path);
  }
}

function getSourceLabel(sourceId: HazardSourceId): string {
  switch (sourceId) {
    case "disasteraware":
      return "DisasterAWARE";
    case "usgs":
      return "USGS";
    case "nasa-eonet":
      return "NASA EONET";
    case "gdacs":
      return "GDACS";
  }
}

function parseHazard(value: unknown, path: string): Hazard {
  const hazard = parseRecord(value, path);
  const geometryPath = `${path}.geometry`;
  const geometry = parseRecord(hazard.geometry, geometryPath);
  const hasCanonicalFields =
    hazard.schemaVersion !== undefined ||
    hazard.eventId !== undefined ||
    hazard.sourceEventId !== undefined ||
    hazard.sourceId !== undefined ||
    hazard.layerId !== undefined;
  const schemaVersion = hasCanonicalFields
    ? parseSchemaVersion(hazard.schemaVersion, `${path}.schemaVersion`)
    : "1";
  const title = parseString(hazard.title, `${path}.title`);
  const type = parseString(hazard.type, `${path}.type`);
  const description = parseDescription(hazard.description, `${path}.description`);
  const severity = parseOptionalString(hazard.severity, `${path}.severity`);
  const magnitude =
    hazard.magnitude === undefined
      ? undefined
      : parseFiniteNumber(hazard.magnitude, `${path}.magnitude`);
  const timestamp = parseOptionalString(hazard.timestamp, `${path}.timestamp`);
  const observedAt = parseOptionalString(hazard.observedAt, `${path}.observedAt`);
  const updatedAt = parseOptionalString(hazard.updatedAt, `${path}.updatedAt`);
  const confidence = parseConfidence(hazard.confidence, `${path}.confidence`);
  const url = parseOptionalString(hazard.url, `${path}.url`);

  if (hasCanonicalFields) {
    const sourceId = parseSourceId(hazard.sourceId, `${path}.sourceId`);
    const sourceEventId = parseString(hazard.sourceEventId, `${path}.sourceEventId`);
    if (sourceEventId.trim() === "") {
      throw new HazardContractError(`${path}.sourceEventId`);
    }
    const eventId = parseString(hazard.eventId, `${path}.eventId`);
    if (eventId !== createHazardEventId(sourceId, sourceEventId)) {
      throw new HazardContractError(`${path}.eventId`);
    }
    const layerId = parseLayerId(hazard.layerId, `${path}.layerId`);
    const source =
      hazard.source === undefined
        ? getSourceLabel(sourceId)
        : parseString(hazard.source, `${path}.source`);
    const legacyTimestamp = timestamp ?? observedAt;

    return {
      schemaVersion,
      eventId,
      sourceEventId,
      sourceId,
      layerId,
      id: eventId,
      title,
      type,
      geometry: {
        type: parseString(geometry.type, `${geometryPath}.type`),
        coordinates: parseCoordinates(geometry.coordinates, `${geometryPath}.coordinates`),
      },
      description,
      source,
      ...(observedAt === undefined ? {} : { observedAt }),
      ...(updatedAt === undefined ? {} : { updatedAt }),
      ...(severity === undefined ? {} : { severity }),
      ...(confidence === undefined ? {} : { confidence }),
      ...(magnitude === undefined ? {} : { magnitude }),
      ...(legacyTimestamp === undefined ? {} : { timestamp: legacyTimestamp }),
      ...(url === undefined ? {} : { url }),
    };
  }

  const id = parseString(hazard.id, `${path}.id`);
  const sourceId = parseLegacySourceId(hazard.source, `${path}.source`);
  const sourceEventId = id;
  const eventId = createHazardEventId(sourceId, sourceEventId);
  const layerId = resolveHazardLayerId(type);
  const normalizedObservedAt = observedAt ?? timestamp;

  return {
    schemaVersion,
    eventId,
    sourceEventId,
    sourceId,
    layerId,
    id,
    title,
    type,
    geometry: {
      type: parseString(geometry.type, `${geometryPath}.type`),
      coordinates: parseCoordinates(geometry.coordinates, `${geometryPath}.coordinates`),
    },
    description,
    source: parseString(hazard.source, `${path}.source`),
    ...(normalizedObservedAt === undefined ? {} : { observedAt: normalizedObservedAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(severity === undefined ? {} : { severity }),
    ...(confidence === undefined ? {} : { confidence }),
    ...(magnitude === undefined ? {} : { magnitude }),
    ...(normalizedObservedAt === undefined ? {} : { timestamp: normalizedObservedAt }),
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
