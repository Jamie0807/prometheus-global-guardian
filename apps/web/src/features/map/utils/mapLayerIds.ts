/**
 * 定义地图数据源与图层标识符常量。
 */
export const MAP_SOURCE_IDS = {
  lod: "hazards-lod",
  heatmap: "hazards-heat",
} as const;

export const MAP_LAYER_IDS = {
  clusters: "lod-clusters",
  clusterCount: "lod-cluster-count",
  unclustered: "lod-unclustered",
  heatmap: "hazards-heatmap",
  buildings: "3d-buildings",
  externalBuildings: "city-3d-model",
} as const;

export const MAP_LOD_THRESHOLDS = {
  clusterMaxZoom: 8,
  buildingsMinZoom: 14,
} as const;

export const MAP_LOD_LAYER_IDS = [
  MAP_LAYER_IDS.clusters,
  MAP_LAYER_IDS.clusterCount,
  MAP_LAYER_IDS.unclustered,
] as const;
