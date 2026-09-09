import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  popupSetDOMContent: vi.fn(),
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

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapMocks.fetchHazardFeed.mockResolvedValue({
      hazards: [
        {
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

  it("renders the map container and toggles heatmap mode", async () => {
    render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

    const button = await screen.findByTitle("Show Heatmap");
    fireEvent.click(button);

    expect(screen.getByTitle("Show Markers")).toBeInTheDocument();
  });

  it("passes a DOM popup node to Mapbox for external hazard text", async () => {
    render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

    await waitFor(() => expect(mapMocks.popupSetDOMContent).toHaveBeenCalledTimes(1));

    const content = mapMocks.popupSetDOMContent.mock.calls[0]?.[0] as HTMLDivElement;
    expect(content.querySelector(".popup-title")?.textContent).toContain("<script>");
    expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
  });

  it.each([
    ["success", false, "已更新"],
    ["empty", true, "暂无数据 · 已显示备用数据"],
    ["unavailable", true, "暂不可用 · 已显示备用数据"],
  ] as const)("shows %s primary source status", async (status, fallbackUsed, label) => {
    mapMocks.fetchHazardFeed.mockResolvedValueOnce({
      hazards: [],
      meta: {
        primary: "disasteraware",
        fallbackUsed,
        stale: false,
        generatedAt: "2026-09-09T00:00:00Z",
        sources: [
          { id: "disasteraware", status, count: 0 },
          { id: "usgs", status: "fallback", count: 0 },
          { id: "nasa-eonet", status: "fallback", count: 0 },
          { id: "gdacs", status: "fallback", count: 0 },
        ],
      },
    });

    render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

    expect(await screen.findByRole("status")).toHaveTextContent(label);
    expect(mapMocks.fetchHazardsActive).not.toHaveBeenCalled();
    expect(mapMocks.fetchUSGSEarthquakes).not.toHaveBeenCalled();
    expect(mapMocks.fetchNASAEONET).not.toHaveBeenCalled();
    expect(mapMocks.fetchGDACS).not.toHaveBeenCalled();
  });

  it("shows the earliest stale source success time", async () => {
    mapMocks.fetchHazardFeed.mockResolvedValueOnce({
      hazards: [],
      meta: {
        primary: "disasteraware",
        fallbackUsed: false,
        stale: true,
        generatedAt: "2026-09-09T00:10:00.000Z",
        sources: [
          {
            id: "disasteraware",
            status: "stale",
            count: 1,
            fetchedAt: "2026-09-09T00:00:00.000Z",
          },
          {
            id: "usgs",
            status: "stale",
            count: 1,
            fetchedAt: "2026-09-09T00:05:00.000Z",
          },
          { id: "nasa-eonet", status: "fallback", count: 0 },
          { id: "gdacs", status: "fallback", count: 0 },
        ],
      },
    });

    render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("数据可能已过期");
    expect(status).toHaveTextContent(new Date("2026-09-09T00:00:00.000Z").toLocaleString("zh-CN"));
  });
});
