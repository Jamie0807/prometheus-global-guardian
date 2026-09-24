/** 验证分析服务通用响应契约的解析和类型约束。 */
import { describe, expect, expectTypeOf, it } from "vitest";
import { readFileSync } from "node:fs";
import type {
  AnalyticsResponse,
  LegacyAnalyticsResponse,
} from "../apps/web/src/services/analytics/analyticsTypes";

import {
  AnalyticsContractError,
  AnalyticsBusinessError,
  parseAnalyticsSuccess,
  parseFiniteNumber,
  parseNumberMap,
  parseOptionalFiniteNumber,
  parseRecord,
  parseString,
  parseStringArray,
} from "../apps/web/src/services/analytics/contracts/common";

describe("analytics response contracts", () => {
  it("parses the shared versioned response envelope and preserves metadata", () => {
    const fixture = JSON.parse(
      readFileSync(
        new URL("../packages/contracts/analytics-response-envelope.json", import.meta.url),
        "utf8",
      ),
    ) as unknown;

    expect(parseAnalyticsSuccess(fixture, (value) => parseRecord(value, "data"))).toMatchObject({
      schemaVersion: "1.0",
      requestId: "fixture-request-id",
      generatedAt: "2026-09-19T00:00:00Z",
      modelVersion: "analytics-model-v1",
      inputSnapshotId: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      warnings: [],
    });
  });

  it("parses the shared error envelope without exposing service details", () => {
    const fixture = JSON.parse(
      readFileSync("packages/contracts/analytics-error-envelope.json", "utf8"),
    ) as unknown;

    expect(() => parseAnalyticsSuccess(fixture, () => ({}))).toThrowError(
      expect.objectContaining({
        code: "ANALYTICS_REQUEST_FAILED",
        serviceCode: "ANALYTICS_INTERNAL_ERROR",
        requestId: "fixture-request-id",
      }),
    );
  });

  it("rejects a partial versioned metadata envelope", () => {
    expect(() =>
      parseAnalyticsSuccess(
        { success: true, data: {}, schemaVersion: "1.0", requestId: "request-only" },
        () => ({}),
      ),
    ).toThrowError(expect.objectContaining({ path: "response.generatedAt" }));
  });

  it("rejects non-record values and accepts plain objects", () => {
    expect(parseRecord({ value: 1 }, "data")).toEqual({ value: 1 });
    for (const value of [null, [], "object", 1]) {
      expect(() => parseRecord(value, "data")).toThrowError(AnalyticsContractError);
    }
  });

  it("preserves zero and rejects non-finite numbers", () => {
    expect(parseFiniteNumber(0, "score")).toBe(0);
    expect(() => parseFiniteNumber("1", "score")).toThrow();
    expect(() => parseFiniteNumber(Number.NaN, "score")).toThrow();
    expect(() => parseFiniteNumber(Number.POSITIVE_INFINITY, "score")).toThrow();
  });

  it("allows absent or null optional finite numbers", () => {
    expect(parseOptionalFiniteNumber(undefined, "score")).toBeUndefined();
    expect(parseOptionalFiniteNumber(null, "score")).toBeNull();
    expect(parseOptionalFiniteNumber(0, "score")).toBe(0);
    expect(() => parseOptionalFiniteNumber("1", "score")).toThrow();
  });

  it("parses strings, string arrays, and number maps", () => {
    expect(parseString("risk", "data.label")).toBe("risk");
    expect(parseStringArray(["risk", "weather"], "data.types")).toEqual(["risk", "weather"]);
    expect(parseNumberMap({ risk: 0, weather: 1.5 }, "data.scores")).toEqual({
      risk: 0,
      weather: 1.5,
    });
    expect(() => parseStringArray(["risk", 1], "data.types")).toThrow();
    expect(() => parseNumberMap({ risk: Number.NaN }, "data.scores")).toThrow();
  });

  it("accepts a successful response with optional metadata and ignores unknown fields", () => {
    expect(
      parseAnalyticsSuccess(
        {
          success: true,
          data: { score: 0 },
          processingTime: 12,
          timestamp: "2026-09-10T00:00:00Z",
          extra: { private: "payload" },
        },
        (value) => parseRecord(value, "data"),
      ),
    ).toEqual({
      success: true,
      data: { score: 0 },
      processingTime: 12,
      timestamp: "2026-09-10T00:00:00Z",
    });
  });

  it("validates present metadata and preserves exact error paths", () => {
    for (const processingTime of ["12", null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        parseAnalyticsSuccess({ success: true, data: {}, processingTime }, () => ({})),
      ).toThrowError(expect.objectContaining({ path: "response.processingTime" }));
    }
    for (const timestamp of [12, null]) {
      expect(() =>
        parseAnalyticsSuccess({ success: true, data: {}, timestamp }, () => ({})),
      ).toThrowError(expect.objectContaining({ path: "response.timestamp" }));
    }
  });

  it("rejects missing or false success and missing data", () => {
    for (const value of [null, [], { data: {} }, { success: true }]) {
      expect(() => parseAnalyticsSuccess(value, () => ({}))).toThrowError(
        expect.objectContaining({ code: "ANALYTICS_RESPONSE_INVALID" }),
      );
    }
  });

  it("keeps explicit business failures separate from malformed contracts", () => {
    expect(() =>
      parseAnalyticsSuccess(
        { success: false, data: { secret: "sensitive-body-marker" } },
        () => ({}),
      ),
    ).toThrowError(AnalyticsBusinessError);
    try {
      parseAnalyticsSuccess({ success: false, error: "sensitive-body-marker" }, () => ({}));
    } catch (error) {
      expect(error).toMatchObject({ code: "ANALYTICS_REQUEST_FAILED" });
      expect(String(error)).not.toContain("sensitive-body-marker");
    }
  });

  it("reports nested paths with a stable code without serializing the response", () => {
    let error: unknown;
    try {
      parseFiniteNumber("secret-value", "data.overallRiskScore.score");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(AnalyticsContractError);
    expect(error).toMatchObject({
      code: "ANALYTICS_RESPONSE_INVALID",
      path: "data.overallRiskScore.score",
    });
    expect(String(error)).not.toContain("secret-value");
    expect(String(error)).not.toContain("{");
  });

  it("sanitizes dynamic dictionary keys in contract error paths", () => {
    const sensitiveKey = "sensitive-hazard-title-with-secret";
    expect(() => parseNumberMap({ [sensitiveKey]: "bad" }, "data.modelWeights")).toThrowError(
      expect.objectContaining({ path: "data.modelWeights.[key]" }),
    );
    expect(() => parseNumberMap({ [sensitiveKey]: "bad" }, "data.modelWeights")).toThrowError(
      expect.not.objectContaining({ message: expect.stringContaining(sensitiveKey) }),
    );
  });

  it("keeps legacy responses separate from verified success responses", () => {
    expectTypeOf<LegacyAnalyticsResponse<{ score: number }>>().toMatchTypeOf<{
      data?: { score: number };
    }>();
    expectTypeOf<AnalyticsResponse<{ score: number }>>().toEqualTypeOf<{
      success: true;
      data: { score: number };
      schemaVersion?: string;
      requestId?: string;
      generatedAt?: string;
      modelVersion?: string;
      inputSnapshotId?: string;
      warnings?: string[];
      processingTime?: number;
      timestamp?: string;
    }>();
  });

  it("does not expose response body text for business failures", () => {
    const response = { success: false, data: { secret: "sensitive-body-marker" } };
    try {
      parseAnalyticsSuccess(response, () => ({}));
      throw new Error("expected contract failure");
    } catch (error) {
      expect(error).toMatchObject({ code: "ANALYTICS_REQUEST_FAILED" });
      expect(String(error)).not.toContain("sensitive-body-marker");
      expect(String(error)).not.toContain(JSON.stringify(response));
    }
  });
});
