// Multi-source hazard aggregation for the backend /api/hazards endpoint.
// Ported from src/api/hazards.ts to keep the backend response aligned with the frontend Hazard shape.
// Sources: USGS earthquakes, NASA EONET events, and GDACS disaster alerts.

import fetch from "node-fetch";

const USGS_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const NASA_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300";
const GDACS_URL =
  "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";

export function mapNASACategoryToType(category) {
  if (category.includes("Wildfires")) return "WILDFIRE";
  if (category.includes("Volcanoes")) return "VOLCANO";
  if (category.includes("Floods")) return "FLOOD";
  if (category.includes("Severe Storms")) return "STORM";
  if (category.includes("Drought")) return "DROUGHT";
  if (category.includes("Landslides")) return "LANDSLIDE";
  return "UNKNOWN";
}

export function detectHazardTypeFromTitle(title) {
  const t = title.toLowerCase();
  if (t.includes("earthquake")) return "EARTHQUAKE";
  if (t.includes("flood")) return "FLOOD";
  if (t.includes("cyclone") || t.includes("hurricane") || t.includes("typhoon"))
    return "TROPICAL_CYCLONE";
  if (t.includes("volcano")) return "VOLCANO";
  if (t.includes("drought")) return "DROUGHT";
  if (t.includes("tsunami")) return "TSUNAMI";
  if (t.includes("storm")) return "STORM";
  return "UNKNOWN";
}

export async function fetchUSGSEarthquakes() {
  try {
    const response = await fetch(USGS_URL);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.features ?? []).map((feature) => {
      const magnitude = feature.properties.mag;
      return {
        id: feature.id,
        title:
          feature.properties.title ||
          feature.properties.place ||
          "Unknown Event",
        type: "EARTHQUAKE",
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
        timestamp: feature.properties.time
          ? new Date(feature.properties.time).toISOString()
          : undefined,
        source: "USGS",
      };
    });
  } catch (error) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

export async function fetchNASAEONET() {
  try {
    const response = await fetch(NASA_URL);
    if (!response.ok) return [];

    const data = await response.json();
    return (data.events ?? [])
      .map((event) => {
        const category = event.categories[0]?.title || "UNKNOWN";
        const hazardType = mapNASACategoryToType(category);
        const geom = event.geometry?.length
          ? event.geometry[event.geometry.length - 1]
          : undefined;
        if (!geom) return null;
        return {
          id: event.id,
          title: event.title,
          type: hazardType,
          severity: "ADVISORY",
          description: `${category} - ${event.title}`,
          geometry: {
            type: geom.type,
            coordinates: geom.coordinates,
          },
          timestamp: geom.date ? new Date(geom.date).toISOString() : undefined,
          source: "NASA EONET",
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error("NASA EONET fetch error:", error);
    return [];
  }
}

export async function fetchGDACS() {
  try {
    const response = await fetch(GDACS_URL);
    if (!response.ok) return [];

    const geojson = await response.json();
    const features = geojson.features ?? [];
    const results = [];

    features.forEach((feature) => {
      const geometry = feature.geometry;
      const properties = feature.properties;
      if (!geometry?.coordinates || !properties) return;

      const title = properties.name || properties.eventname || "Unknown Event";
      const description =
        properties.description || properties.htmldescription || "";
      const hazardType = detectHazardTypeFromTitle(
        title.concat(
          " ",
          description,
          " ",
          properties.severitydata?.severitytext || ""
        )
      );
      const severity =
        properties.alertlevel === "Red"
          ? "WARNING"
          : properties.alertlevel === "Orange"
            ? "WATCH"
            : "ADVISORY";

      results.push({
        id: `gdacs-${properties.eventid || Date.now()}`,
        title,
        type: hazardType,
        severity,
        description,
        geometry,
        source: "GDACS",
        url: properties.url?.report || undefined,
      });
    });

    return results;
  } catch (error) {
    console.error("GDACS fetch error:", error);
    return [];
  }
}

/**
 * Aggregate all enabled data sources and return normalized Hazard records.
 * @param {Object} [options]
 * @param {string[]} [options.sources] Optional source filter: USGS / NASA / GDACS.
 * @returns {Promise<{ hazards: Array, meta: Object }>}
 */
export async function fetchAllHazards(options = {}) {
  const requested = (options.sources ?? ["USGS", "NASA", "GDACS"]).map((s) =>
    String(s).toUpperCase()
  );

  const tasks = [];
  if (requested.includes("USGS")) tasks.push(["USGS", fetchUSGSEarthquakes()]);
  if (requested.includes("NASA")) tasks.push(["NASA", fetchNASAEONET()]);
  if (requested.includes("GDACS")) tasks.push(["GDACS", fetchGDACS()]);

  const settled = await Promise.allSettled(tasks.map(([, p]) => p));

  const hazards = [];
  const perSource = {};
  const errors = [];

  settled.forEach((result, index) => {
    const sourceName = tasks[index][0];
    if (result.status === "fulfilled") {
      perSource[sourceName] = result.value.length;
      hazards.push(...result.value);
    } else {
      perSource[sourceName] = 0;
      errors.push({ source: sourceName, message: String(result.reason) });
    }
  });

  return {
    hazards,
    meta: {
      total: hazards.length,
      perSource,
      errors,
      generatedAt: new Date().toISOString(),
    },
  };
}
