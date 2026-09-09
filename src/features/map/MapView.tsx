import { useEffect, useRef } from "react";

import type { HazardFeedResponse, MapViewProps } from "../../types";
import { useDeck3DTiles } from "./hooks/useDeck3DTiles";
import { useHazardData } from "./hooks/useHazardData";
import { useHazardHeatmap } from "./hooks/useHazardHeatmap";
import { useHazardLodLayers } from "./hooks/useHazardLodLayers";
import { useHazardMarkers } from "./hooks/useHazardMarkers";
import { useMapboxInstance } from "./hooks/useMapboxInstance";

const MapView = ({ filter, mapStyle, onDataUpdate, onRefreshReady }: MapViewProps) => {
  const { containerRef, mapRef, mapRevision } = useMapboxInstance(mapStyle);
  const { disasters, refresh, sourceMeta } = useHazardData(filter, onDataUpdate);
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
      {sourceMeta ? (
        <div
          role="status"
          style={{
            position: "absolute",
            top: "72px",
            left: "16px",
            zIndex: 5,
            border: "1px solid rgba(75, 85, 99, 0.5)",
            borderRadius: "8px",
            background: "rgba(31, 41, 55, 0.95)",
            color: "white",
            padding: "8px 12px",
          }}
        >
          {getSourceStatusLabel(sourceMeta)}
        </div>
      ) : null}
      {sourceMeta && disasters.length === 0 ? (
        <div
          style={{
            position: "absolute",
            top: "116px",
            left: "16px",
            zIndex: 5,
            color: "#d1d5db",
          }}
        >
          暂无可用灾害数据
        </div>
      ) : null}
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

function getSourceStatusLabel(meta: HazardFeedResponse["meta"]): string {
  if (meta.stale) {
    const earliestStaleSourceTime = meta.sources
      .filter((source) => source.status === "stale" && source.fetchedAt)
      .map((source) => Date.parse(source.fetchedAt as string))
      .filter(Number.isFinite)
      .sort((first, second) => first - second)[0];
    const lastSuccessTime = earliestStaleSourceTime
      ? new Date(earliestStaleSourceTime).toLocaleString("zh-CN")
      : undefined;

    return lastSuccessTime ? `数据可能已过期 · 最近成功时间：${lastSuccessTime}` : "数据可能已过期";
  }

  const primaryStatus = meta.sources.find((source) => source.id === meta.primary)?.status;
  if (primaryStatus === "empty" && meta.fallbackUsed) return "暂无数据 · 已显示备用数据";
  if (primaryStatus === "unavailable" && meta.fallbackUsed) return "暂不可用 · 已显示备用数据";
  return "已更新";
}

export default MapView;
