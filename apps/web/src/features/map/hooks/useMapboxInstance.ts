/**
 * 提供 Mapbox 地图实例的创建与生命周期管理 Hook。
 */
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import { config } from "../../../config";

function applyOrbitalMapAppearance(map: mapboxgl.Map): void {
  try {
    map.setFog({
      color: "rgb(18, 35, 58)",
      "high-color": "rgb(45, 112, 156)",
      "horizon-blend": 0.08,
      "space-color": "rgb(5, 9, 22)",
      "star-intensity": 0.45,
    });
  } catch {
    // Keep the interactive map alive even if a custom style does not support fog.
  }

  try {
    const layers = map.getStyle()?.layers ?? [];
    layers.forEach((layer) => {
      if (layer.type !== "symbol" || !/(country|state|place|settlement|admin)/i.test(layer.id))
        return;
      const color = /country/i.test(layer.id) ? "#bfd2e5" : "#9eb5cd";
      map.setPaintProperty(layer.id, "text-color", color);
      map.setPaintProperty(layer.id, "text-halo-color", "#071222");
      map.setPaintProperty(layer.id, "text-halo-width", 1.1);
      map.setPaintProperty(layer.id, "text-halo-blur", 0.35);
      if (/(place|settlement)/i.test(layer.id)) {
        map.setPaintProperty(layer.id, "text-opacity", 0.78);
      }
    });
  } catch {
    // Custom or partial Mapbox styles may not expose editable label layers.
  }
}

export interface MapboxInstanceResult {
  readonly containerRef: React.RefObject<HTMLDivElement | null>;
  readonly mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  readonly mapRevision: number;
}

export function useMapboxInstance(mapStyle: string): MapboxInstanceResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initialStyleRef = useRef(mapStyle);
  const [mapRevision, setMapRevision] = useState(0);

  useEffect(() => {
    // Mapbox Map 持有 WebGL 上下文。此 effect 仅在挂载时执行，避免样式变更时
    // 反复分配和销毁 GPU 资源。
    mapboxgl.accessToken = config.mapbox.token;
    const map = new mapboxgl.Map({
      container: containerRef.current!,
      style: `mapbox://styles/mapbox/${initialStyleRef.current}`,
      projection: "mercator",
      center: config.mapbox.defaultCenter,
      zoom: config.mapbox.defaultZoom,
      pitch: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      applyOrbitalMapAppearance(map);
      setMapRevision((revision) => revision + 1);
    });

    return () => {
      // 卸载时，remove() 会移除监听器并释放 WebGL 上下文。
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || initialStyleRef.current === mapStyle) return;

    // 复用现有 WebGL 地图，并让依赖图层的 Hook 在 style.load 后重建。
    map.setStyle(`mapbox://styles/mapbox/${mapStyle}`);
    map.once("style.load", () => {
      applyOrbitalMapAppearance(map);
      setMapRevision((revision) => revision + 1);
    });
  }, [mapStyle]);

  return { containerRef, mapRef, mapRevision };
}
