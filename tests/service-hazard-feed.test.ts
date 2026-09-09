import { afterEach, describe, expect, it, vi } from "vitest";

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
    vi.unstubAllGlobals();
  });

  it("returns hazards and source metadata from the unified BFF endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(feed), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHazardFeed("FLOOD")).resolves.toEqual(feed);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/hazards?type=FLOOD",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
