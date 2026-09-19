/** 验证地图视图的图层、控件、交互和生命周期处理。 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mapMocks = vi.hoisted(() => ({
  addSource: vi.fn(),
  addLayer: vi.fn(),
  getLayer: vi.fn(() => undefined),
  getSource: vi.fn(() => undefined),
  setLayoutProperty: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  remove: vi.fn(),
  setFog: vi.fn(),
  getZoom: vi.fn(() => 1.5),
  addControl: vi.fn(),
  removeControl: vi.fn(),
  setStyle: vi.fn(),
  easeTo: vi.fn(),
  popupSetDOMContent: vi.fn(),
  popupSetLngLat: vi.fn(),
  popupAddTo: vi.fn(),
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
      constructor() {
        queueMicrotask(() => {
          const loadRegistration = mapMocks.on.mock.calls
            .filter(([event]) => event === "load")
            .pop();
          loadRegistration?.[1]();
        });
      }
      addSource = mapMocks.addSource;
      addLayer = mapMocks.addLayer;
      getLayer = mapMocks.getLayer;
      getSource = mapMocks.getSource;
      setLayoutProperty = mapMocks.setLayoutProperty;
      on = mapMocks.on;
      off = mapMocks.off;
      once = mapMocks.once;
      remove = mapMocks.remove;
      setFog = mapMocks.setFog;
      getZoom = mapMocks.getZoom;
      addControl = mapMocks.addControl;
      removeControl = mapMocks.removeControl;
      setStyle = mapMocks.setStyle;
      easeTo = mapMocks.easeTo;
    },
    Marker: class {
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
        return document.createElement("div");
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
  const { hazards, refresh, setFilter } = useMapState();

  return (
    <>
      <div data-testid="map-state-hazard-ids">{hazards.map((hazard) => hazard.id).join(",")}</div>
      <div data-testid="map-state-event-ids">
        {hazards.map((hazard) => hazard.eventId).join(",")}
      </div>
      <button type="button" onClick={() => void refresh()}>
        refresh-map-data
      </button>
      <button type="button" onClick={() => setFilter("FLOOD")}>
        filter-flood
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

  it("renders the map container", async () => {
    renderMapView();

    await waitFor(() => expect(mapMocks.addSource).toHaveBeenCalled());
    expect(screen.getByTestId("map-state-event-ids")).toHaveTextContent("disasteraware:hazard-1");
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
          properties: { cluster_id: 42 },
          geometry: { type: "Point", coordinates: [120, 30] },
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
          properties: { cluster_id: 42 },
          geometry: { type: "Point", coordinates: [120, 30] },
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
          properties: { cluster_id: 42 },
          geometry: { type: "Point", coordinates: [120, 30] },
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
      features: [{ properties: { id: "hazard-1" } }],
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
