/**
 * 提供灾害数据适配与规范化工具。
 */
import type { Hazard } from "../../types";
import { createHazardEventId, resolveHazardLayerId } from "@pgg/hazard-domain";
import {
  asRecord,
  asRecordArray,
  parseCoordinates,
  parseFiniteNumber,
  parseRecord,
  parseString,
} from "./contracts/common";

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const parseGeometry = (value: unknown, path: string): Hazard["geometry"] => {
  const geometry = parseRecord(value, path);
  return {
    type: parseString(geometry.type, `${path}.type`),
    coordinates: parseCoordinates(geometry.coordinates, `${path}.coordinates`),
  };
};

const parseOptionalFiniteNumber = (value: unknown, path: string): number | undefined =>
  value === undefined || value === null ? undefined : parseFiniteNumber(value, path);

const readStableSourceEventId = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
};

const toIsoTimestamp = (value: number | undefined): string | undefined =>
  value === undefined ? undefined : new Date(value).toISOString();

export const mapNASACategoryToType = (category: string): string => {
  if (category.includes("Wildfires")) return "WILDFIRE";
  if (category.includes("Volcanoes")) return "VOLCANO";
  if (category.includes("Floods")) return "FLOOD";
  if (category.includes("Severe Storms")) return "STORM";
  if (category.includes("Drought")) return "DROUGHT";
  if (category.includes("Landslides")) return "LANDSLIDE";
  return "UNKNOWN";
};

export const detectHazardTypeFromTitle = (title: string): string => {
  const normalized = title.toLowerCase();
  if (normalized.includes("earthquake")) return "EARTHQUAKE";
  if (normalized.includes("flood")) return "FLOOD";
  if (["cyclone", "hurricane", "typhoon"].some((term) => normalized.includes(term))) {
    return "TROPICAL_CYCLONE";
  }
  if (normalized.includes("volcano")) return "VOLCANO";
  if (normalized.includes("drought")) return "DROUGHT";
  if (normalized.includes("tsunami")) return "TSUNAMI";
  if (normalized.includes("storm")) return "STORM";
  return "UNKNOWN";
};

export function adaptUSGSResponse(input: unknown): Hazard[] {
  const root = asRecord(input);
  if (!root) return [];
  return asRecordArray(root.features).flatMap((feature, index) => {
    try {
      const path = `features.${index}`;
      const sourceEventId = readStableSourceEventId(feature.id);
      if (!sourceEventId) return [];
      const properties = asRecord(feature.properties) ?? {};
      const magnitude = parseOptionalFiniteNumber(properties.mag, `${path}.properties.mag`);
      const time = parseOptionalFiniteNumber(properties.time, `${path}.properties.time`);
      const place = asString(properties.place, "Unknown location");
      const type = "EARTHQUAKE";
      const eventId = createHazardEventId("usgs", sourceEventId);
      const observedAt = toIsoTimestamp(time);
      return [
        {
          schemaVersion: "1",
          eventId,
          sourceEventId,
          sourceId: "usgs",
          layerId: resolveHazardLayerId(type),
          id: eventId,
          title: asString(properties.title, asString(properties.place, "Unknown Event")),
          type,
          severity:
            magnitude !== undefined && magnitude >= 6
              ? "WARNING"
              : magnitude !== undefined && magnitude >= 5
                ? "WATCH"
                : "ADVISORY",
          description: `Magnitude ${magnitude ?? "N/A"} earthquake - ${place}`,
          geometry: parseGeometry(feature.geometry, `${path}.geometry`),
          ...(magnitude === undefined ? {} : { magnitude }),
          ...(observedAt === undefined ? {} : { observedAt, timestamp: observedAt }),
          source: "USGS",
        } satisfies Hazard,
      ];
    } catch {
      return [];
    }
  });
}

export function adaptNASAResponse(input: unknown): Hazard[] {
  const root = asRecord(input);
  if (!root) return [];
  return asRecordArray(root.events).flatMap((event, index) => {
    try {
      const path = `events.${index}`;
      const sourceEventId = readStableSourceEventId(event.id);
      if (!sourceEventId) return [];
      const title = asString(event.title, "Unknown Event");
      const categories = asRecordArray(event.categories);
      const category = asString(categories[0]?.title, "UNKNOWN");
      const geometries = asRecordArray(event.geometry);
      const latestGeometry = geometries.at(-1);
      const date = asString(latestGeometry?.date);
      const type = mapNASACategoryToType(category);
      const eventId = createHazardEventId("nasa-eonet", sourceEventId);
      const observedAt = date ? new Date(date).toISOString() : undefined;
      return [
        {
          schemaVersion: "1",
          eventId,
          sourceEventId,
          sourceId: "nasa-eonet",
          layerId: resolveHazardLayerId(type),
          id: eventId,
          title,
          type,
          severity: "ADVISORY",
          description: `${category} - ${title}`,
          geometry: parseGeometry(latestGeometry, `${path}.geometry`),
          ...(observedAt === undefined ? {} : { observedAt, timestamp: observedAt }),
          source: "NASA EONET",
        } satisfies Hazard,
      ];
    } catch {
      return [];
    }
  });
}

export function adaptGDACSResponse(input: unknown): Hazard[] {
  const root = asRecord(input);
  if (!root) return [];
  return asRecordArray(root.features).flatMap((feature, index) => {
    try {
      const path = `features.${index}`;
      const properties = asRecord(feature.properties) ?? {};
      const eventId = properties.eventid;
      const sourceEventId = readStableSourceEventId(eventId);
      if (!sourceEventId) return [];
      const title = asString(properties.name, asString(properties.eventname, "Unknown Event"));
      const description = asString(properties.description, asString(properties.htmldescription));
      const severityData = asRecord(properties.severitydata);
      const severityText = severityData ? asString(severityData.severitytext) : "";
      const severity =
        properties.alertlevel === "Red"
          ? "WARNING"
          : properties.alertlevel === "Orange"
            ? "WATCH"
            : "ADVISORY";
      const urlRecord = asRecord(properties.url);
      const url = urlRecord ? asString(urlRecord.report) : "";
      const type = detectHazardTypeFromTitle(`${title} ${description} ${severityText}`);
      const canonicalEventId = createHazardEventId("gdacs", sourceEventId);
      const observedAt = asString(properties.eventdate);
      const updatedAt = asString(properties.lastupdate, asString(properties.last_update));

      return [
        {
          schemaVersion: "1",
          eventId: canonicalEventId,
          sourceEventId,
          sourceId: "gdacs",
          layerId: resolveHazardLayerId(type),
          id: canonicalEventId,
          title,
          type,
          severity,
          description,
          geometry: parseGeometry(feature.geometry, `${path}.geometry`),
          source: "GDACS",
          ...(observedAt ? { observedAt, timestamp: observedAt } : {}),
          ...(updatedAt ? { updatedAt } : {}),
          ...(url ? { url } : {}),
        } satisfies Hazard,
      ];
    } catch {
      return [];
    }
  });
}
