import type { Hazard } from "../../types";
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
      const properties = asRecord(feature.properties) ?? {};
      const magnitude = parseOptionalFiniteNumber(properties.mag, `${path}.properties.mag`);
      const time = parseOptionalFiniteNumber(properties.time, `${path}.properties.time`);
      const place = asString(properties.place, "Unknown location");
      return [
        {
          id: parseString(feature.id, `${path}.id`),
          title: asString(properties.title, asString(properties.place, "Unknown Event")),
          type: "EARTHQUAKE",
          severity:
            magnitude !== undefined && magnitude >= 6
              ? "WARNING"
              : magnitude !== undefined && magnitude >= 5
                ? "WATCH"
                : "ADVISORY",
          description: `Magnitude ${magnitude ?? "N/A"} earthquake - ${place}`,
          geometry: parseGeometry(feature.geometry, `${path}.geometry`),
          ...(magnitude === undefined ? {} : { magnitude }),
          ...(time === undefined ? {} : { timestamp: new Date(time).toISOString() }),
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
      const title = asString(event.title, "Unknown Event");
      const categories = asRecordArray(event.categories);
      const category = asString(categories[0]?.title, "UNKNOWN");
      const geometries = asRecordArray(event.geometry);
      const latestGeometry = geometries.at(-1);
      const date = asString(latestGeometry?.date);
      return [
        {
          id: parseString(event.id, `${path}.id`),
          title,
          type: mapNASACategoryToType(category),
          severity: "ADVISORY",
          description: `${category} - ${title}`,
          geometry: parseGeometry(latestGeometry, `${path}.geometry`),
          ...(date ? { timestamp: new Date(date).toISOString() } : {}),
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
      const normalizedEventId =
        typeof eventId === "number"
          ? String(parseFiniteNumber(eventId, `${path}.properties.eventid`))
          : parseString(eventId, `${path}.properties.eventid`);
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

      return [
        {
          id: `gdacs-${normalizedEventId}`,
          title,
          type: detectHazardTypeFromTitle(`${title} ${description} ${severityText}`),
          severity,
          description,
          geometry: parseGeometry(feature.geometry, `${path}.geometry`),
          source: "GDACS",
          ...(url ? { url } : {}),
        } satisfies Hazard,
      ];
    } catch {
      return [];
    }
  });
}
