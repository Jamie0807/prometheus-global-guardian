/**
 * 提供 Mapbox 地图实例的创建与生命周期管理 Hook。
 */
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

import { config } from "../../../config";

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
      projection: "globe",
      center: config.mapbox.defaultCenter,
      zoom: config.mapbox.defaultZoom,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.setFog({
        color: "rgb(186, 210, 235)",
        "high-color": "rgb(36, 92, 223)",
        "horizon-blend": 0.02,
        "space-color": "rgb(11, 11, 25)",
        "star-intensity": 0.6,
      });
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
    map.once("style.load", () => setMapRevision((revision) => revision + 1));
  }, [mapStyle]);

  return { containerRef, mapRef, mapRevision };
}
