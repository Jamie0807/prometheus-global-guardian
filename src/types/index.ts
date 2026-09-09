export interface Hazard {
  id: string;
  title: string;
  type: string;
  severity?: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  description: string;
  source: string;
  magnitude?: number;
  timestamp?: string;
  url?: string;
}

export interface HazardType {
  type_id: string;
  type_name: string;
  type_icon?: string;
}

export interface ActiveHazard {
  app_ID: number;
  app_IDs: string;
  autoexpire: string;
  category_ID: string;
  charter_Uri: string;
  comment_Text: string;
  create_Date: string;
  creator: string;
  end_Date: string;
  glide_Uri: string;
  hazard_ID: number;
  hazard_Name: string;
  last_Update: string;
  latitude: number;
  longitude: number;
  master_Incident_ID: string;
  message_ID: string;
  org_ID: number;
  severity_ID: string;
  snc_url: string;
  start_Date: string;
  status: string;
  type_ID: string;
  update_Date: string;
  update_User: string | null;
  product_total: string;
  uuid: string;
  in_Dashboard: string;
  areabrief_url: string | null;
  description: string;
  roles: unknown[];
}

export interface DisasterAwareAuthResponse {
  accessToken: string;
  refreshToken: string;
}

export type HazardSourceId = "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";
export type HazardSourceState = "success" | "empty" | "unavailable" | "fallback" | "stale";

export interface HazardSourceStatus {
  id: HazardSourceId;
  status: HazardSourceState;
  count: number;
  fetchedAt?: string;
  message?: string;
}

export interface HazardFeedResponse {
  hazards: Hazard[];
  meta: {
    primary: HazardSourceId;
    fallbackUsed: boolean;
    stale: boolean;
    generatedAt: string;
    sources: HazardSourceStatus[];
  };
}

export interface MapViewProps {
  filter: string;
  mapStyle: string;
  onDataUpdate: (data: Hazard[]) => void;
  onRefreshReady?: (fn: () => void) => void;
}

export interface SaveReportPayload {
  reportName: string;
  organization: string;
  email: string;
  notes: string;
  disasters: Hazard[];
  filter: string;
}

export const HAZARD_TYPES = {
  DROUGHT: "DROUGHT",
  EARTHQUAKE: "EARTHQUAKE",
  FLOOD: "FLOOD",
  VOLCANO: "VOLCANO",
  WILDFIRE: "WILDFIRE",
  TROPICAL_CYCLONE: "TROPICAL_CYCLONE",
  TSUNAMI: "TSUNAMI",
  STORM: "STORM",
  LANDSLIDE: "LANDSLIDE",
  UNKNOWN: "UNKNOWN",
} as const;

export const HAZARD_CATEGORIES = {
  EVENT: "EVENT",
  NATURAL: "NATURAL",
  WEATHER: "WEATHER",
  GEOLOGICAL: "GEOLOGICAL",
  BIOLOGICAL: "BIOLOGICAL",
  TECHNOLOGICAL: "TECHNOLOGICAL",
  ENVIRONMENTAL: "ENVIRONMENTAL",
} as const;

export type HazardTypeKeys = keyof typeof HAZARD_TYPES;
export type HazardCategoryKeys = keyof typeof HAZARD_CATEGORIES;
