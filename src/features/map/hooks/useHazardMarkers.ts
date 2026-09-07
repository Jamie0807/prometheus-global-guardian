import { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

import { HAZARD_COLORS, defaultColor } from "../../../config/hazardColors";
import type { Hazard } from "../../../types";

export function useHazardMarkers(
  mapRef: React.MutableRefObject<mapboxgl.Map | null>,
  hazards: readonly Hazard[],
  filter: string,
  hidden: boolean,
  mapRevision: number,
) {
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const clearMarkers = useCallback(() => {
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
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div class="popup-title">${hazard.title}</div><div class="popup-info"><strong>Type:</strong> ${hazard.type.replace(/_/g, " ")}<br><strong>Severity:</strong> ${hazard.severity}<br><strong>Description:</strong> ${hazard.description}<br><strong>Platform:</strong> Prometheus Global Guardian</div>`,
      );
      markersRef.current.push(
        new mapboxgl.Marker(element).setLngLat([longitude, latitude]).setPopup(popup).addTo(map),
      );
    });
    return clearMarkers;
  }, [clearMarkers, filter, hazards, hidden, mapRef, mapRevision]);

  return { clearMarkers, setVisible };
}
