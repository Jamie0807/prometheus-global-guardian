import { afterEach, describe, expect, it, vi } from "vitest";

const { requestJsonMock } = vi.hoisted(() => ({ requestJsonMock: vi.fn() }));

vi.mock("../src/services/http/httpClient", () => ({ requestJson: requestJsonMock }));

import { fetchHazardFeed } from "../src/services/hazards/hazardService";
import type { HazardFeedResponse } from "../src/types";

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

describe("hazard feed service", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns hazards and source metadata from the unified BFF endpoint", async () => {
    requestJsonMock.mockResolvedValue(feed);

    await expect(fetchHazardFeed("FLOOD")).resolves.toEqual(feed);
    expect(requestJsonMock).toHaveBeenCalledWith("/api/hazards?type=FLOOD", {
      signal: undefined,
    });
  });

  it("forwards the caller cancellation signal to the unified BFF request", async () => {
    requestJsonMock.mockResolvedValue(feed);
    const controller = new AbortController();

    await expect(fetchHazardFeed("FLOOD", controller.signal)).resolves.toEqual(feed);

    expect(requestJsonMock).toHaveBeenCalledWith("/api/hazards?type=FLOOD", {
      signal: controller.signal,
    });
  });
});
