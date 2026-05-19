import type { Hazard } from "../types";

interface USGSFeature {
  id: string;
  properties: {
    title?: string;
    place?: string;
    mag?: number;
    time?: number;
  };
  geometry: Hazard["geometry"];
}

interface NASAEvent {
  id: string;
  title: string;
  categories: Array<{ title?: string }>;
  geometry: Array<{
    type: string;
    coordinates: number[];
    date?: string;
  }>;
}

interface GDACSFeature {
  geometry?: Hazard["geometry"];
  properties?: {
    eventid?: string | number;
    name?: string;
    eventname?: string;
    description?: string;
    htmldescription?: string;
    alertlevel?: "Red" | "Orange" | string;
    severitydata?: {
      severitytext?: string;
    };
    url?: {
      report?: string;
    };
  };
}

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
  const t = title.toLowerCase();
  if (t.includes("earthquake")) return "EARTHQUAKE";
  if (t.includes("flood")) return "FLOOD";
  if (t.includes("cyclone") || t.includes("hurricane") || t.includes("typhoon")) return "TROPICAL_CYCLONE";
  if (t.includes("volcano")) return "VOLCANO";
  if (t.includes("drought")) return "DROUGHT";
  if (t.includes("tsunami")) return "TSUNAMI";
  if (t.includes("storm")) return "STORM";
  return "UNKNOWN";
};

export async function fetchUSGSEarthquakes(): Promise<Hazard[]> {
  try {
    const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson");
    if (!response.ok) return [];

    const data = (await response.json()) as { features?: USGSFeature[] };
    return (data.features ?? []).map((feature) => {
      const magnitude = feature.properties.mag;
      return {
        id: feature.id,
        title: feature.properties.title || feature.properties.place || "Unknown Event",
        type: "EARTHQUAKE",
        severity: magnitude && magnitude >= 6.0 ? "WARNING" : magnitude && magnitude >= 5.0 ? "WATCH" : "ADVISORY",
        description: `Magnitude ${magnitude ?? "N/A"} earthquake - ${feature.properties.place ?? "Unknown location"}`,
        geometry: feature.geometry,
        magnitude,
        timestamp: feature.properties.time ? new Date(feature.properties.time).toISOString() : undefined,
        source: "USGS",
      };
    });
  } catch (error) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

export async function fetchNASAEONET(): Promise<Hazard[]> {
  try {
    const response = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300");
    if (!response.ok) return [];

    const data = (await response.json()) as { events?: NASAEvent[] };
    return (data.events ?? [])
      .map((event) => {
        const category = event.categories[0]?.title || "UNKNOWN";
        const hazardType = mapNASACategoryToType(category);
        const geom = event.geometry?.length ? event.geometry[event.geometry.length - 1] : undefined;
        if (!geom) return null;
        return {
          id: event.id,
          title: event.title,
          type: hazardType,
          severity: "ADVISORY" as const,
          description: `${category} - ${event.title}`,
          geometry: {
            type: geom.type,
            coordinates: geom.coordinates,
          },
          timestamp: geom.date ? new Date(geom.date).toISOString() : undefined,
          source: "NASA EONET",
        } as Hazard;
      })
      .filter((hazard): hazard is Hazard => Boolean(hazard));
  } catch (error) {
    console.error("NASA EONET fetch error:", error);
    return [];
  }
}

export async function fetchGDACS(): Promise<Hazard[]> {
  try {
    const response = await fetch("https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH");
    if (!response.ok) return [];

    const geojson = (await response.json()) as { features?: GDACSFeature[] };
    const features = geojson.features ?? [];
    const results: Hazard[] = [];

    features.forEach((feature) => {
      const geometry = feature.geometry;
      const properties = feature.properties;
      if (!geometry?.coordinates || !properties) return;

      const title = properties.name || properties.eventname || "Unknown Event";
      const description = properties.description || properties.htmldescription || "";
      const hazardType = detectHazardTypeFromTitle(
        title.concat(" ", description, " ", properties.severitydata?.severitytext || "")
      );
      const severity =
        properties.alertlevel === "Red" ? "WARNING" : properties.alertlevel === "Orange" ? "WATCH" : "ADVISORY";

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
