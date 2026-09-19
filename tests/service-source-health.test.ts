import { describe, expect, it } from "vitest";

import { createHazardSourceHealthRegistry } from "../server/hazards/source-health";

const at = (value: string) => new Date(value);

describe("HazardSourceHealthRegistry", () => {
  it("returns an empty five-minute snapshot before any attempts", () => {
    const registry = createHazardSourceHealthRegistry();

    expect(registry.snapshot("usgs", at("2026-09-19T00:00:00.000Z"))).toEqual({
      windowMs: 300000,
      attempts: 0,
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
    });
  });

  it("counts a success and exposes its latency and timestamps", () => {
    const registry = createHazardSourceHealthRegistry();
    const successAt = at("2026-09-19T00:01:00.000Z");

    registry.recordSuccess("usgs", 121.6, successAt);

    expect(registry.snapshot("usgs", at("2026-09-19T00:02:00.000Z"))).toEqual({
      windowMs: 300000,
      attempts: 1,
      successes: 1,
      failures: 0,
      successRate: 1,
      averageLatencyMs: 122,
      lastLatencyMs: 122,
      lastAttemptAt: successAt.toISOString(),
      lastSuccessAt: successAt.toISOString(),
      consecutiveFailures: 0,
    });
  });

  it("treats an empty upstream result as a success", () => {
    const registry = createHazardSourceHealthRegistry();
    const successAt = at("2026-09-19T00:01:00.000Z");

    registry.recordSuccess("nasa-eonet", 0, successAt);

    expect(registry.snapshot("nasa-eonet", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      attempts: 1,
      successes: 1,
      failures: 0,
      successRate: 1,
      averageLatencyMs: 0,
      consecutiveFailures: 0,
    });
  });

  it("counts a failure and exposes its stable error code", () => {
    const registry = createHazardSourceHealthRegistry();
    const failureAt = at("2026-09-19T00:01:00.000Z");

    registry.recordFailure("gdacs", 240.4, "HTTP_ERROR", failureAt);

    expect(registry.snapshot("gdacs", at("2026-09-19T00:02:00.000Z"))).toEqual({
      windowMs: 300000,
      attempts: 1,
      successes: 0,
      failures: 1,
      successRate: 0,
      averageLatencyMs: 240,
      lastLatencyMs: 240,
      lastAttemptAt: failureAt.toISOString(),
      consecutiveFailures: 1,
      lastErrorCode: "HTTP_ERROR",
    });
  });

  it("excludes an event exactly at the five-minute window boundary", () => {
    const registry = createHazardSourceHealthRegistry();
    const now = at("2026-09-19T00:05:00.000Z");

    registry.recordSuccess("usgs", 10, at("2026-09-19T00:00:00.000Z"));

    expect(registry.snapshot("usgs", now)).toEqual({
      windowMs: 300000,
      attempts: 0,
      successes: 0,
      failures: 0,
      consecutiveFailures: 0,
    });
  });

  it("cleans up expired records while retaining records inside the window", () => {
    const registry = createHazardSourceHealthRegistry();
    const now = at("2026-09-19T00:05:00.000Z");

    registry.recordFailure("usgs", 100, "TIMEOUT", at("2026-09-19T00:00:00.000Z"));
    registry.recordSuccess("usgs", 200, at("2026-09-19T00:00:00.001Z"));

    expect(registry.snapshot("usgs", now)).toMatchObject({
      attempts: 1,
      successes: 1,
      failures: 0,
      lastLatencyMs: 200,
    });
  });

  it("resets consecutive failures after a success", () => {
    const registry = createHazardSourceHealthRegistry();
    const firstFailure = at("2026-09-19T00:01:00.000Z");

    registry.recordFailure("usgs", 100, "TIMEOUT", firstFailure);
    registry.recordFailure("usgs", 110, "HTTP_ERROR", at("2026-09-19T00:01:01.000Z"));
    registry.recordSuccess("usgs", 120, at("2026-09-19T00:01:02.000Z"));

    expect(registry.snapshot("usgs", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      attempts: 3,
      successes: 1,
      failures: 2,
      consecutiveFailures: 0,
      lastErrorCode: "HTTP_ERROR",
    });
  });

  it("retains the most recent failure code after a later success", () => {
    const registry = createHazardSourceHealthRegistry();

    registry.recordFailure("usgs", 100, "TIMEOUT", at("2026-09-19T00:01:00.000Z"));
    registry.recordSuccess("usgs", 120, at("2026-09-19T00:01:01.000Z"));

    expect(registry.snapshot("usgs", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      lastSuccessAt: "2026-09-19T00:01:01.000Z",
      lastErrorCode: "TIMEOUT",
    });
  });

  it("rounds latency values to integers and ignores negative latency", () => {
    const registry = createHazardSourceHealthRegistry();

    registry.recordSuccess("usgs", -1, at("2026-09-19T00:01:00.000Z"));
    registry.recordSuccess("usgs", 10.4, at("2026-09-19T00:01:01.000Z"));
    registry.recordSuccess("usgs", 11.6, at("2026-09-19T00:01:02.000Z"));

    expect(registry.snapshot("usgs", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      attempts: 2,
      averageLatencyMs: 11,
      lastLatencyMs: 12,
    });
  });

  it("keeps health events isolated between sources", () => {
    const registry = createHazardSourceHealthRegistry();

    registry.recordFailure("usgs", 100, "TIMEOUT", at("2026-09-19T00:01:00.000Z"));
    registry.recordSuccess("nasa-eonet", 200, at("2026-09-19T00:01:00.000Z"));

    expect(registry.snapshot("usgs", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      attempts: 1,
      failures: 1,
      consecutiveFailures: 1,
    });
    expect(registry.snapshot("nasa-eonet", at("2026-09-19T00:02:00.000Z"))).toMatchObject({
      attempts: 1,
      successes: 1,
      failures: 0,
      consecutiveFailures: 0,
    });
  });
});
