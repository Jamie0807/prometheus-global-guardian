import { createClientLogger } from "../utils/logger";

const logger = createClientLogger("config");

function validateEnv() {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

  // 缺少 VITE_MAPBOX_TOKEN 时记录警告并使用下面的演示 token。
  if (!mapboxToken) {
    logger.warn("mapbox_token_missing");
  }

  return {
    VITE_MAPBOX_TOKEN:
      mapboxToken ||
      "pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNrZGVtbzEyMzBhMWYyeW81cjBzZGZoZmYifQ.demo-token",
  };
}

export const env = validateEnv();

export const config = {
  mapbox: {
    token: env.VITE_MAPBOX_TOKEN,
    defaultStyle: "dark-v11",
    defaultCenter: [0, 20] as [number, number],
    defaultZoom: 1.5,
  },
  apis: {
    usgs: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
    nasa: "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=300",
    gdacs: "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH",
  },
  ui: {
    refreshInterval: 300000, // 5 minutes
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },
  // 外部 3D Tiles 数据源
  // 设置后优先使用外部精细建筑模型，空则回退到 fill-extrusion 模式
  tiles3d: {
    // 由 VITE_3D_TILES_URL 配置的 3D Tiles 服务地址
    url: import.meta.env.VITE_3D_TILES_URL || "",
    // Cesium ion 认证 token（访问 Cesium ion 资产时需要）
    cesiumIonToken: import.meta.env.VITE_CESIUM_ION_TOKEN || "",
    // 是否启用 3D Tiles 模式，未配置 URL 时自动回退到 fill-extrusion
    enabled: !!import.meta.env.VITE_3D_TILES_URL,
  },
};
