/**
 * 定义分析服务的灾害输入契约。
 */
import type { HazardData } from "../analyticsTypes";
import type { HazardLayerId, HazardSourceId } from "../../../../shared/hazards/hazard-event";
import { createHazardEventId } from "../../../../shared/hazards/hazard-event";
import { AnalyticsContractError, parseFiniteNumber, parseRecord } from "./common";

const allowedKeys = new Set([
  "id",
  "type",
  "title",
  "coordinates",
  "timestamp",
  "magnitude",
  "severity",
  "source",
  "populationExposed",
  "schemaVersion",
  "eventId",
  "sourceEventId",
  "sourceId",
  "layerId",
  "observedAt",
  "updatedAt",
  "confidence",
]);

const hazardSourceIds = new Set<HazardSourceId>(["disasteraware", "usgs", "nasa-eonet", "gdacs"]);

const hazardLayerIds = new Set<HazardLayerId>([
  "earthquake",
  "volcanic",
  "hydrological",
  "meteorological",
  "fire",
  "land",
  "drought",
  "unknown",
]);

function parseNonBlankString(value: unknown, path: string, maxLength: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > maxLength) {
    throw new AnalyticsContractError(path);
  }
  return value;
}

function parseCoordinates(value: unknown, path: string): HazardData["coordinates"] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new AnalyticsContractError(path);
  }

  const longitude = parseFiniteNumber(value[0], `${path}.0`);
  const latitude = parseFiniteNumber(value[1], `${path}.1`);
  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    throw new AnalyticsContractError(path);
  }
  return [longitude, latitude];
}

function parseMagnitude(value: unknown, path: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  const magnitude = parseFiniteNumber(value, path);
  if (magnitude < -20 || magnitude > 20) throw new AnalyticsContractError(path);
  return magnitude;
}

function parsePopulationExposed(value: unknown, path: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  const population = parseFiniteNumber(value, path);
  if (!Number.isInteger(population) || population < 0 || population > 1_000_000_000) {
    throw new AnalyticsContractError(path);
  }
  return population;
}

function parseSchemaVersion(value: unknown, path: string): "1" | undefined {
  if (value === undefined) return undefined;
  if (value !== "1") throw new AnalyticsContractError(path);
  return "1";
}

function parseOptionalText(value: unknown, path: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return parseNonBlankString(value, path, maxLength);
}

function parseSourceId(value: unknown, path: string): HazardSourceId | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !hazardSourceIds.has(value as HazardSourceId)) {
    throw new AnalyticsContractError(path);
  }
  return value as HazardSourceId;
}

function parseLayerId(value: unknown, path: string): HazardLayerId | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new AnalyticsContractError(path);
  }
  return hazardLayerIds.has(value as HazardLayerId) ? (value as HazardLayerId) : "unknown";
}

function parseConfidence(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  const confidence = parseFiniteNumber(value, path);
  if (confidence < 0 || confidence > 1) throw new AnalyticsContractError(path);
  return confidence;
}

function validateEventIdentity(
  eventId: string | undefined,
  sourceId: HazardSourceId | undefined,
  sourceEventId: string | undefined,
  path: string,
): void {
  if (eventId === undefined || sourceId === undefined || sourceEventId === undefined) return;
  if (eventId !== createHazardEventId(sourceId, sourceEventId)) {
    throw new AnalyticsContractError(`${path}.eventId`);
  }
}

export function parseAnalyticsHazardData(value: unknown, path = "hazard"): HazardData {
  const record = parseRecord(value, path);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) throw new AnalyticsContractError(`${path}.[key]`);
  }

  const magnitude = parseMagnitude(record.magnitude, `${path}.magnitude`);
  const severity =
    record.severity === undefined
      ? undefined
      : parseNonBlankString(record.severity, `${path}.severity`, 64);
  const source =
    record.source === undefined
      ? "DisasterAWARE"
      : parseNonBlankString(record.source, `${path}.source`, 64);
  const populationExposed = parsePopulationExposed(
    record.populationExposed,
    `${path}.populationExposed`,
  );
  const schemaVersion = parseSchemaVersion(record.schemaVersion, `${path}.schemaVersion`);
  const eventId = parseOptionalText(record.eventId, `${path}.eventId`, 128);
  const sourceEventId = parseOptionalText(record.sourceEventId, `${path}.sourceEventId`, 128);
  const sourceId = parseSourceId(record.sourceId, `${path}.sourceId`);
  const layerId = parseLayerId(record.layerId, `${path}.layerId`);
  const observedAt = parseOptionalText(record.observedAt, `${path}.observedAt`, 64);
  const updatedAt = parseOptionalText(record.updatedAt, `${path}.updatedAt`, 64);
  const confidence = parseConfidence(record.confidence, `${path}.confidence`);

  validateEventIdentity(eventId, sourceId, sourceEventId, path);

  return {
    id: parseNonBlankString(record.id, `${path}.id`, 128),
    type:
      record.type === undefined ? "unknown" : parseNonBlankString(record.type, `${path}.type`, 64),
    title:
      record.title === undefined
        ? "Unknown Event"
        : parseNonBlankString(record.title, `${path}.title`, 256),
    coordinates:
      record.coordinates === undefined
        ? [0, 0]
        : parseCoordinates(record.coordinates, `${path}.coordinates`),
    timestamp: parseNonBlankString(record.timestamp, `${path}.timestamp`, 64),
    ...(magnitude === undefined ? {} : { magnitude }),
    ...(severity === undefined ? {} : { severity }),
    ...(source === undefined ? {} : { source }),
    ...(populationExposed === undefined ? {} : { populationExposed }),
    ...(schemaVersion === undefined ? {} : { schemaVersion }),
    ...(eventId === undefined ? {} : { eventId }),
    ...(sourceEventId === undefined ? {} : { sourceEventId }),
    ...(sourceId === undefined ? {} : { sourceId }),
    ...(layerId === undefined ? {} : { layerId }),
    ...(observedAt === undefined ? {} : { observedAt }),
    ...(updatedAt === undefined ? {} : { updatedAt }),
    ...(confidence === undefined ? {} : { confidence }),
  };
}

export function parseAnalyticsHazardDataArray(value: unknown): HazardData[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError("hazards");
  return value.map((item, index) => parseAnalyticsHazardData(item, `hazards.${index}`));
}
