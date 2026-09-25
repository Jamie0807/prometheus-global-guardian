import { Response } from "node-fetch";

import { describe, expect, it } from "vitest";

import { adaptDisasterAwareHazards } from "../apps/bff/hazards/disasteraware-adapter";
import {
  fetchGDACS,
  fetchNASAEONET,
  fetchUSGSEarthquakes,
} from "../apps/bff/hazards/hazard-source";

function response(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function assertCanonicalEvent(hazard: Record<string, unknown>, expected: Record<string, unknown>) {
  expect(hazard).toMatchObject({
    schemaVersion: "1",
    id: hazard.eventId,
    ...expected,
  });
}

describe("BFF canonical hazard event adapters", () => {
  it("maps USGS feature IDs and observed time to a canonical earthquake event", async () => {
    const hazards = await fetchUSGSEarthquakes(async () =>
      response({
        features: [
          {
            id: "usgs-1",
            properties: {
              title: "M 5.2 - Test Region",
              place: "Test Region",
              mag: 5.2,
              time: 1_757_289_600_000,
            },
            geometry: { type: "Point", coordinates: [12.3, 45.6] },
          },
          {
            properties: { title: "Missing ID" },
            geometry: { type: "Point", coordinates: [1, 2] },
          },
        ],
      }),
    );

    expect(hazards).toHaveLength(1);
    const hazard = hazards[0] as unknown as Record<string, unknown>;
    assertCanonicalEvent(hazard, {
      eventId: "usgs:usgs-1",
      sourceEventId: "usgs-1",
      sourceId: "usgs",
      layerId: "earthquake",
      type: "EARTHQUAKE",
      observedAt: "2025-09-08T00:00:00.000Z",
      timestamp: "2025-09-08T00:00:00.000Z",
    });
  });

  it("maps NASA EONET event IDs and the latest geometry date", async () => {
    const hazards = await fetchNASAEONET(async () =>
      response({
        events: [
          {
            id: "EONET-1",
            title: "Test wildfire",
            categories: [{ title: "Wildfires" }],
            geometry: [
              { type: "Point", coordinates: [1, 2], date: "2025-09-07T00:00:00.000Z" },
              { type: "Point", coordinates: [3, 4], date: "2025-09-08T00:00:00.000Z" },
            ],
          },
          {
            title: "Missing ID",
            categories: [{ title: "Wildfires" }],
            geometry: [{ type: "Point", coordinates: [5, 6], date: "2025-09-08T00:00:00.000Z" }],
          },
        ],
      }),
    );

    expect(hazards).toHaveLength(1);
    const hazard = hazards[0] as unknown as Record<string, unknown>;
    assertCanonicalEvent(hazard, {
      eventId: "nasa-eonet:EONET-1",
      sourceEventId: "EONET-1",
      sourceId: "nasa-eonet",
      layerId: "fire",
      type: "WILDFIRE",
      observedAt: "2025-09-08T00:00:00.000Z",
      timestamp: "2025-09-08T00:00:00.000Z",
    });
  });

  it("maps GDACS event IDs and source update time while skipping missing IDs", async () => {
    const hazards = await fetchGDACS(async () =>
      response({
        features: [
          {
            geometry: { type: "Point", coordinates: [7, 8] },
            properties: {
              eventid: 42,
              name: "Test flood",
              description: "Flood fixture",
              alertlevel: "Orange",
              lastupdate: "2025-09-08T00:00:00.000Z",
            },
          },
          {
            geometry: { type: "Point", coordinates: [9, 10] },
            properties: { name: "Missing ID" },
          },
        ],
      }),
    );

    expect(hazards).toHaveLength(1);
    const hazard = hazards[0] as unknown as Record<string, unknown>;
    assertCanonicalEvent(hazard, {
      eventId: "gdacs:42",
      sourceEventId: "42",
      sourceId: "gdacs",
      layerId: "hydrological",
      type: "FLOOD",
      updatedAt: "2025-09-08T00:00:00.000Z",
    });
  });

  it("maps DisasterAware hazard IDs, layer and source timestamps", () => {
    const hazards = adaptDisasterAwareHazards([
      {
        hazard_ID: 101,
        hazard_Name: "Test flood",
        type_ID: "FLOOD",
        latitude: 31.23,
        longitude: 121.47,
        creator: "DisasterAWARE",
        description: "Flood fixture",
        severity_ID: "HIGH",
        create_Date: "2025-09-07T00:00:00.000Z",
        last_Update: "2025-09-08T00:00:00.000Z",
      },
      {
        hazard_Name: "Missing ID",
        type_ID: "FLOOD",
        latitude: 1,
        longitude: 2,
      },
    ]);

    expect(hazards).toHaveLength(1);
    const hazard = hazards[0] as unknown as Record<string, unknown>;
    assertCanonicalEvent(hazard, {
      eventId: "disasteraware:101",
      sourceEventId: "101",
      sourceId: "disasteraware",
      layerId: "hydrological",
      type: "FLOOD",
      observedAt: "2025-09-07T00:00:00.000Z",
      timestamp: "2025-09-07T00:00:00.000Z",
      updatedAt: "2025-09-08T00:00:00.000Z",
    });
  });
});
