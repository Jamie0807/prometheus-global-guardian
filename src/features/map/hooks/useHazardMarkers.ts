import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { HAZARD_COLORS, defaultColor } from "../../../config/hazardColors";
import type { Hazard } from "../../../types";
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
    // Markers are DOM nodes rather than a WebGL layer; remove old nodes before
    // reflecting a new filter or hazard set to avoid duplicate event targets.
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
    // The LOD layer renders the low-zoom representation. Markers are created only
    // for valid coordinates and are initially hidden when another layer is active.
    const selected =
      filter === "ALL" ? hazards : hazards.filter((hazard) => hazard.type === filter);
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
        display: hidden ? "none" : "block",
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
