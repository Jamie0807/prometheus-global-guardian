/** 验证灾害数据源客户端的请求、契约解析和元数据处理。 */
import { afterEach, describe, expect, it, vi } from "vitest";

const { requestJsonMock } = vi.hoisted(() => ({ requestJsonMock: vi.fn() }));

vi.mock("../../src/services/http/httpClient", () => ({ requestJson: requestJsonMock }));

import { fetchHazardFeed } from "../../src/services/hazards/hazardService";
import { parseHazardFeed } from "../../src/services/hazards/contracts/hazardFeed";
import type { HazardFeedResponse } from "../../src/types";

const feed = {
  hazards: [
    {
      id: "hazard-1",
      title: "Test flood",
      type: "FLOOD",
      geometry: { type: "Point", coordinates: [120, 30] },
      description: "Test flood",
      source: "DisasterAWARE",
    },
  ],
  meta: {
    primary: "disasteraware",
    fallbackUsed: false,
    stale: false,
    generatedAt: "2026-09-09T00:00:00.000Z",
    sources: [
      { id: "disasteraware", status: "success", count: 1 },
      { id: "usgs", status: "fallback", count: 0 },
      { id: "nasa-eonet", status: "fallback", count: 0 },
      { id: "gdacs", status: "fallback", count: 0 },
    ],
  },
} satisfies HazardFeedResponse;

const canonicalFeed = {
  hazards: [
    {
      schemaVersion: "1",
      eventId: "usgs:quake-1",
      sourceEventId: "quake-1",
      sourceId: "usgs",
      layerId: "earthquake",
      id: "usgs:quake-1",
      title: "M 5.2 - Test Region",
      type: "EARTHQUAKE",
      geometry: { type: "Point", coordinates: [120, 30] },
      description: "Test earthquake",
      source: "USGS",
      severity: "WATCH",
      magnitude: 5.2,
      observedAt: "2026-09-09T00:00:00.000Z",
      timestamp: "2026-09-09T00:00:00.000Z",
    },
  ],
  meta: feed.meta,
};

const normalizedLegacyHazard = {
  ...feed.hazards[0],
  schemaVersion: "1",
  eventId: "disasteraware:hazard-1",
  sourceEventId: "hazard-1",
  sourceId: "disasteraware",
  layerId: "hydrological",
};

describe("hazard feed service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns hazards and source metadata from the unified BFF endpoint", async () => {
    requestJsonMock.mockResolvedValue(feed);

    await expect(fetchHazardFeed("FLOOD")).resolves.toEqual({
      ...feed,
      hazards: [normalizedLegacyHazard],
    });
    expect(requestJsonMock).toHaveBeenCalledWith("/api/hazards?type=FLOOD", {
      signal: undefined,
    });
  });

  it("accepts an empty hazard description returned by the unified BFF endpoint", async () => {
    const feedWithEmptyDescription = {
      ...feed,
      hazards: [{ ...feed.hazards[0], description: "" }],
    };
    requestJsonMock.mockResolvedValue(feedWithEmptyDescription);

    await expect(fetchHazardFeed()).resolves.toEqual({
      ...feedWithEmptyDescription,
      hazards: [{ ...normalizedLegacyHazard, description: "" }],
    });
  });

  it("normalizes canonical event fields while retaining legacy aliases", () => {
    expect(parseHazardFeed(canonicalFeed).hazards[0]).toEqual(canonicalFeed.hazards[0]);
  });

  it("always normalizes a canonical hazard id to its event id", () => {
    const canonicalHazardWithLegacyId = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], id: "legacy-id" }],
    };

    expect(parseHazardFeed(canonicalHazardWithLegacyId).hazards[0]).toMatchObject({
      id: "usgs:quake-1",
      eventId: "usgs:quake-1",
    });
  });

  it("normalizes an unknown canonical layer id to unknown", () => {
    const canonicalHazardWithFutureLayer = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], layerId: "future-layer" }],
    };

    expect(parseHazardFeed(canonicalHazardWithFutureLayer).hazards[0]?.layerId).toBe("unknown");
  });

  it("normalizes a legacy hazard into the canonical event shape", () => {
    expect(parseHazardFeed(feed).hazards[0]).toMatchObject({
      schemaVersion: "1",
      eventId: "disasteraware:hazard-1",
      sourceEventId: "hazard-1",
      sourceId: "disasteraware",
      layerId: "hydrological",
      id: "hazard-1",
      source: "DisasterAWARE",
    });
  });

  it("rejects a canonical hazard whose event ID does not match its source event ID", () => {
    const invalidFeed = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], eventId: "gdacs:quake-1" }],
    };

    expect(() => parseHazardFeed(invalidFeed)).toThrowError(
      expect.objectContaining({ code: "invalid_response", path: "hazards.0.eventId" }),
    );
  });

  it("rejects a canonical hazard with a blank source event ID as a contract error", () => {
    const invalidFeed = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], sourceEventId: " ", eventId: "usgs: " }],
    };

    expect(() => parseHazardFeed(invalidFeed)).toThrowError(
      expect.objectContaining({
        name: "HazardContractError",
        code: "invalid_response",
        path: "hazards.0.sourceEventId",
      }),
    );
  });

  it("rejects a canonical hazard with confidence outside the supported range", () => {
    const invalidFeed = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], confidence: 1.1 }],
    };

    expect(() => parseHazardFeed(invalidFeed)).toThrowError(
      expect.objectContaining({ code: "invalid_response", path: "hazards.0.confidence" }),
    );
  });

  it("rejects a canonical hazard with an unknown schema version", () => {
    const invalidFeed = {
      ...canonicalFeed,
      hazards: [{ ...canonicalFeed.hazards[0], schemaVersion: "2" }],
    };

    expect(() => parseHazardFeed(invalidFeed)).toThrowError(
      expect.objectContaining({ code: "invalid_response", path: "hazards.0.schemaVersion" }),
    );
  });

  it("forwards the caller cancellation signal to the unified BFF request", async () => {
    requestJsonMock.mockResolvedValue(feed);
    const controller = new AbortController();

    await expect(fetchHazardFeed("FLOOD", controller.signal)).resolves.toEqual({
      ...feed,
      hazards: [normalizedLegacyHazard],
    });

    expect(requestJsonMock).toHaveBeenCalledWith("/api/hazards?type=FLOOD", {
      signal: controller.signal,
    });
  });

  it("rejects a BFF response whose hazards field is not an array without leaking fixture data", async () => {
    const secret = "fixture-secret-hazards";
    requestJsonMock.mockResolvedValue({ ...feed, hazards: secret });

    const error = await fetchHazardFeed().catch((caught: unknown) => caught);

    expect(error).toEqual(expect.objectContaining({ code: "invalid_response", path: "hazards" }));
    expect(String(error)).not.toContain(secret);
  });

  it("rejects a BFF response with an unknown primary source without leaking fixture data", async () => {
    const secret = "fixture-secret-primary";
    const invalidFeed = { ...feed, meta: { ...feed.meta, primary: secret } };
    requestJsonMock.mockResolvedValue(invalidFeed);

    expect(() => parseHazardFeed(invalidFeed)).toThrowError(
      expect.objectContaining({ code: "invalid_response", path: "meta.primary" }),
    );
    const error = await fetchHazardFeed().catch((caught: unknown) => caught);
    expect(error).toEqual(
      expect.objectContaining({ code: "invalid_response", path: "meta.primary" }),
    );
    expect(String(error)).not.toContain(secret);
  });

  it("rejects a BFF response with a negative source count without leaking fixture data", async () => {
    const secret = "fixture-secret-count";
    requestJsonMock.mockResolvedValue({
      ...feed,
      meta: {
        ...feed.meta,
        sources: [{ ...feed.meta.sources[0], count: -1, message: secret }],
      },
    });

    const error = await fetchHazardFeed().catch((caught: unknown) => caught);

    expect(error).toEqual(
      expect.objectContaining({ code: "invalid_response", path: "meta.sources.0.count" }),
    );
    expect(String(error)).not.toContain(secret);
  });

  it("rejects a BFF hazard without geometry coordinates without leaking fixture data", async () => {
    const secret = "fixture-secret-geometry";
    requestJsonMock.mockResolvedValue({
      ...feed,
      hazards: [
        {
          ...feed.hazards[0],
          description: secret,
          geometry: { type: "Point" },
        },
      ],
    });

    const error = await fetchHazardFeed().catch((caught: unknown) => caught);

    expect(error).toEqual(
      expect.objectContaining({
        code: "invalid_response",
        path: "hazards.0.geometry.coordinates",
      }),
    );
    expect(String(error)).not.toContain(secret);
  });
});
