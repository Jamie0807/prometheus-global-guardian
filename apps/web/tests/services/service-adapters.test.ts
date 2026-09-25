/** 验证公共灾害源响应适配及灾害类型标准化。 */
import { describe, expect, it } from "vitest";

import {
  adaptGDACSResponse,
  adaptNASAResponse,
  adaptUSGSResponse,
  detectHazardTypeFromTitle,
  mapNASACategoryToType,
} from "../../src/services/hazards/hazardAdapters";

describe("hazard adapters", () => {
  it("returns an empty list for non-object public source payloads", () => {
    expect(adaptUSGSResponse(null)).toEqual([]);
    expect(adaptNASAResponse("invalid-nasa-payload")).toEqual([]);
    expect(adaptGDACSResponse([])).toEqual([]);
  });

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
      schemaVersion: "1",
      id: "usgs:usgs-1",
      eventId: "usgs:usgs-1",
      sourceEventId: "usgs-1",
      sourceId: "usgs",
      layerId: "earthquake",
      source: "USGS",
      type: "EARTHQUAKE",
      severity: "ADVISORY",
      observedAt: new Date(0).toISOString(),
      timestamp: new Date(0).toISOString(),
    });
  });

  it("keeps only USGS records with an id, geometry, and finite coordinates", () => {
    const validFeature = {
      id: "usgs-valid",
      properties: { title: "M 4.5 - Test", mag: 4.5, time: 0 },
      geometry: { type: "Point", coordinates: [1, 2] },
    };

    const hazards = adaptUSGSResponse({
      features: [
        validFeature,
        { ...validFeature, id: undefined },
        { ...validFeature, id: "usgs-no-geometry", geometry: undefined },
        {
          ...validFeature,
          id: "usgs-invalid-coordinates",
          geometry: { type: "Point", coordinates: [1, Number.POSITIVE_INFINITY] },
        },
      ],
    });

    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.id).toBe("usgs:usgs-valid");
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
    expect(hazards[0]).toMatchObject({
      schemaVersion: "1",
      id: "nasa-eonet:nasa-2",
      eventId: "nasa-eonet:nasa-2",
      sourceEventId: "nasa-2",
      sourceId: "nasa-eonet",
      layerId: "hydrological",
      type: "FLOOD",
      source: "NASA EONET",
      observedAt: new Date("2024-01-01").toISOString(),
      timestamp: new Date("2024-01-01").toISOString(),
    });
  });

  it("keeps only NASA records with an id, geometry, and finite coordinates", () => {
    const validEvent = {
      id: "nasa-valid",
      title: "River event",
      categories: [{ title: "Floods" }],
      geometry: [{ type: "Point", coordinates: [1, 2], date: "2024-01-01" }],
    };

    const hazards = adaptNASAResponse({
      events: [
        validEvent,
        { ...validEvent, id: undefined },
        { ...validEvent, id: "nasa-no-geometry", geometry: [] },
        {
          ...validEvent,
          id: "nasa-invalid-coordinates",
          geometry: [{ type: "Point", coordinates: [Number.NaN, 2] }],
        },
      ],
    });

    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.id).toBe("nasa-eonet:nasa-valid");
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
      schemaVersion: "1",
      id: "gdacs:2",
      eventId: "gdacs:2",
      sourceEventId: "2",
      sourceId: "gdacs",
      layerId: "hydrological",
      source: "GDACS",
      severity: "WATCH",
      geometry: { coordinates: [3, 4] },
    });
  });

  it("keeps only GDACS records with an id, geometry, and finite coordinates", () => {
    const validFeature = {
      geometry: { type: "Point", coordinates: [3, 4] },
      properties: { eventid: 42, name: "Flood", alertlevel: "Orange" },
    };

    const hazards = adaptGDACSResponse({
      features: [
        validFeature,
        { ...validFeature, properties: { name: "Missing id" } },
        { ...validFeature, geometry: undefined, properties: { eventid: 43 } },
        {
          ...validFeature,
          geometry: { type: "Point", coordinates: [3, Number.NEGATIVE_INFINITY] },
          properties: { eventid: 44 },
        },
      ],
    });

    expect(hazards).toHaveLength(1);
    expect(hazards[0]?.id).toBe("gdacs:42");
  });

  it("skips records without stable source IDs instead of generating positional IDs", () => {
    expect(
      adaptUSGSResponse({
        features: [
          {
            properties: { title: "Missing USGS id", time: 0 },
            geometry: { type: "Point", coordinates: [1, 2] },
          },
        ],
      }),
    ).toEqual([]);
    expect(
      adaptNASAResponse({
        events: [
          {
            title: "Missing NASA id",
            categories: [{ title: "Floods" }],
            geometry: [{ type: "Point", coordinates: [1, 2], date: "2024-01-01" }],
          },
        ],
      }),
    ).toEqual([]);
    expect(
      adaptGDACSResponse({
        features: [
          {
            properties: { name: "Missing GDACS id" },
            geometry: { type: "Point", coordinates: [1, 2] },
          },
        ],
      }),
    ).toEqual([]);
  });
});
