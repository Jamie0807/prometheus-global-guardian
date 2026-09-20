/**
 * 提供地图灾害标记的创建、更新与清理 Hook。
 */
import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { HAZARD_COLORS, defaultColor } from "../../../config/hazardColors";
import type { Hazard } from "../../../types";
import { getMapLodVisibility } from "../utils/mapLod";
import { createHazardPopupContent } from "../utils/hazardPopupContent";

export function useHazardMarkers(
  mapRef: React.MutableRefObject<mapboxgl.Map | null>,
  hazards: readonly Hazard[],
  filter: string,
  hidden: boolean,
  mapRevision: number,
) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clearMarkers = useCallback(() => {
    // 标记是 DOM 节点而非 WebGL 图层；应用新筛选条件或灾害集合前移除旧节点，
    // 以避免重复的事件目标。
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  }, []);

  const setVisible = useCallback((visible: boolean) => {
    markersRef.current.forEach((marker) => {
      marker.getElement().style.display = visible ? "block" : "none";
    });
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapRevision === 0) return;
    clearMarkers();
    // LOD 图层负责低缩放级别的呈现。仅为有效坐标创建标记，
    // 其他图层激活时，标记初始保持隐藏。
    const selected =
      filter === "ALL" ? hazards : hazards.filter((hazard) => hazard.type === filter);
    const showMarkers = getMapLodVisibility(map.getZoom(), hidden).showMarkers;
    selected.forEach((hazard) => {
      const [longitude, latitude] = hazard.geometry.coordinates;
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
      const element = document.createElement("div");
      element.className = "disaster-marker";
      Object.assign(element.style, {
        width: "18px",
        height: "18px",
        borderRadius: "50%",
        backgroundColor: HAZARD_COLORS[hazard.type] ?? defaultColor,
        border: "2px solid white",
        display: showMarkers ? "block" : "none",
      });
      const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(
        createHazardPopupContent(hazard),
      );
      markersRef.current.push(
        new mapboxgl.Marker(element).setLngLat([longitude, latitude]).setPopup(popup).addTo(map),
      );
    });
    return clearMarkers;
  }, [clearMarkers, filter, hazards, hidden, mapRef, mapRevision]);

  return { clearMarkers, setVisible };
}
