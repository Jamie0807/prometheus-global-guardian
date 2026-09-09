import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { Tile3DLayer } from "@deck.gl/geo-layers";
import { CesiumIonLoader } from "@loaders.gl/3d-tiles";
import type { IControl, Map } from "mapbox-gl";

import { config } from "../../../config";
import { MAP_LAYER_IDS, MAP_LOD_THRESHOLDS } from "../utils/mapLayerIds";
import { createClientLogger } from "../../../utils/logger";

const logger = createClientLogger("deck-3d-tiles");

export function useDeck3DTiles(mapRef: MutableRefObject<Map | null>, mapRevision: number) {
  const overlayRef = useRef<MapboxOverlay | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;
    if (config.tiles3d.enabled && config.tiles3d.url) {
      const overlay = new MapboxOverlay({ layers: [] });
      overlayRef.current = overlay;
      map.addControl(overlay as unknown as IControl);
      const loadOptions = config.tiles3d.cesiumIonToken
        ? { "cesium-ion": { accessToken: config.tiles3d.cesiumIonToken } }
        : {};
      overlay.setProps({
        layers: [
          new Tile3DLayer({
            id: "deck-3d-tiles",
            data: config.tiles3d.url,
            loaders: [CesiumIonLoader],
            loadOptions,
            opacity: 0.9,
          }),
        ],
      });
      return () => {
        map.removeControl(overlay as unknown as IControl);
        overlayRef.current = null;
      };
    }
    if (map.getLayer(MAP_LAYER_IDS.buildings)) return;
    try {
      map.addLayer(
        {
          id: MAP_LAYER_IDS.buildings,
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: MAP_LOD_THRESHOLDS.buildingsMinZoom,
          paint: {
            "fill-extrusion-color": "#aab5c0",
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
            "fill-extrusion-opacity": 0.65,
          },
        },
        "waterway-label",
      );
    } catch {
      logger.warn("fill_extrusion_loading_failed");
    }
  }, [mapRef, mapRevision]);
}
