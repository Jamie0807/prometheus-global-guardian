/** 验证地图视图的图层、控件、交互和生命周期处理。 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mapMocks = vi.hoisted(() => ({
  constructorOptions: vi.fn(),
  addSource: vi.fn(),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
  getLayer: vi.fn(() => undefined),
  getSource: vi.fn(() => undefined),
  setLayoutProperty: vi.fn(),
  setPaintProperty: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  remove: vi.fn(),
  setFog: vi.fn(),
  setProjection: vi.fn(),
  setTerrain: vi.fn(),
  removeSource: vi.fn(),
  getZoom: vi.fn(() => 1.5),
  getPitch: vi.fn(() => 0),
  getStyle: vi.fn(() => ({
    layers: [
      { id: "country-label", type: "symbol", layout: { "text-field": "{name}" } },
      { id: "settlement-major-label", type: "symbol", layout: { "text-field": "{name}" } },
      { id: "road-label", type: "symbol", layout: { "text-field": "{name}" } },
    ],
  })),
  addControl: vi.fn(),
  removeControl: vi.fn(),
  setStyle: vi.fn(),
  easeTo: vi.fn(),
  jumpTo: vi.fn(),
  popupSetDOMContent: vi.fn(),
  popupSetLngLat: vi.fn(),
  popupAddTo: vi.fn(),
  markerElements: [] as HTMLElement[],
  fetchHazardFeed: vi.fn(),
  fetchHazardsActive: vi.fn(),
  fetchUSGSEarthquakes: vi.fn(),
  fetchNASAEONET: vi.fn(),
  fetchGDACS: vi.fn(),
}));

class WorkerMock {
  private messageListener: ((event: MessageEvent<{ id: number; result: unknown }>) => void) | null =
    null;

  addEventListener(
    type: string,
    listener: (event: MessageEvent<{ id: number; result: unknown }>) => void,
  ) {
    if (type === "message") this.messageListener = listener;
  }

  removeEventListener() {}

  postMessage(payload: { id: number; hazards: unknown }) {
    this.messageListener?.({ data: { id: payload.id, result: payload.hazards } } as MessageEvent);
  }

  terminate() {}
}

vi.stubGlobal("Worker", WorkerMock);

vi.mock("mapbox-gl", () => ({
  default: {
    Map: class {
      constructor(options: unknown) {
        mapMocks.constructorOptions(options);
        queueMicrotask(() => {
          const loadRegistration = mapMocks.on.mock.calls
            .filter(([event]) => event === "load")
            .pop();
          loadRegistration?.[1]();
        });
      }
      addSource = mapMocks.addSource;
      addLayer = mapMocks.addLayer;
      removeLayer = mapMocks.removeLayer;
      getLayer = mapMocks.getLayer;
      getSource = mapMocks.getSource;
      setLayoutProperty = mapMocks.setLayoutProperty;
      setPaintProperty = mapMocks.setPaintProperty;
      on = mapMocks.on;
      off = mapMocks.off;
      once = mapMocks.once;
      remove = mapMocks.remove;
      setFog = mapMocks.setFog;
      setProjection = mapMocks.setProjection;
      setTerrain = mapMocks.setTerrain;
      removeSource = mapMocks.removeSource;
      getZoom = mapMocks.getZoom;
      getPitch = mapMocks.getPitch;
      getStyle = mapMocks.getStyle;
      addControl = mapMocks.addControl;
      removeControl = mapMocks.removeControl;
      setStyle = mapMocks.setStyle;
      easeTo = mapMocks.easeTo;
      jumpTo = mapMocks.jumpTo;
    },
    Marker: class {
      private readonly element: HTMLElement;

      constructor(element: HTMLElement) {
        this.element = element;
        mapMocks.markerElements.push(element);
      }

      setLngLat() {
        return this;
      }
      setPopup() {
        return this;
      }
      addTo() {
        return this;
      }
      remove() {}
      getElement() {
        return this.element;
      }
    },
    Popup: class {
      setHTML() {
        return this;
      }
      setDOMContent(content: HTMLDivElement) {
        mapMocks.popupSetDOMContent(content);
        return this;
      }
      setLngLat(lngLat: unknown) {
        mapMocks.popupSetLngLat(lngLat);
        return this;
      }
      addTo(map: unknown) {
        mapMocks.popupAddTo(map);
        return this;
      }
    },
  },
}));

vi.mock("../../src/services/hazards/hazardService", () => ({
  fetchHazardFeed: mapMocks.fetchHazardFeed,
  fetchHazardsActive: mapMocks.fetchHazardsActive,
  fetchUSGSEarthquakes: mapMocks.fetchUSGSEarthquakes,
  fetchNASAEONET: mapMocks.fetchNASAEONET,
  fetchGDACS: mapMocks.fetchGDACS,
}));

import MapView from "../../src/features/map/MapView";
import Header from "../../src/components/Header";
import { MapStateProvider, useMapState } from "../../src/features/map/state/MapStateContext";
import { UIStateProvider } from "../../src/state/UIStateContext";

function pendingHazardFeed() {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function MapStateControls() {
  const { filter, hazards, refresh, setFilter, showHeatmap, toggleHeatmap, viewMode, setViewMode } =
    useMapState();

  return (
    <>
      <div data-testid="map-state-hazard-ids">{hazards.map((hazard) => hazard.id).join(",")}</div>
      <div data-testid="map-state-event-ids">
        {hazards.map((hazard) => hazard.eventId).join(",")}
      </div>
      <div data-testid="map-state-view-mode">{viewMode}</div>
      <div data-testid="map-state-filter">{filter}</div>
      <div data-testid="map-state-heatmap">{String(showHeatmap)}</div>
      <button type="button" onClick={() => void refresh()}>
        refresh-map-data
      </button>
      <button type="button" onClick={() => setFilter("FLOOD")}>
        filter-flood
      </button>
      <button type="button" onClick={toggleHeatmap}>
        toggle-heatmap-state
      </button>
      <button type="button" onClick={() => setViewMode("3d")}>
        enable-3d-state
      </button>
    </>
  );
}

function renderMapView() {
  return render(
    <MapStateProvider>
      <MapView />
      <MapStateControls />
    </MapStateProvider>,
  );
}

function renderHeader() {
  return render(
    <UIStateProvider>
      <MapStateProvider>
        <Header />
      </MapStateProvider>
    </UIStateProvider>,
  );
}

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapMocks.markerElements.length = 0;
    mapMocks.getSource.mockImplementation(() => undefined);
    mapMocks.getLayer.mockImplementation(() => undefined);
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    mapMocks.fetchHazardFeed.mockResolvedValue({
      hazards: [
        {
          schemaVersion: "1",
          eventId: "disasteraware:hazard-1",
          sourceEventId: "hazard-1",
          sourceId: "disasteraware",
          layerId: "hydrological",
          id: "hazard-1",
          title: "<script>window.__xss = true</script>",
          type: '<img src=x onerror="window.__xss = true">',
          geometry: { type: "Point", coordinates: [120, 30] },
          description: '<img src=x onerror="window.__xss = true">',
          source: "test",
          severity: 'HIGH <a href="javascript:alert(1)">link</a>',
          timestamp: "2026-09-09T00:00:00Z",
        },
      ],
      meta: {
        primary: "disasteraware",
        fallbackUsed: false,
        stale: false,
        generatedAt: "2026-09-09T00:00:00Z",
        sources: [
          { id: "disasteraware", status: "success", count: 1 },
          { id: "usgs", status: "fallback", count: 0 },
          { id: "nasa-eonet", status: "fallback", count: 0 },
          { id: "gdacs", status: "fallback", count: 0 },
        ],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("places the heatmap toggle after settings in the header", () => {
    renderHeader();

    const settingsButton = screen.getByRole("button", { name: "打开设置弹窗" });
    const heatmapButton = screen.getByTitle("显示热力图");
    expect(
      settingsButton.compareDocumentPosition(heatmapButton) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.click(heatmapButton);
    expect(screen.getByTitle("显示标记")).toHaveTextContent("标记");
  });

  it("exposes an accessible 2D and 3D view toggle in the map header", () => {
    renderHeader();

    expect(screen.getByRole("heading", { level: 1, name: "全球灾害态势" })).toBeInTheDocument();
    expect(screen.getByText("PROMETHEUS · GLOBAL GUARDIAN")).toBeInTheDocument();
    const twoDButton = screen.getByRole("button", { name: "2D 视图" });
    const threeDButton = screen.getByRole("button", { name: "3D 地形" });

    expect(threeDButton).toHaveTextContent("3D 地形");
    expect(twoDButton).toHaveAttribute("aria-pressed", "true");
    expect(threeDButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(threeDButton);
    expect(twoDButton).toHaveAttribute("aria-pressed", "false");
    expect(threeDButton).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps filter and heatmap state when the view mode changes", async () => {
    render(
      <MapStateProvider>
        <MapView />
        <MapStateControls />
      </MapStateProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("map-state-hazard-ids")).toHaveTextContent("hazard-1"),
    );
    fireEvent.click(screen.getByRole("button", { name: "filter-flood" }));
    fireEvent.click(screen.getByRole("button", { name: "toggle-heatmap-state" }));
    fireEvent.click(screen.getByRole("button", { name: "enable-3d-state" }));

    expect(screen.getByTestId("map-state-view-mode")).toHaveTextContent("3d");
    expect(screen.getByTestId("map-state-filter")).toHaveTextContent("FLOOD");
    expect(screen.getByTestId("map-state-heatmap")).toHaveTextContent("true");
    expect(screen.getByTestId("map-state-hazard-ids")).toHaveTextContent("hazard-1");
  });

  it("renders the map container", async () => {
    renderMapView();

    await waitFor(() => expect(mapMocks.addSource).toHaveBeenCalled());
    expect(screen.getByTestId("map-state-event-ids")).toHaveTextContent("disasteraware:hazard-1");
  });

  it("keeps individual hazard markers hidden when data arrives at a clustered zoom", async () => {
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed.mockImplementationOnce(() => pending.promise);
    mapMocks.getZoom.mockReturnValue(1.5);
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.addSource).toHaveBeenCalledWith("hazards-lod", expect.anything()),
    );
    await waitFor(() => expect(mapMocks.on).toHaveBeenCalledWith("zoom", expect.any(Function)));
    await act(async () => {
      pending.resolve({
        hazards: [
          {
            id: "late-hazard",
            eventId: "disasteraware:late-hazard",
            sourceId: "disasteraware",
            layerId: "hydrological",
            title: "Late hazard",
            type: "FLOOD",
            geometry: { type: "Point", coordinates: [120, 30] },
            description: "Loaded after the map layers",
            source: "test",
          },
        ],
        meta: null,
      });
      await pending.promise;
    });

    await waitFor(() => expect(mapMocks.markerElements).toHaveLength(1));
    expect(mapMocks.markerElements[0]?.style.display).toBe("none");
  });

  it("restyles country and settlement labels for a restrained high-contrast map", async () => {
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.setPaintProperty).toHaveBeenCalledWith(
        "country-label",
        "text-color",
        "#bfd2e5",
      ),
    );
    expect(mapMocks.setPaintProperty).toHaveBeenCalledWith(
      "country-label",
      "text-halo-color",
      "#071222",
    );
    expect(mapMocks.setPaintProperty).not.toHaveBeenCalledWith(
      "road-label",
      "text-color",
      expect.anything(),
    );
  });

  it("starts in 2D without terrain and enables Terrain after switching to 3D", async () => {
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.addSource).toHaveBeenCalledWith("hazards-lod", expect.anything()),
    );
    expect(mapMocks.constructorOptions).toHaveBeenCalledWith(
      expect.objectContaining({ projection: "mercator" }),
    );
    expect(mapMocks.setProjection).toHaveBeenCalledWith("mercator");
    expect(mapMocks.addSource).not.toHaveBeenCalledWith("orbital-terrain-dem", expect.anything());

    fireEvent.click(screen.getByRole("button", { name: "enable-3d-state" }));

    await waitFor(() =>
      expect(mapMocks.addSource).toHaveBeenCalledWith(
        "orbital-terrain-dem",
        expect.objectContaining({ type: "raster-dem" }),
      ),
    );
    expect(mapMocks.setTerrain).toHaveBeenCalledWith({
      source: "orbital-terrain-dem",
      exaggeration: 1.8,
    });
    expect(mapMocks.setProjection).toHaveBeenCalledWith("globe");
  });

  it("only adds the building extrusion layer while 3D mode is active", async () => {
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.addLayer).toHaveBeenCalledWith(
        expect.objectContaining({ id: "lod-clusters" }),
      ),
    );
    expect(
      mapMocks.addLayer.mock.calls.some(
        ([layer]) => (layer as { id: string }).id === "3d-buildings",
      ),
    ).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "enable-3d-state" }));

    await waitFor(() =>
      expect(
        mapMocks.addLayer.mock.calls.some(
          ([layer]) => (layer as { id: string }).id === "3d-buildings",
        ),
      ).toBe(true),
    );
  });

  it("cleans up map hooks safely after the Mapbox instance is removed", async () => {
    const view = renderMapView();
    await waitFor(() => expect(mapMocks.addSource).toHaveBeenCalled());
    fireEvent.click(screen.getByRole("button", { name: "enable-3d-state" }));
    await waitFor(() =>
      expect(mapMocks.addSource).toHaveBeenCalledWith("orbital-terrain-dem", expect.anything()),
    );

    mapMocks.remove.mockImplementationOnce(() => {
      mapMocks.getSource.mockImplementation(() => {
        throw new Error("style already removed");
      });
      mapMocks.getLayer.mockImplementation(() => {
        throw new Error("style already removed");
      });
      mapMocks.off.mockImplementation(() => {
        throw new Error("event registry already removed");
      });
    });

    expect(() => view.unmount()).not.toThrow();
  });

  it("passes a DOM popup node to Mapbox for external hazard text", async () => {
    renderMapView();

    await waitFor(() => expect(mapMocks.popupSetDOMContent).toHaveBeenCalledTimes(1));

    const content = mapMocks.popupSetDOMContent.mock.calls[0]?.[0] as HTMLDivElement;
    expect(content.querySelector(".popup-title")?.textContent).toContain("<script>");
    expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
  });

  it("expands a clicked LOD cluster at its feature coordinates", async () => {
    const getClusterExpansionZoom = vi.fn(
      (clusterId: number, callback: (error: null, zoom: number) => void) => {
        callback(null, 9);
      },
    );
    mapMocks.getSource.mockReturnValue({ getClusterExpansionZoom, setData: vi.fn() });
    mapMocks.getLayer.mockReturnValue({});
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.on).toHaveBeenCalledWith("click", "lod-clusters", expect.any(Function)),
    );
    const clusterClick = mapMocks.on.mock.calls.find(
      ([event, layerId]) => event === "click" && layerId === "lod-clusters",
    )?.[2] as (event: unknown) => void;

    clusterClick({
      features: [
        {
          toJSON: () => ({
            properties: { cluster_id: 42 },
            geometry: { type: "Point", coordinates: [120, 30] },
          }),
        },
      ],
    });

    expect(getClusterExpansionZoom).toHaveBeenCalledWith(42, expect.any(Function));
    expect(mapMocks.easeTo).toHaveBeenCalledWith({ center: [120, 30], zoom: 9 });
  });

  it("does not expand a cluster after its click handler is cleaned up", async () => {
    const callbacks: Array<(error: Error | null, zoom: number | null) => void> = [];
    const getClusterExpansionZoom = vi.fn(
      (_clusterId: number, callback: (error: Error | null, zoom: number | null) => void) => {
        callbacks.push(callback);
      },
    );
    mapMocks.getSource.mockReturnValue({ getClusterExpansionZoom, setData: vi.fn() });
    mapMocks.getLayer.mockReturnValue({});
    const view = renderMapView();

    await waitFor(() =>
      expect(mapMocks.on).toHaveBeenCalledWith("click", "lod-clusters", expect.any(Function)),
    );
    const clusterClick = mapMocks.on.mock.calls.find(
      ([event, layerId]) => event === "click" && layerId === "lod-clusters",
    )?.[2] as (event: unknown) => void;
    clusterClick({
      features: [
        {
          toJSON: () => ({
            properties: { cluster_id: 42 },
            geometry: { type: "Point", coordinates: [120, 30] },
          }),
        },
      ],
    });

    view.unmount();
    callbacks[0]?.(null, 9);

    expect(mapMocks.easeTo).not.toHaveBeenCalled();
  });

  it("does not expand a cluster when Mapbox returns an error", async () => {
    const getClusterExpansionZoom = vi.fn(
      (_clusterId: number, callback: (error: Error, zoom: null) => void) => {
        callback(new Error("cluster unavailable"), null);
      },
    );
    mapMocks.getSource.mockReturnValue({ getClusterExpansionZoom, setData: vi.fn() });
    mapMocks.getLayer.mockReturnValue({});
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.on).toHaveBeenCalledWith("click", "lod-clusters", expect.any(Function)),
    );
    const clusterClick = mapMocks.on.mock.calls.find(
      ([event, layerId]) => event === "click" && layerId === "lod-clusters",
    )?.[2] as (event: unknown) => void;
    clusterClick({
      features: [
        {
          toJSON: () => ({
            properties: { cluster_id: 42 },
            geometry: { type: "Point", coordinates: [120, 30] },
          }),
        },
      ],
    });

    expect(mapMocks.easeTo).not.toHaveBeenCalled();
  });

  it("opens a safe DOM popup for a clicked unclustered LOD hazard", async () => {
    mapMocks.getSource.mockReturnValue({ setData: vi.fn() });
    mapMocks.getLayer.mockReturnValue({});
    renderMapView();

    await waitFor(() =>
      expect(mapMocks.on).toHaveBeenCalledWith("click", "lod-unclustered", expect.any(Function)),
    );
    const unclusteredClick = mapMocks.on.mock.calls.find(
      ([event, layerId]) => event === "click" && layerId === "lod-unclustered",
    )?.[2] as (event: unknown) => void;

    unclusteredClick({
      features: [{ toJSON: () => ({ properties: { id: "hazard-1" } }) }],
      lngLat: { lng: 120, lat: 30 },
    });

    expect(mapMocks.popupSetLngLat).toHaveBeenCalledWith({ lng: 120, lat: 30 });
    expect(mapMocks.popupAddTo).toHaveBeenCalledTimes(1);
    const content = mapMocks.popupSetDOMContent.mock.calls.at(-1)?.[0] as HTMLDivElement;
    expect(content.querySelector(".popup-title")?.textContent).toContain("<script>");
    expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
  });

  it.each([
    ["success", false, false],
    ["empty", true, false],
    ["unavailable", true, false],
    ["stale", false, true],
  ] as const)(
    "does not render a data source banner for %s source state",
    async (status, fallbackUsed, stale) => {
      mapMocks.fetchHazardFeed.mockResolvedValueOnce({
        hazards: [
          {
            id: `hazard-${status}`,
            title: "Test hazard",
            type: "FLOOD",
            geometry: { type: "Point", coordinates: [120, 30] },
            description: "Test hazard",
            source: "test",
          },
        ],
        meta: {
          primary: "disasteraware",
          fallbackUsed,
          stale,
          generatedAt: "2026-09-09T00:00:00Z",
          sources: [
            { id: "disasteraware", status, count: 1, fetchedAt: "2026-09-09T00:00:00Z" },
            { id: "usgs", status: "fallback", count: 0 },
            { id: "nasa-eonet", status: "fallback", count: 0 },
            { id: "gdacs", status: "fallback", count: 0 },
          ],
        },
      });

      renderMapView();

      await waitFor(() => expect(mapMocks.popupSetDOMContent).toHaveBeenCalled());
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByText("暂无可用灾害数据")).not.toBeInTheDocument();
      expect(mapMocks.fetchHazardsActive).not.toHaveBeenCalled();
      expect(mapMocks.fetchUSGSEarthquakes).not.toHaveBeenCalled();
      expect(mapMocks.fetchNASAEONET).not.toHaveBeenCalled();
      expect(mapMocks.fetchGDACS).not.toHaveBeenCalled();
    },
  );

  it("does not render diagnostics when source metadata has no hazards", async () => {
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed.mockImplementationOnce(() => pending.promise);
    renderMapView();

    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1));
    await act(async () => {
      pending.resolve({
        hazards: [],
        meta: {
          primary: "disasteraware",
          fallbackUsed: true,
          stale: false,
          generatedAt: "2026-09-09T00:00:00Z",
          sources: [
            { id: "disasteraware", status: "unavailable", count: 0 },
            { id: "usgs", status: "fallback", count: 0 },
            { id: "nasa-eonet", status: "fallback", count: 0 },
            { id: "gdacs", status: "fallback", count: 0 },
          ],
        },
      });
      await pending.promise;
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("暂无可用灾害数据")).not.toBeInTheDocument();
  });

  it("deduplicates matching manual refresh requests", async () => {
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed.mockImplementationOnce(() => pending.promise);
    renderMapView();

    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "refresh-map-data" }));
    fireEvent.click(screen.getByRole("button", { name: "refresh-map-data" }));

    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1);
  });

  it("cancels an obsolete filter request", async () => {
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed
      .mockImplementationOnce(() => pending.promise)
      .mockResolvedValueOnce({
        hazards: [
          {
            id: "current-filter-hazard",
            title: "Current filter result",
            type: "FLOOD",
            geometry: { type: "Point", coordinates: [120, 30] },
            description: "Current request result",
            source: "test",
          },
        ],
        meta: null,
      });
    renderMapView();

    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1));
    const firstSignal = mapMocks.fetchHazardFeed.mock.calls[0]?.[1] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "filter-flood" }));

    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(2));
    expect(firstSignal.aborted).toBe(true);
    await waitFor(() =>
      expect(screen.getByTestId("map-state-hazard-ids")).toHaveTextContent("current-filter-hazard"),
    );

    pending.resolve({
      hazards: [
        {
          id: "stale-hazard",
          title: "Stale result",
          type: "FLOOD",
          geometry: { type: "Point", coordinates: [120, 30] },
          description: "Cancelled request result",
          source: "test",
        },
      ],
      meta: null,
    });

    await waitFor(() =>
      expect(screen.getByTestId("map-state-hazard-ids")).toHaveTextContent("current-filter-hazard"),
    );
    expect(screen.getByTestId("map-state-hazard-ids")).not.toHaveTextContent("stale-hazard");
  });

  it("cancels a manual request when the filter changes while hidden", async () => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed.mockImplementationOnce(() => pending.promise);
    renderMapView();

    fireEvent.click(screen.getByRole("button", { name: "refresh-map-data" }));
    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1));
    const signal = mapMocks.fetchHazardFeed.mock.calls[0]?.[1] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "filter-flood" }));

    expect(signal.aborted).toBe(true);
  });

  it("pauses the refresh interval while hidden and refreshes immediately when visible", async () => {
    vi.useFakeTimers();
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    renderMapView();

    await vi.advanceTimersByTimeAsync(0);
    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(2);

    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(4);
  });

  it("aborts the active request when unmounted", async () => {
    const pending = pendingHazardFeed();
    mapMocks.fetchHazardFeed.mockImplementationOnce(() => pending.promise);
    const view = renderMapView();

    await waitFor(() => expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1));
    const signal = mapMocks.fetchHazardFeed.mock.calls[0]?.[1] as AbortSignal;
    view.unmount();

    expect(signal.aborted).toBe(true);
  });
});
