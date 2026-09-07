import { useEffect, useRef } from "react";

import type { MapViewProps } from "../../types";
import { useDeck3DTiles } from "./hooks/useDeck3DTiles";
import { useHazardData } from "./hooks/useHazardData";
import { useHazardHeatmap } from "./hooks/useHazardHeatmap";
import { useHazardLodLayers } from "./hooks/useHazardLodLayers";
import { useHazardMarkers } from "./hooks/useHazardMarkers";
import { useMapboxInstance } from "./hooks/useMapboxInstance";

const MapView = ({ filter, mapStyle, onDataUpdate, onRefreshReady }: MapViewProps) => {
  const { containerRef, mapRef, mapRevision } = useMapboxInstance(mapStyle);
  const { disasters, refresh } = useHazardData(filter, onDataUpdate);
  const { showHeatmap, toggleHeatmap } = useHazardHeatmap(mapRef, disasters, mapRevision);
  const { setVisible } = useHazardMarkers(mapRef, disasters, filter, showHeatmap, mapRevision);
  useDeck3DTiles(mapRef, mapRevision);
  useHazardLodLayers(mapRef, disasters, mapRevision, showHeatmap, setVisible);

  const hasLoadedData = useRef(false);
  useEffect(() => {
    if (mapRevision === 0 || hasLoadedData.current) return;
    hasLoadedData.current = true;
    void refresh();
  }, [mapRevision, refresh]);

  useEffect(() => {
    onRefreshReady?.(() => {
      void refresh();
    });
  }, [onRefreshReady, refresh]);

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      <div className="heatmap-toggle">
        <button
          type="button"
          onClick={toggleHeatmap}
          className={`toggle-button ${showHeatmap ? "active" : ""}`}
          title={showHeatmap ? "Show Markers" : "Show Heatmap"}
        >
          <span>{showHeatmap ? "Markers" : "Heatmap"}</span>
        </button>
      </div>
    </>
  );
};

export default MapView;
