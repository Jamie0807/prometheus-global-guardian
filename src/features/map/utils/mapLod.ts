import { MAP_LOD_THRESHOLDS } from "./mapLayerIds";

export interface MapLodVisibility {
  readonly showClusters: boolean;
  readonly showMarkers: boolean;
  readonly showBuildings: boolean;
}

export function getMapLodVisibility(zoom: number, showHeatmap: boolean): MapLodVisibility {
  if (showHeatmap) {
    return { showClusters: false, showMarkers: false, showBuildings: false };
  }

  return {
    showClusters: zoom < MAP_LOD_THRESHOLDS.clusterMaxZoom,
    showMarkers: zoom >= MAP_LOD_THRESHOLDS.clusterMaxZoom,
    showBuildings: zoom >= MAP_LOD_THRESHOLDS.buildingsMinZoom,
  };
}
