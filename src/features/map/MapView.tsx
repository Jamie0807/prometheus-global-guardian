/**
 * 提供交互式灾害地图视图组件。
 */
import { useMapState } from "./state/MapStateContext";
import { useDeck3DTiles } from "./hooks/useDeck3DTiles";
import { useHazardHeatmap } from "./hooks/useHazardHeatmap";
import { useHazardLodLayers } from "./hooks/useHazardLodLayers";
import { useHazardMarkers } from "./hooks/useHazardMarkers";
import { useMapboxInstance } from "./hooks/useMapboxInstance";

const MapView = () => {
  const { filter, mapStyle, hazards, showHeatmap } = useMapState();
  const { containerRef, mapRef, mapRevision } = useMapboxInstance(mapStyle);
  useHazardHeatmap(mapRef, hazards, mapRevision, showHeatmap);
  const { setVisible } = useHazardMarkers(mapRef, hazards, filter, showHeatmap, mapRevision);
  useDeck3DTiles(mapRef, mapRevision);
  useHazardLodLayers(mapRef, hazards, mapRevision, showHeatmap, setVisible);

  return <div ref={containerRef} style={{ width: "100vw", height: "100vh" }} />;
};

export default MapView;
