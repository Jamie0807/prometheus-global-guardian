import { useMapState } from "./state/MapStateContext";
import { useDeck3DTiles } from "./hooks/useDeck3DTiles";
import { useHazardHeatmap } from "./hooks/useHazardHeatmap";
import { useHazardLodLayers } from "./hooks/useHazardLodLayers";
import { useHazardMarkers } from "./hooks/useHazardMarkers";
import { useMapboxInstance } from "./hooks/useMapboxInstance";

const MapView = () => {
  const { filter, mapStyle, hazards } = useMapState();
  const { containerRef, mapRef, mapRevision } = useMapboxInstance(mapStyle);
  const { showHeatmap, toggleHeatmap } = useHazardHeatmap(mapRef, hazards, mapRevision);
  const { setVisible } = useHazardMarkers(mapRef, hazards, filter, showHeatmap, mapRevision);
  useDeck3DTiles(mapRef, mapRevision);
  useHazardLodLayers(mapRef, hazards, mapRevision, showHeatmap, setVisible);

  return (
    <>
      <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />
      <div className="heatmap-toggle">
        <button
          type="button"
          onClick={toggleHeatmap}
          className={`toggle-button ${showHeatmap ? "active" : ""}`}
          title={showHeatmap ? "显示标记" : "显示热力图"}
        >
          <span>{showHeatmap ? "标记" : "热力图"}</span>
        </button>
      </div>
    </>
  );
};

export default MapView;
