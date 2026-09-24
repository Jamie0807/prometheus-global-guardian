/**
 * 提供灾害数据获取与服务调用逻辑。
 */
import type { ActiveHazard, Hazard, HazardFeedResponse, HazardType } from "../../types";
import { requestJson } from "../http/httpClient";
import {
  adaptGDACSResponse,
  adaptNASAResponse,
  adaptUSGSResponse,
  detectHazardTypeFromTitle,
  mapNASACategoryToType,
} from "./hazardAdapters";
import { parseActiveHazards, parseHazardTypes } from "./contracts/disasterAware";
import { parseHazardFeed } from "./contracts/hazardFeed";
import { authorize, authFetch, getAccessToken } from "../auth/authService";
import { ServiceError } from "../http/serviceError";
import { createClientLogger } from "../../utils/logger";

const logger = createClientLogger("hazard-service");

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

export async function fetchHazardFeed(
  filter?: string,
  signal?: AbortSignal,
): Promise<HazardFeedResponse> {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL") params.set("type", filter);
  const query = params.toString();
  const url = `/api/hazards${query ? `?${query}` : ""}`;
  return parseHazardFeed(await requestJson(url, { signal }));
}

export async function fetchUSGSEarthquakes(): Promise<Hazard[]> {
  try {
    return adaptUSGSResponse(await requestJson(USGS_URL));
  } catch {
    logger.warn("usgs_fetch_failed");
    return [];
  }
}

export async function fetchNASAEONET(): Promise<Hazard[]> {
  try {
    return adaptNASAResponse(await requestJson(NASA_URL));
  } catch {
    logger.warn("nasa_eonet_fetch_failed");
    return [];
  }
}

export async function fetchGDACS(): Promise<Hazard[]> {
  try {
    return adaptGDACSResponse(await requestJson(GDACS_URL));
  } catch {
    logger.warn("gdacs_fetch_failed");
    return [];
  }
}

export async function fetchHazardTypes(): Promise<HazardType[]> {
  try {
    if (!getAccessToken()) await authorize();
    return parseHazardTypes(await readDisasterAwareJson(await authFetch("/api/hazards/types")));
  } catch {
    logger.warn("hazard_types_fetch_failed");
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
    return parseActiveHazards(await readDisasterAwareJson(await authFetch(path)));
  } catch {
    logger.warn("active_hazards_fetch_failed");
    return [];
  }
}

export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]> {
  try {
    if (!getAccessToken()) await authorize();
    return parseActiveHazards(
      await readDisasterAwareJson(
        await authFetch(`/api/hazards/active/category/${encodeURIComponent(categoryId)}`),
      ),
    );
  } catch {
    logger.warn("active_hazards_category_fetch_failed", { categoryId });
    return [];
  }
}

async function readDisasterAwareJson(response: Response | undefined): Promise<unknown> {
  if (!response || !response.ok) {
    throw new ServiceError("DisasterAware API request failed", "http", {
      status: response?.status,
    });
  }
  const value: unknown = await response.json();
  return value;
}
