import type { HazardData } from "../analyticsTypes";
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
  };
}

export function parseAnalyticsHazardDataArray(value: unknown): HazardData[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError("hazards");
  return value.map((item, index) => parseAnalyticsHazardData(item, `hazards.${index}`));
}
