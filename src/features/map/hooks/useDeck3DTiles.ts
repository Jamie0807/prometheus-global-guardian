/**
 * 提供外部 3D Tiles 图层的管理 Hook。
 */
import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Map } from "mapbox-gl";

import { config } from "../../../config";
import { MAP_LAYER_IDS, MAP_LOD_THRESHOLDS } from "../utils/mapLayerIds";
import { createClientLogger } from "../../../utils/logger";
import { notify } from "../../../utils/notifications";
import type { MapViewMode } from "../state/MapStateContext";

const logger = createClientLogger("deck-3d-tiles");

function addBuildingExtrusionLayer(map: Map): boolean {
  try {
    if (map.getLayer(MAP_LAYER_IDS.buildings)) return true;
    map.addLayer(
      {
        id: MAP_LAYER_IDS.buildings,
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: MAP_LOD_THRESHOLDS.buildingsMinZoom,
        layout: { visibility: "none" },
        paint: {
          "fill-extrusion-color": "#8ab8cf",
          "fill-extrusion-height": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            14.5,
            ["get", "height"],
          ],
          "fill-extrusion-base": [
            "interpolate",
            ["linear"],
            ["zoom"],
            14,
            0,
            14.5,
            ["get", "min_height"],
          ],
          "fill-extrusion-opacity": 0.58,
        },
      },
      "waterway-label",
    );
    return true;
  } catch {
    logger.warn("fill_extrusion_loading_failed");
    return false;
  }
}

function removeBuildingExtrusionLayer(map: Map): void {
  try {
    if (!map.getLayer(MAP_LAYER_IDS.buildings)) return;
    map.removeLayer(MAP_LAYER_IDS.buildings);
  } catch {
    // A style reload or Map.remove() can invalidate the style before hook cleanup runs.
  }
}

export function useDeck3DTiles(
  mapRef: MutableRefObject<Map | null>,
  mapRevision: number,
  viewMode: MapViewMode,
  applyLod: (zoom: number) => void,
) {
  const hasNotifiedTilesFailureRef = useRef(false);
  const applyLodRef = useRef(applyLod);
  applyLodRef.current = applyLod;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;
    if (viewMode !== "3d") {
      removeBuildingExtrusionLayer(map);
      return;
    }

    // Mapbox Globe 不支持 deck.gl 的非 Mercator MapboxOverlay，统一使用原生建筑挤出层。
    const extrusionAdded = addBuildingExtrusionLayer(map);
    const hasExternalTiles = config.tiles3d.enabled && Boolean(config.tiles3d.url);
    const notifyGlobeFallback = () => {
      if (
        !hasExternalTiles ||
        map.getZoom() < MAP_LOD_THRESHOLDS.buildingsMinZoom ||
        hasNotifiedTilesFailureRef.current
      ) {
        return;
      }
      hasNotifiedTilesFailureRef.current = true;
      logger.warn("external_tiles_globe_projection_unsupported");
      notify.warning(
        "3D 瓦片暂不可用",
        extrusionAdded
          ? "当前 Globe 投影不支持外部 3D Tiles，已改用简化建筑模型。"
          : "当前 Globe 投影不支持外部 3D Tiles，灾害地图仍可正常使用。",
      );
    };
    const onZoomEnd = () => {
      applyLodRef.current(map.getZoom());
      notifyGlobeFallback();
    };

    map.on("zoomend", onZoomEnd);
    applyLodRef.current(map.getZoom());
    notifyGlobeFallback();
    return () => {
      try {
        map.off("zoomend", onZoomEnd);
      } catch {
        // Map.remove() may have already cleared the event registry.
      }
      removeBuildingExtrusionLayer(map);
    };
  }, [mapRef, mapRevision, viewMode]);
}
