/**
 * 提供地图状态上下文与访问 Hook。
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PropsWithChildren } from "react";

import { useHazardData } from "../hooks/useHazardData";
import type { Hazard, HazardFeedResponse } from "../../../types";
import { notify } from "../../../utils/notifications";

export type MapStateValue = {
  hazards: Hazard[];
  filter: string;
  mapStyle: string;
  sourceMeta: HazardFeedResponse["meta"] | null;
  setFilter(filter: string): void;
  setMapStyle(mapStyle: string): void;
  refresh(): Promise<void>;
};

const MapStateContext = createContext<MapStateValue | undefined>(undefined);

export function MapStateProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [filter, setFilter] = useState("ALL");
  const [mapStyle, setMapStyle] = useState("dark-v11");
  const { disasters, refresh, sourceMeta } = useHazardData(filter);
  const previousHazardCountRef = useRef(0);

  useEffect(() => {
    const previousCount = previousHazardCountRef.current;

    if (disasters.length > previousCount) {
      notify.info("数据更新", `检测到 ${disasters.length - previousCount} 条新灾害记录`);
    }

    previousHazardCountRef.current = disasters.length;
  }, [disasters]);

  const value = useMemo<MapStateValue>(
    () => ({
      hazards: disasters,
      filter,
      mapStyle,
      sourceMeta,
      setFilter,
      setMapStyle,
      refresh,
    }),
    [disasters, filter, mapStyle, refresh, sourceMeta],
  );

  return <MapStateContext.Provider value={value}>{children}</MapStateContext.Provider>;
}

// Hook 与 Provider 有意共用地图状态模块，作为同一个公开 API。
// eslint-disable-next-line react-refresh/only-export-components
export function useMapState(): MapStateValue {
  const value = useContext(MapStateContext);
  if (!value) throw new Error("useMapState must be used within MapStateProvider");
  return value;
}
