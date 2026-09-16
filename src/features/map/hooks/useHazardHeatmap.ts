/**
 * 提供地图灾害热力图图层的管理 Hook。
 */
import { useCallback, useEffect, useState } from "react";
import type { MutableRefObject } from "react";
import type { GeoJSONSource, Map } from "mapbox-gl";

import type { Hazard } from "../../../types";
import { createHeatmapFeatureCollection } from "../utils/hazardGeojson";
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from "../utils/mapLayerIds";

export function useHazardHeatmap(
  mapRef: MutableRefObject<Map | null>,
  hazards: readonly Hazard[],
  mapRevision: number,
) {
  const [showHeatmap, setShowHeatmap] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0 || map.getSource(MAP_SOURCE_IDS.heatmap)) return;
    // 每个地图样式保留一个 GeoJSON 数据源和热力图图层；后续更新仅替换要素数据，
    // 避免刷新时重建 WebGL 图层。
    map.addSource(MAP_SOURCE_IDS.heatmap, {
      type: "geojson",
      data: createHeatmapFeatureCollection([]),
    });
    map.addLayer({
      id: MAP_LAYER_IDS.heatmap,
      type: "heatmap",
      source: MAP_SOURCE_IDS.heatmap,
      maxzoom: 15,
      paint: {
        "heatmap-weight": ["interpolate", ["linear"], ["get", "magnitude"], 0, 0, 6, 1],
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(33,102,172,0)",
          0.2,
          "rgb(103,169,207)",
          0.4,
          "rgb(209,229,240)",
          0.6,
          "rgb(253,219,199)",
          0.8,
          "rgb(239,138,98)",
          1,
          "rgb(178,24,43)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 20],
        "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 1, 15, 0],
      },
    });
  }, [mapRef, mapRevision]);
  useEffect(() => {
    const source = mapRef.current?.getSource(MAP_SOURCE_IDS.heatmap) as GeoJSONSource | undefined;
    // setData 会更新热力图输入，而不改变 paint 或 layout 设置。
    source?.setData(createHeatmapFeatureCollection(hazards));
  }, [hazards, mapRef, mapRevision]);
  useEffect(() => {
    const map = mapRef.current;
    if (map?.getLayer(MAP_LAYER_IDS.heatmap))
      map.setLayoutProperty(MAP_LAYER_IDS.heatmap, "visibility", showHeatmap ? "visible" : "none");
  }, [mapRef, mapRevision, showHeatmap]);
  return { showHeatmap, toggleHeatmap: useCallback(() => setShowHeatmap((value) => !value), []) };
}
