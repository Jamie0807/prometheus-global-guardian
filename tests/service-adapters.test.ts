import { describe, expect, it } from "vitest";

import {
  adaptGDACSResponse,
  adaptNASAResponse,
  adaptUSGSResponse,
  detectHazardTypeFromTitle,
  mapNASACategoryToType,
} from "../src/services/hazards/hazardAdapters";

describe("hazard adapters", () => {
  it("maps NASA categories and titles to stable hazard types", () => {
    expect(mapNASACategoryToType("Wildfires")).toBe("WILDFIRE");
    expect(mapNASACategoryToType("Unknown category")).toBe("UNKNOWN");
    expect(detectHazardTypeFromTitle("Typhoon warning")).toBe("TROPICAL_CYCLONE");
    expect(detectHazardTypeFromTitle("Unclassified event")).toBe("UNKNOWN");
  });

  it("adapts USGS features with stable fields and default severity", () => {
    const hazards = adaptUSGSResponse({
      features: [
        {
          id: "usgs-1",
          properties: { title: "M 4.5 - Test", mag: 4.5, time: 0 },
          geometry: { type: "Point", coordinates: [1, 2] },
        },
      ],
    });

    expect(hazards[0]).toMatchObject({
      id: "usgs-1",
      source: "USGS",
      type: "EARTHQUAKE",
      severity: "ADVISORY",
      timestamp: new Date(0).toISOString(),
    });
  });

  it("skips NASA events without geometry and uses the latest geometry", () => {
    const hazards = adaptNASAResponse({
      events: [
        { id: "nasa-1", title: "Flood", categories: [{ title: "Floods" }], geometry: [] },
        {
          id: "nasa-2",
          title: "River event",
          categories: [{ title: "Floods" }],
          geometry: [{ type: "Point", coordinates: [1, 2], date: "2024-01-01" }],
        },
      ],
    });

    expect(hazards).toHaveLength(1);
    expect(hazards[0]).toMatchObject({ id: "nasa-2", type: "FLOOD", source: "NASA EONET" });
  });

  it("skips GDACS records without geometry and maps severity", () => {
    const hazards = adaptGDACSResponse({
      features: [
        { properties: { eventid: 1, name: "Flood", alertlevel: "Red" } },
        {
          geometry: { type: "Point", coordinates: [3, 4] },
          properties: { eventid: 2, name: "Flood", alertlevel: "Orange" },
        },
      ],
    });

    expect(hazards).toHaveLength(1);
    expect(hazards[0]).toMatchObject({
      id: "gdacs-2",
      source: "GDACS",
      severity: "WATCH",
      geometry: { coordinates: [3, 4] },
    });
  });
});
