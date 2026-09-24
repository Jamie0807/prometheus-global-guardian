/** 验证 Orbital 2D/3D 地图地形与相机行为。 */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Map } from "mapbox-gl";

import { notify } from "../../apps/web/src/utils/notifications";
import { useMapTerrain } from "../../apps/web/src/features/map/hooks/useMapTerrain";

function createMap(hasTerrainSource = false, pitch = 0) {
  const listeners = new Map<string, (event: unknown) => void>();
  const map = {
    addSource: vi.fn(),
    easeTo: vi.fn(),
    getSource: vi.fn((id: string) =>
      id === "orbital-terrain-dem" && hasTerrainSource ? {} : undefined,
    ),
    getPitch: vi.fn(() => pitch),
    jumpTo: vi.fn(),
    off: vi.fn((event: string) => listeners.delete(event)),
    on: vi.fn((event: string, listener: (value: unknown) => void) =>
      listeners.set(event, listener),
    ),
    removeSource: vi.fn(),
    setProjection: vi.fn(),
    setTerrain: vi.fn(),
  };

  return { map: map as unknown as Map, listeners, ...map };
}

describe("useMapTerrain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("启用增强 DEM 地形并以明显 pitch 进入 3D", () => {
    const map = createMap();
    const mapRef = { current: map.map };

    renderHook(() => useMapTerrain(mapRef, 1, "3d"));

    expect(map.addSource).toHaveBeenCalledWith(
      "orbital-terrain-dem",
      expect.objectContaining({
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      }),
    );
    expect(map.setTerrain).toHaveBeenCalledWith({
      source: "orbital-terrain-dem",
      exaggeration: 1.8,
    });
    expect(map.setProjection).toHaveBeenCalledWith("globe");
    expect(map.easeTo).toHaveBeenCalledWith({ pitch: 42, duration: 450 });
  });

  it("回到 2D 时关闭地形并移除 DEM source", () => {
    const map = createMap(true, 42);
    const mapRef = { current: map.map };
    const { rerender } = renderHook(
      ({ mode }: { mode: "2d" | "3d" }) => useMapTerrain(mapRef, 1, mode),
      { initialProps: { mode: "3d" as const } },
    );

    rerender({ mode: "2d" });

    expect(map.setTerrain).toHaveBeenCalledWith(null);
    expect(map.setProjection).toHaveBeenLastCalledWith("mercator");
    expect(map.removeSource).toHaveBeenCalledWith("orbital-terrain-dem");
    expect(map.easeTo).toHaveBeenCalledWith({ pitch: 0, duration: 450 });
  });

  it("DEM 报错时关闭地形并只发一次非阻塞通知", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const map = createMap();

    const { unmount } = renderHook(() => useMapTerrain({ current: map.map }, 1, "3d"));
    const onError = map.listeners.get("error");
    expect(onError).toBeDefined();

    onError?.({ sourceId: "orbital-terrain-dem", error: new Error("DEM unavailable") });
    onError?.({ sourceId: "orbital-terrain-dem", error: new Error("DEM unavailable") });

    expect(map.setTerrain).toHaveBeenLastCalledWith(null);
    expect(warning).toHaveBeenCalledTimes(1);
    expect(map.easeTo).toHaveBeenCalledTimes(1);
    unmount();
    expect(map.off).toHaveBeenCalledWith("error", onError);
  });

  it("样式重载后重新挂载 DEM source 与错误监听器", () => {
    const map = createMap();
    const mapRef = { current: map.map };
    const { rerender } = renderHook(
      ({ revision }: { revision: number }) => useMapTerrain(mapRef, revision, "3d"),
      { initialProps: { revision: 1 } },
    );

    rerender({ revision: 2 });

    expect(map.addSource).toHaveBeenCalledTimes(2);
    expect(map.setTerrain).toHaveBeenCalledTimes(3);
    expect(map.off).toHaveBeenCalledTimes(1);
    expect(map.on).toHaveBeenCalledTimes(2);
  });

  it("忽略与 DEM 无关的 Mapbox 错误", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const map = createMap();

    renderHook(() => useMapTerrain({ current: map.map }, 1, "3d"));
    map.listeners.get("error")?.({ sourceId: "hazards-lod", error: new Error("offline") });

    expect(warning).not.toHaveBeenCalled();
    expect(map.setTerrain).toHaveBeenLastCalledWith({
      source: "orbital-terrain-dem",
      exaggeration: 1.8,
    });
  });

  it("系统减少动态效果时使用瞬时相机切换", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    );
    const map = createMap();

    renderHook(() => useMapTerrain({ current: map.map }, 1, "3d"));

    expect(map.jumpTo).toHaveBeenCalledWith({ pitch: 42 });
    expect(map.easeTo).not.toHaveBeenCalled();
  });
});
