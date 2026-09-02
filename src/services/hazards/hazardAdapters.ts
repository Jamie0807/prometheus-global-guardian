import type { Hazard } from "../../types";

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null;

const asRecordArray = (value: unknown): RecordValue[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" && value.length > 0 ? value : fallback;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asGeometry = (value: unknown): Hazard["geometry"] | undefined => {
  if (!isRecord(value) || typeof value.type !== "string" || !Array.isArray(value.coordinates)) {
    return undefined;
  }

  const coordinates = value.coordinates.filter(
    (coordinate): coordinate is number =>
      typeof coordinate === "number" && Number.isFinite(coordinate),
  );
  return { type: value.type, coordinates };
};

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
  const features = isRecord(input) ? asRecordArray(input.features) : [];
  return features.flatMap((feature) => {
    const properties = isRecord(feature.properties) ? feature.properties : {};
    const geometry = asGeometry(feature.geometry);
    const id = asString(feature.id);
    if (!id || !geometry) return [];

    const magnitude = asNumber(properties.mag);
    const time = asNumber(properties.time);
    return [
      {
        id,
        title: asString(properties.title, asString(properties.place, "Unknown Event")),
        type: "EARTHQUAKE",
        severity:
          magnitude !== undefined && magnitude >= 6
            ? "WARNING"
            : magnitude !== undefined && magnitude >= 5
              ? "WATCH"
              : "ADVISORY",
        description: `Magnitude ${magnitude ?? "N/A"} earthquake - ${asString(properties.place, "Unknown location")}`,
        geometry,
        magnitude,
        timestamp: time === undefined ? undefined : new Date(time).toISOString(),
        source: "USGS",
      } satisfies Hazard,
    ];
  });
}

export function adaptNASAResponse(input: unknown): Hazard[] {
  const events = isRecord(input) ? asRecordArray(input.events) : [];
  return events.flatMap((event) => {
    const id = asString(event.id);
    const title = asString(event.title, "Unknown Event");
    const categories = asRecordArray(event.categories);
    const category = asString(categories[0]?.title, "UNKNOWN");
    const geometries = asRecordArray(event.geometry);
    const geometry = asGeometry(geometries.at(-1));
    if (!id || !geometry) return [];

    const date = asString(geometries.at(-1)?.date);
    return [
      {
        id,
        title,
        type: mapNASACategoryToType(category),
        severity: "ADVISORY",
        description: `${category} - ${title}`,
        geometry,
        timestamp: date ? new Date(date).toISOString() : undefined,
        source: "NASA EONET",
      } satisfies Hazard,
    ];
  });
}

export function adaptGDACSResponse(input: unknown): Hazard[] {
  const features = isRecord(input) ? asRecordArray(input.features) : [];
  return features.flatMap((feature) => {
    const geometry = asGeometry(feature.geometry);
    const properties = isRecord(feature.properties) ? feature.properties : {};
    if (!geometry) return [];

    const eventId = properties.eventid;
    const id =
      eventId === undefined || eventId === null
        ? `gdacs-${Date.now()}`
        : `gdacs-${String(eventId)}`;
    const title = asString(properties.name, asString(properties.eventname, "Unknown Event"));
    const description = asString(properties.description, asString(properties.htmldescription));
    const severityText = isRecord(properties.severitydata)
      ? asString(properties.severitydata.severitytext)
      : "";
    const severity =
      properties.alertlevel === "Red"
        ? "WARNING"
        : properties.alertlevel === "Orange"
          ? "WATCH"
          : "ADVISORY";
    const urlRecord = isRecord(properties.url) ? properties.url : {};

    return [
      {
        id,
        title,
        type: detectHazardTypeFromTitle(`${title} ${description} ${severityText}`),
        severity,
        description,
        geometry,
        source: "GDACS",
        url: asString(urlRecord.report) || undefined,
      } satisfies Hazard,
    ];
  });
}
