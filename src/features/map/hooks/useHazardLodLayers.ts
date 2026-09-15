import { useCallback, useEffect } from "react";
import type { MutableRefObject } from "react";
import mapboxgl from "mapbox-gl";
import type { GeoJSONSource, Map, MapMouseEvent } from "mapbox-gl";

import type { Hazard } from "../../../types";
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
  setMarkerVisibility: (visible: boolean) => void,
) {
  const applyLod = useCallback(
    (zoom: number) => {
      const map = mapRef.current;
      if (!map) return;
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
          visibility.showBuildings ? "visible" : "none",
        );
      setMarkerVisibility(visibility.showMarkers);
    },
    [mapRef, setMarkerVisibility, showHeatmap],
  );

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0 || map.getSource(MAP_SOURCE_IDS.lod)) return;
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
        "circle-color": ["step", ["get", "point_count"], "#3b82f6", 20, "#f59e0b", 50, "#ef4444"],
        "circle-radius": ["step", ["get", "point_count"], 18, 20, 28, 50, 38],
        "circle-stroke-width": 2,
        "circle-stroke-color": "rgba(255,255,255,0.8)",
        "circle-opacity": 0.85,
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
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.9,
      },
    });
  }, [mapRef, mapRevision]);

  useEffect(() => {
    const source = mapRef.current?.getSource(MAP_SOURCE_IDS.lod) as GeoJSONSource | undefined;
    source?.setData(createLodFeatureCollection(hazards));
  }, [hazards, mapRef, mapRevision]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;
    const onZoom = () => applyLod(map.getZoom());
    map.on("zoom", onZoom);
    onZoom();
    return () => {
      map.off("zoom", onZoom);
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
      const feature = event.features?.[0];
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
      const id = event.features?.[0]?.properties?.id;
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
      map.off("click", MAP_LAYER_IDS.clusters, onClusterClick);
      map.off("click", MAP_LAYER_IDS.unclustered, onUnclusteredClick);
    };
  }, [hazards, mapRef, mapRevision, showHeatmap]);

  return { applyLod };
}
