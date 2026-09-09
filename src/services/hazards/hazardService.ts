import type { ActiveHazard, Hazard, HazardFeedResponse, HazardType } from "../../types";
import { requestJson } from "../http/httpClient";
import {
  adaptGDACSResponse,
  adaptNASAResponse,
  adaptUSGSResponse,
  detectHazardTypeFromTitle,
  mapNASACategoryToType,
} from "./hazardAdapters";
import { authorize, authFetch, getAccessToken } from "../auth/authService";

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson";
const NASA_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300";
const GDACS_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH";

export {
  adaptGDACSResponse,
  adaptNASAResponse,
  adaptUSGSResponse,
  detectHazardTypeFromTitle,
  mapNASACategoryToType,
};

export async function fetchHazardFeed(filter?: string): Promise<HazardFeedResponse> {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL") params.set("type", filter);
  const query = params.toString();
  return requestJson<HazardFeedResponse>(`/api/hazards${query ? `?${query}` : ""}`);
}

export async function fetchUSGSEarthquakes(): Promise<Hazard[]> {
  try {
    return adaptUSGSResponse(await requestJson<unknown>(USGS_URL));
  } catch (error: unknown) {
    console.error("USGS fetch error:", error);
    return [];
  }
}

export async function fetchNASAEONET(): Promise<Hazard[]> {
  try {
    return adaptNASAResponse(await requestJson<unknown>(NASA_URL));
  } catch (error: unknown) {
    console.error("NASA EONET fetch error:", error);
    return [];
  }
}

export async function fetchGDACS(): Promise<Hazard[]> {
  try {
    return adaptGDACSResponse(await requestJson<unknown>(GDACS_URL));
  } catch (error: unknown) {
    console.error("GDACS fetch error:", error);
    return [];
  }
}

export async function fetchHazardTypes(): Promise<HazardType[]> {
  try {
    if (!getAccessToken()) await authorize();
    return await responseJson<HazardType[]>(await authFetch("/api/hazards/types"));
  } catch (error: unknown) {
    console.error("Error fetching hazard types:", error);
    return [];
  }
}

export async function fetchHazardsActive(type?: string): Promise<ActiveHazard[]> {
  try {
    if (!getAccessToken()) await authorize();
    const path =
      type && type !== "ALL"
        ? `/api/hazards/active/category/${encodeURIComponent(type)}`
        : "/api/hazards/active";
    return await responseJson<ActiveHazard[]>(await authFetch(path));
  } catch (error: unknown) {
    console.error("Error fetching active hazards:", error);
    return [];
  }
}

export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]> {
  try {
    if (!getAccessToken()) await authorize();
    return await responseJson<ActiveHazard[]>(
      await authFetch(`/api/hazards/active/category/${encodeURIComponent(categoryId)}`),
    );
  } catch (error: unknown) {
    console.error(`Error fetching active hazards for category ${categoryId}:`, error);
    return [];
  }
}

async function responseJson<T>(response: Response | undefined): Promise<T> {
  if (!response || !response.ok) {
    throw new Error("DisasterAware API request failed");
  }
  return (await response.json()) as T;
}
