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
  fetchHazardsActive: vi.fn(async () => [
    {
      hazard_ID: 1,
      hazard_Name: "<script>window.__xss = true</script>",
      type_ID: '<img src=x onerror="window.__xss = true">',
      latitude: 30,
      longitude: 120,
      description: '<img src=x onerror="window.__xss = true">',
      creator: "test",
      severity_ID: 'HIGH <a href="javascript:alert(1)">link</a>',
      create_Date: "2026-09-09T00:00:00Z",
    },
  ]),
  fetchUSGSEarthquakes: vi.fn(async () => []),
  fetchNASAEONET: vi.fn(async () => []),
  fetchGDACS: vi.fn(async () => []),
}));

import MapView from "../../src/features/map/MapView";

describe("MapView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
