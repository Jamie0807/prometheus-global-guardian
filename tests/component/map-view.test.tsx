import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
        queueMicrotask(() => mapMocks.on.mock.calls.find(([event]) => event === "load")?.[1]());
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
    Marker: class {},
    Popup: class {},
  },
}));

vi.mock("../../src/services/hazards/hazardService", () => ({
  fetchHazardsActive: vi.fn(async () => []),
  fetchUSGSEarthquakes: vi.fn(async () => []),
  fetchNASAEONET: vi.fn(async () => []),
  fetchGDACS: vi.fn(async () => []),
}));

import MapView from "../../src/features/map/MapView";

describe("MapView", () => {
  it("renders the map container and toggles heatmap mode", async () => {
    render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

    const button = await screen.findByTitle("Show Heatmap");
    fireEvent.click(button);

    expect(screen.getByTitle("Show Markers")).toBeInTheDocument();
  });
});
