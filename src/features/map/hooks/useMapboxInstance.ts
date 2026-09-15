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
    // Mapbox Map owns a WebGL context. Keep this effect mount-only so a style
    // change does not repeatedly allocate and destroy GPU resources.
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
      // remove() detaches listeners and releases the WebGL context on unmount.
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || initialStyleRef.current === mapStyle) return;

    // Reuse the existing WebGL map and let dependent layer hooks rebuild after style.load.
    map.setStyle(`mapbox://styles/mapbox/${mapStyle}`);
    map.once("style.load", () => setMapRevision((revision) => revision + 1));
  }, [mapStyle]);

  return { containerRef, mapRef, mapRevision };
}
