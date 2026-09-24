/** 验证 Globe 投影下的建筑兼容回退与 LOD 生命周期。 */
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Map } from "mapbox-gl";

import { useDeck3DTiles } from "../../apps/web/src/features/map/hooks/useDeck3DTiles";
import { MAP_LAYER_IDS } from "../../apps/web/src/features/map/utils/mapLayerIds";
import { notify } from "../../apps/web/src/utils/notifications";

const tileConfig = vi.hoisted(() => ({
  enabled: true,
  url: "https://tiles.example.test/tileset.json",
}));

vi.mock("../../apps/web/src/config", () => ({
  config: {
    tiles3d: tileConfig,
  },
}));

function createMap(initialZoom = 1.5, hasBuildingLayer = false) {
  let zoom = initialZoom;
  let buildingLayerExists = hasBuildingLayer;
  const listeners = new Map<string, (event?: unknown) => void>();
  const map = {
    addControl: vi.fn(),
    addLayer: vi.fn(() => {
      buildingLayerExists = true;
    }),
    getLayer: vi.fn((id: string) =>
      id === MAP_LAYER_IDS.buildings && buildingLayerExists ? {} : undefined,
    ),
    getZoom: vi.fn(() => zoom),
    on: vi.fn((event: string, listener: (event?: unknown) => void) => {
      listeners.set(event, listener);
    }),
    off: vi.fn((event: string) => listeners.delete(event)),
    removeControl: vi.fn(),
    removeLayer: vi.fn(() => {
      buildingLayerExists = false;
    }),
    setLayoutProperty: vi.fn(),
  };

  return {
    map: map as unknown as Map,
    listeners,
    mapMocks: map,
    setZoom(value: number) {
      zoom = value;
    },
  };
}

describe("useDeck3DTiles in Globe mode", () => {
  afterEach(() => {
    tileConfig.enabled = true;
    tileConfig.url = "https://tiles.example.test/tileset.json";
    vi.restoreAllMocks();
  });

  it("uses native extrusion instead of deck.gl tiles and reports the Globe fallback", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const { map, mapMocks } = createMap(14);
    const applyLod = vi.fn();
    const { unmount } = renderHook(() => useDeck3DTiles({ current: map }, 1, "3d", applyLod));

    expect(mapMocks.addControl).not.toHaveBeenCalled();
    expect(mapMocks.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MAP_LAYER_IDS.buildings,
        type: "fill-extrusion",
      }),
      "waterway-label",
    );
    expect(warning).toHaveBeenCalledWith("3D 瓦片暂不可用", expect.stringContaining("Globe"));

    unmount();
    expect(mapMocks.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.buildings);
    expect(mapMocks.off).toHaveBeenCalledWith("zoomend", expect.any(Function));
  });

  it("defers the compatibility notice until buildings reach their zoom level", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const { map, listeners, mapMocks, setZoom } = createMap(13);
    const applyLod = vi.fn();
    renderHook(() => useDeck3DTiles({ current: map }, 1, "3d", applyLod));

    expect(warning).not.toHaveBeenCalled();
    setZoom(14);
    listeners.get("zoomend")?.();
    listeners.get("zoomend")?.();

    expect(mapMocks.addControl).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledTimes(1);
    expect(applyLod).toHaveBeenCalledWith(14);
  });

  it("removes existing 3D buildings when the map returns to 2D", () => {
    const { map, mapMocks } = createMap(14, true);

    renderHook(() => useDeck3DTiles({ current: map }, 1, "2d", vi.fn()));

    expect(mapMocks.addControl).not.toHaveBeenCalled();
    expect(mapMocks.addLayer).not.toHaveBeenCalled();
    expect(mapMocks.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.buildings);
  });

  it("keeps native extrusion when external Tiles are not configured", () => {
    tileConfig.enabled = false;
    tileConfig.url = "";
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const { map, mapMocks } = createMap(14);

    renderHook(() => useDeck3DTiles({ current: map }, 1, "3d", vi.fn()));

    expect(mapMocks.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({ id: MAP_LAYER_IDS.buildings, type: "fill-extrusion" }),
      "waterway-label",
    );
    expect(warning).not.toHaveBeenCalled();
  });

  it("keeps the disaster map usable if native building extrusion cannot be added", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const { map, mapMocks } = createMap(14);
    mapMocks.addLayer.mockImplementation(() => {
      throw new Error("building layer unavailable");
    });

    renderHook(() => useDeck3DTiles({ current: map }, 1, "3d", vi.fn()));

    expect(warning).toHaveBeenCalledWith(
      "3D 瓦片暂不可用",
      "当前 Globe 投影不支持外部 3D Tiles，灾害地图仍可正常使用。",
    );
    expect(mapMocks.addControl).not.toHaveBeenCalled();
  });

  it("rebinds the zoom listener after a style revision without duplicate notices", () => {
    const warning = vi.spyOn(notify, "warning").mockImplementation(() => undefined);
    const { map, mapMocks } = createMap(14);
    const mapRef = { current: map };
    const { rerender, unmount } = renderHook(
      ({ revision }: { revision: number }) => useDeck3DTiles(mapRef, revision, "3d", vi.fn()),
      { initialProps: { revision: 1 } },
    );

    rerender({ revision: 2 });

    expect(mapMocks.off).toHaveBeenCalledTimes(1);
    expect(mapMocks.on).toHaveBeenCalledTimes(2);
    expect(warning).toHaveBeenCalledTimes(1);
    unmount();
    expect(mapMocks.off).toHaveBeenCalledTimes(2);
  });
});
