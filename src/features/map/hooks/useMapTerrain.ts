/** 根据地图视图模式管理 Globe 相机与轻量 DEM 地形。 */
import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Map, MapEvent } from "mapbox-gl";

import type { MapViewMode } from "../state/MapStateContext";
import { notify } from "../../../utils/notifications";

export const MAP_TERRAIN_SOURCE_ID = "orbital-terrain-dem";
const MAP_TERRAIN_URL = "mapbox://mapbox.mapbox-terrain-dem-v1";
const THREE_D_PITCH = 42;
const CAMERA_TRANSITION_MS = 450;

function matchesTerrainSource(event: MapEvent): boolean {
  const detail = event as MapEvent & { sourceId?: unknown; error?: unknown };
  if (detail.sourceId === MAP_TERRAIN_SOURCE_ID) return true;
  if (!(detail.error instanceof Error)) return false;
  const message = detail.error.message.toLowerCase();
  return message.includes(MAP_TERRAIN_SOURCE_ID) || message.includes("mapbox-terrain-dem-v1");
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useMapTerrain(
  mapRef: MutableRefObject<Map | null>,
  mapRevision: number,
  viewMode: MapViewMode,
): void {
  const hasNotifiedTerrainFailureRef = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;

    const removeTerrainSource = () => {
      try {
        map.setTerrain(null);
      } catch {
        // Style may be in the process of unloading; map.remove() still releases it.
      }
      try {
        if (map.getSource(MAP_TERRAIN_SOURCE_ID)) map.removeSource(MAP_TERRAIN_SOURCE_ID);
      } catch {
        // A style reload can remove the source before this effect is cleaned up.
      }
    };
    const notifyTerrainFailure = () => {
      if (hasNotifiedTerrainFailureRef.current) return;
      hasNotifiedTerrainFailureRef.current = true;
      notify.warning("3D 地形暂不可用", "地图仍可正常使用，已切换为轻量 3D 视角。");
    };
    const onError = (event: MapEvent) => {
      if (viewMode !== "3d" || !matchesTerrainSource(event)) return;
      removeTerrainSource();
      notifyTerrainFailure();
    };

    map.on("error", onError);
    map.setProjection(viewMode === "3d" ? "globe" : "mercator");
    if (viewMode === "3d") {
      try {
        if (!map.getSource(MAP_TERRAIN_SOURCE_ID)) {
          map.addSource(MAP_TERRAIN_SOURCE_ID, {
            type: "raster-dem",
            url: MAP_TERRAIN_URL,
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: MAP_TERRAIN_SOURCE_ID, exaggeration: 1.8 });
      } catch {
        removeTerrainSource();
        notifyTerrainFailure();
      }
    } else {
      removeTerrainSource();
    }

    const pitch = viewMode === "3d" ? THREE_D_PITCH : 0;
    if (viewMode === "3d" || map.getPitch() !== 0) {
      if (prefersReducedMotion()) map.jumpTo({ pitch });
      else map.easeTo({ pitch, duration: CAMERA_TRANSITION_MS });
    }

    return () => {
      try {
        map.off("error", onError);
      } catch {
        // Map.remove() may have already cleared its event registry.
      }
      let hasTerrainSource = false;
      try {
        hasTerrainSource = Boolean(map.getSource(MAP_TERRAIN_SOURCE_ID));
      } catch {
        // Mapbox may have removed the style before dependent hooks clean up.
      }
      if (viewMode === "3d" || hasTerrainSource) removeTerrainSource();
    };
  }, [mapRef, mapRevision, viewMode]);
}
