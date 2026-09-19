/** 聚合 USGS、NASA EONET 和 GDACS 的灾害数据，供后端 /api/hazards 接口使用。 */

import fetch, { type Response as FetchResponse } from "node-fetch";

import {
  createHazardEventId,
  type HazardEvent,
  type HazardSourceId,
} from "../../shared/hazards/hazard-event.js";
import { resolveHazardLayerId } from "../../shared/hazards/hazard-layer-registry.js";
import type { HazardSourceHealth } from "./source-health.js";

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const NASA_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300";
const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";

type Geometry = HazardEvent["geometry"];

export interface ServerHazard extends HazardEvent {
  id: string;
  source: string;
  timestamp?: string;
}

export type { HazardSourceId } from "../../shared/hazards/hazard-event.js";
export type { HazardSourceHealth, HazardSourceHealthErrorCode } from "./source-health.js";

export type HazardSourceState = "success" | "empty" | "unavailable" | "fallback" | "stale";

export interface HazardSourceStatus {
  id: HazardSourceId;
  status: HazardSourceState;
  count: number;
  fetchedAt?: string;
  message?: string;
  health?: HazardSourceHealth;
}

export interface CachedHazardSource {
  hazards: ServerHazard[];
  fetchedAt: string;
}

export type HazardSourceFetch = (url: string) => Promise<FetchResponse>;

export interface HazardSourceLoadResult {
  hazards: ServerHazard[];
  status: HazardSourceStatus;
}

export type HazardSourceLoader = (
  source: HazardSourceId,
  load: () => Promise<ServerHazard[]>,
) => Promise<HazardSourceLoadResult>;

interface USGSFeature {
  id?: unknown;
  properties: {
    title?: string;
    place?: string;
    mag?: number;
    time?: number;
  };
  geometry: Geometry;
}

interface NASAEvent {
  id?: unknown;
  title: string;
  categories?: Array<{ title?: string }>;
  geometry?: Array<{
    type: string;
    coordinates: number[];
    date?: string;
  }>;
}

interface GDACSFeature {
  geometry?: Geometry;
  properties?: {
    eventid?: unknown;
    name?: string;
    eventname?: string;
    description?: string;
    htmldescription?: string;
    alertlevel?: "Red" | "Orange" | string;
    severitydata?: { severitytext?: string };
    url?: { report?: string };
    lastupdate?: string;
    last_update?: string;
    eventdate?: string;
  };
}

export function mapNASACategoryToType(category: string): string {
  if (category.includes("Wildfires")) return "WILDFIRE";
  if (category.includes("Volcanoes")) return "VOLCANO";
  if (category.includes("Floods")) return "FLOOD";
  if (category.includes("Severe Storms")) return "STORM";
  if (category.includes("Drought")) return "DROUGHT";
  if (category.includes("Landslides")) return "LANDSLIDE";
  return "UNKNOWN";
}

export function detectHazardTypeFromTitle(title: string): string {
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle.includes("earthquake")) return "EARTHQUAKE";
  if (normalizedTitle.includes("flood")) return "FLOOD";
  if (
    normalizedTitle.includes("cyclone") ||
    normalizedTitle.includes("hurricane") ||
    normalizedTitle.includes("typhoon")
  ) {
    return "TROPICAL_CYCLONE";
  }
  if (normalizedTitle.includes("volcano")) return "VOLCANO";
  if (normalizedTitle.includes("drought")) return "DROUGHT";
  if (normalizedTitle.includes("tsunami")) return "TSUNAMI";
  if (normalizedTitle.includes("storm")) return "STORM";
  return "UNKNOWN";
}

function readStableSourceEventId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function toIsoTimestamp(value: number | undefined): string | undefined {
  return value === undefined ? undefined : new Date(value).toISOString();
}

function readRequiredResponseArray<T>(payload: unknown, property: string, source: string): T[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !Array.isArray((payload as Record<string, unknown>)[property])
  ) {
    throw new SyntaxError(`${source} response must include a ${property} array.`);
  }

  return (payload as Record<string, unknown>)[property] as T[];
}

export async function fetchUSGSEarthquakes(
  sourceFetch: HazardSourceFetch = fetch,
): Promise<ServerHazard[]> {
  const response = await sourceFetch(USGS_URL);
  if (!response.ok) {
    throw new Error("USGS response was unavailable");
  }

  const features = readRequiredResponseArray<USGSFeature>(
    await response.json(),
    "features",
    "USGS",
  );
  return features
    .map((feature): ServerHazard | null => {
      const sourceEventId = readStableSourceEventId(feature.id);
      if (!sourceEventId) return null;

      const eventId = createHazardEventId("usgs", sourceEventId);
      const observedAt = toIsoTimestamp(feature.properties.time);
      const type = "EARTHQUAKE";
      const magnitude = feature.properties.mag;
      return {
        schemaVersion: "1",
        eventId,
        sourceEventId,
        sourceId: "usgs",
        layerId: resolveHazardLayerId(type),
        id: eventId,
        title: feature.properties.title || feature.properties.place || "Unknown Event",
        type,
        severity:
          magnitude && magnitude >= 6.0
            ? "WARNING"
            : magnitude && magnitude >= 5.0
              ? "WATCH"
              : "ADVISORY",
        description: `Magnitude ${magnitude ?? "N/A"} earthquake - ${
          feature.properties.place ?? "Unknown location"
        }`,
        geometry: feature.geometry,
        magnitude,
        ...(observedAt ? { timestamp: observedAt, observedAt } : {}),
        source: "USGS",
      } satisfies ServerHazard;
    })
    .filter((hazard): hazard is ServerHazard => Boolean(hazard));
}

export async function fetchNASAEONET(
  sourceFetch: HazardSourceFetch = fetch,
): Promise<ServerHazard[]> {
  const response = await sourceFetch(NASA_URL);
  if (!response.ok) {
    throw new Error("NASA EONET response was unavailable");
  }

  const events = readRequiredResponseArray<NASAEvent>(
    await response.json(),
    "events",
    "NASA EONET",
  );
  return events
    .map((event): ServerHazard | null => {
      const sourceEventId = readStableSourceEventId(event.id);
      if (!sourceEventId) return null;

      const category = event.categories?.[0]?.title || "UNKNOWN";
      const hazardType = mapNASACategoryToType(category);
      const geom = event.geometry?.length ? event.geometry[event.geometry.length - 1] : undefined;
      if (!geom) return null;
      const eventId = createHazardEventId("nasa-eonet", sourceEventId);
      const observedAt = geom.date ? new Date(geom.date).toISOString() : undefined;
      return {
        schemaVersion: "1",
        eventId,
        sourceEventId,
        sourceId: "nasa-eonet",
        layerId: resolveHazardLayerId(hazardType),
        id: eventId,
        title: event.title,
        type: hazardType,
        severity: "ADVISORY",
        description: `${category} - ${event.title}`,
        geometry: {
          type: geom.type,
          coordinates: geom.coordinates,
        },
        ...(observedAt ? { timestamp: observedAt, observedAt } : {}),
        source: "NASA EONET",
      };
    })
    .filter((hazard): hazard is ServerHazard => Boolean(hazard));
}

export async function fetchGDACS(sourceFetch: HazardSourceFetch = fetch): Promise<ServerHazard[]> {
  const response = await sourceFetch(GDACS_URL);
  if (!response.ok) {
    throw new Error("GDACS response was unavailable");
  }

  const features = readRequiredResponseArray<GDACSFeature>(
    await response.json(),
    "features",
    "GDACS",
  );
  const results: ServerHazard[] = [];

  for (const feature of features) {
    const geometry = feature.geometry;
    const properties = feature.properties;
    if (!geometry?.coordinates || !properties) continue;
    const sourceEventId = readStableSourceEventId(properties.eventid);
    if (!sourceEventId) continue;

    const title = properties.name || properties.eventname || "Unknown Event";
    const description = properties.description || properties.htmldescription || "";
    const hazardType = detectHazardTypeFromTitle(
      title.concat(" ", description, " ", properties.severitydata?.severitytext || ""),
    );
    const severity =
      properties.alertlevel === "Red"
        ? "WARNING"
        : properties.alertlevel === "Orange"
          ? "WATCH"
          : "ADVISORY";
    const eventId = createHazardEventId("gdacs", sourceEventId);
    const updatedAt = properties.lastupdate || properties.last_update || undefined;

    results.push({
      schemaVersion: "1",
      eventId,
      sourceEventId,
      sourceId: "gdacs",
      layerId: resolveHazardLayerId(hazardType),
      id: eventId,
      title,
      type: hazardType,
      severity,
      description,
      geometry,
      source: "GDACS",
      ...(updatedAt ? { updatedAt } : {}),
      url: properties.url?.report || undefined,
    });
  }

  return results;
}

export interface FetchAllHazardsOptions {
  sources?: string[];
  sourceFetch?: HazardSourceFetch;
  loadSource?: HazardSourceLoader;
}

export interface FetchAllHazardsResult {
  hazards: ServerHazard[];
  sources: HazardSourceStatus[];
}

export async function fetchAllHazards(
  options: FetchAllHazardsOptions = {},
): Promise<FetchAllHazardsResult> {
  const requested = (options.sources ?? ["USGS", "NASA", "GDACS"]).map((source) =>
    source.toUpperCase(),
  );

  const sourceFetch = options.sourceFetch;
  const loadSource =
    options.loadSource ??
    (async (source, load) => {
      const hazards = await load();
      return {
        hazards,
        status: {
          id: source,
          status: hazards.length > 0 ? "success" : "empty",
          count: hazards.length,
        },
      };
    });
  const tasks: Array<[HazardSourceId, () => Promise<ServerHazard[]>]> = [];
  if (requested.includes("USGS")) tasks.push(["usgs", () => fetchUSGSEarthquakes(sourceFetch)]);
  if (requested.includes("NASA")) tasks.push(["nasa-eonet", () => fetchNASAEONET(sourceFetch)]);
  if (requested.includes("GDACS")) tasks.push(["gdacs", () => fetchGDACS(sourceFetch)]);

  const settled = await Promise.allSettled(tasks.map(([source, load]) => loadSource(source, load)));
  const hazards: ServerHazard[] = [];
  const sources: HazardSourceStatus[] = [];

  settled.forEach((result, index) => {
    const source = tasks[index]?.[0];
    if (!source) return;
    if (result.status === "fulfilled") {
      hazards.push(...result.value.hazards);
      sources.push(result.value.status);
    } else {
      sources.push({ id: source, status: "unavailable", count: 0 });
    }
  });

  return { hazards, sources };
}
