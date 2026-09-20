/**
 * 提供地图灾害分层细节图层的管理 Hook。
 */
import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";
import type { GeoJSONSource, Map, MapMouseEvent } from "mapbox-gl";

import type { Hazard } from "../../../types";
import type { MapViewMode } from "../state/MapStateContext";
import { createLodFeatureCollection } from "../utils/hazardGeojson";
import {
  MAP_LAYER_IDS,
  MAP_LOD_LAYER_IDS,
  MAP_LOD_THRESHOLDS,
  MAP_SOURCE_IDS,
} from "../utils/mapLayerIds";
import { getMapLodVisibility } from "../utils/mapLod";
import { createHazardPopupContent } from "../utils/hazardPopupContent";

export function useHazardLodLayers(
  mapRef: MutableRefObject<Map | null>,
  hazards: readonly Hazard[],
  mapRevision: number,
  showHeatmap: boolean,
  viewMode: MapViewMode,
  setMarkerVisibility: (visible: boolean) => void,
) {
  const applyLod = useCallback(
    (zoom: number) => {
      const map = mapRef.current;
      if (!map) return;
      // 低缩放级别下 Mapbox 渲染聚合 GeoJSON；独立 DOM 标记和建筑物保持隐藏，
      // 直至视口内可见要素数量减少。
      const visibility = getMapLodVisibility(zoom, showHeatmap);
      MAP_LOD_LAYER_IDS.forEach((id) => {
        if (map.getLayer(id))
          map.setLayoutProperty(id, "visibility", visibility.showClusters ? "visible" : "none");
      });
      const buildingLayer = map.getLayer(MAP_LAYER_IDS.externalBuildings)
        ? MAP_LAYER_IDS.externalBuildings
        : map.getLayer(MAP_LAYER_IDS.buildings)
          ? MAP_LAYER_IDS.buildings
          : null;
      if (buildingLayer)
        map.setLayoutProperty(
          buildingLayer,
          "visibility",
          visibility.showBuildings && viewMode === "3d" ? "visible" : "none",
        );
      setMarkerVisibility(visibility.showMarkers);
    },
    [mapRef, setMarkerVisibility, showHeatmap, viewMode],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0 || map.getSource(MAP_SOURCE_IDS.lod)) return;
    // 每个已加载地图样式仅添加一次此 GPU 支持的数据源。下方的数据更新调用
    // setData，而不在每次灾害刷新时重建图层。
    map.addSource(MAP_SOURCE_IDS.lod, {
      type: "geojson",
      data: createLodFeatureCollection([]),
      cluster: true,
      clusterMaxZoom: MAP_LOD_THRESHOLDS.clusterMaxZoom,
      clusterRadius: 50,
    });
    map.addLayer({
      id: MAP_LAYER_IDS.clusters,
      type: "circle",
      source: MAP_SOURCE_IDS.lod,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": ["step", ["get", "point_count"], "#3988ff", 20, "#f4a63a", 50, "#f15b69"],
        "circle-radius": ["step", ["get", "point_count"], 16, 20, 24, 50, 32],
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "rgba(220,242,255,0.94)",
        "circle-opacity": 0.82,
        "circle-blur": 0.04,
      },
    });
    map.addLayer({
      id: MAP_LAYER_IDS.clusterCount,
      type: "symbol",
      source: MAP_SOURCE_IDS.lod,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#fff" },
    });
    map.addLayer({
      id: MAP_LAYER_IDS.unclustered,
      type: "circle",
      source: MAP_SOURCE_IDS.lod,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["coalesce", ["get", "color"], "#888888"],
        "circle-radius": 5,
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#e8f5ff",
        "circle-opacity": 0.96,
      },
    });
  }, [mapRef, mapRevision]);

  useEffect(() => {
    const source = mapRef.current?.getSource(MAP_SOURCE_IDS.lod) as GeoJSONSource | undefined;
    // 更新数据源可保持图层及其聚合配置不变。
    source?.setData(createLodFeatureCollection(hazards));
  }, [hazards, mapRef, mapRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;
    const onZoom = () => applyLod(map.getZoom());
    map.on("zoom", onZoom);
    onZoom();
    return () => {
      // 组件保持挂载时地图样式可能被替换；移除监听器，避免失效地图保留此闭包。
      try {
        map.off("zoom", onZoom);
      } catch {
        // Mapbox may already have disposed the event registry during map.remove().
      }
    };
  }, [applyLod, mapRef, mapRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (
      !map ||
      mapRevision === 0 ||
      showHeatmap ||
      !map.getSource(MAP_SOURCE_IDS.lod) ||
      !map.getLayer(MAP_LAYER_IDS.clusters) ||
      !map.getLayer(MAP_LAYER_IDS.unclustered)
    ) {
      return;
    }
    let active = true;

    const onClusterClick = (event: MapMouseEvent) => {
      const feature = event.features?.[0]?.toJSON();
      const clusterId = feature?.properties?.cluster_id;
      const geometry = feature?.geometry;
      if (
        !Number.isSafeInteger(clusterId) ||
        geometry?.type !== "Point" ||
        !Number.isFinite(geometry.coordinates[0]) ||
        !Number.isFinite(geometry.coordinates[1])
      ) {
        return;
      }
      const [longitude, latitude] = geometry.coordinates;
      const source = map.getSource(MAP_SOURCE_IDS.lod) as GeoJSONSource | undefined;
      source?.getClusterExpansionZoom(clusterId, (error, zoom) => {
        if (
          error ||
          typeof zoom !== "number" ||
          !Number.isFinite(zoom) ||
          !active ||
          mapRef.current !== map ||
          !map.getSource(MAP_SOURCE_IDS.lod) ||
          !map.getLayer(MAP_LAYER_IDS.clusters)
        ) {
          return;
        }
        map.easeTo({ center: [longitude, latitude], zoom });
      });
    };

    const onUnclusteredClick = (event: MapMouseEvent) => {
      const id = event.features?.[0]?.toJSON().properties?.id;
      if (typeof id !== "string") return;
      const hazard = hazards.find((candidate) => candidate.id === id);
      if (!hazard) return;
      new mapboxgl.Popup()
        .setLngLat(event.lngLat)
        .setDOMContent(createHazardPopupContent(hazard))
        .addTo(map);
    };

    map.on("click", MAP_LAYER_IDS.clusters, onClusterClick);
    map.on("click", MAP_LAYER_IDS.unclustered, onUnclusteredClick);
    return () => {
      active = false;
      try {
        map.off("click", MAP_LAYER_IDS.clusters, onClusterClick);
      } catch {
        // Mapbox may already have disposed the event registry during map.remove().
      }
      try {
        map.off("click", MAP_LAYER_IDS.unclustered, onUnclusteredClick);
      } catch {
        // Mapbox may already have disposed the event registry during map.remove().
      }
    };
  }, [hazards, mapRef, mapRevision, showHeatmap]);

  return { applyLod };
}
