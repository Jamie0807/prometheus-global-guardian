/** 验证 DisasterAWARE 客户端的授权、请求和故障处理。 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ActiveHazard } from "../../src/types";

const { authFetchMock, authorizeMock, getAccessTokenMock, warnMock } = vi.hoisted(() => ({
  authFetchMock: vi.fn(),
  authorizeMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock("../../src/services/auth/authService", () => ({
  authFetch: authFetchMock,
  authorize: authorizeMock,
  getAccessToken: getAccessTokenMock,
}));

vi.mock("../../src/utils/logger", () => ({
  createClientLogger: () => ({ warn: warnMock }),
}));

import {
  fetchActiveHazardsByCategory,
  fetchHazardsActive,
  fetchHazardTypes,
} from "../../src/services/hazards/hazardService";
import {
  parseActiveHazards,
  parseHazardTypes,
} from "../../src/services/hazards/contracts/disasterAware";

const activeHazard = {
  app_ID: 1,
  app_IDs: "1",
  autoexpire: "false",
  category_ID: "EVENT",
  charter_Uri: "",
  comment_Text: "",
  create_Date: "2026-09-03T00:00:00.000Z",
  creator: "Vitest",
  end_Date: "",
  glide_Uri: "",
  hazard_ID: 101,
  hazard_Name: "Test Flood",
  last_Update: "2026-09-03T00:00:00.000Z",
  latitude: 0,
  longitude: 0,
  master_Incident_ID: "test-101",
  message_ID: "test-message-101",
  org_ID: 1,
  severity_ID: "HIGH",
  snc_url: "",
  start_Date: "2026-09-03T00:00:00.000Z",
  status: "ACTIVE",
  type_ID: "FLOOD",
  update_Date: "2026-09-03T00:00:00.000Z",
  update_User: null,
  product_total: "0",
  uuid: "test-101",
  in_Dashboard: "true",
  areabrief_url: null,
  description: "Test hazard",
  roles: [],
} satisfies ActiveHazard;

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DisasterAware contracts", () => {
  it("accepts hazard types without an optional icon", () => {
    expect(parseHazardTypes([{ type_id: "FLOOD", type_name: "Flood" }])).toEqual([
      { type_id: "FLOOD", type_name: "Flood" },
    ]);
  });

  it("preserves zero coordinates and nullable fields in a complete active hazard", () => {
    expect(parseActiveHazards([activeHazard])).toEqual([activeHazard]);
  });

  it("rejects a non-array root and any invalid hazard type record", () => {
    expect(() => parseHazardTypes({ type_id: "FLOOD", type_name: "Flood" })).toThrowError(
      expect.objectContaining({ name: "HazardContractError", path: "response" }),
    );
    expect(() =>
      parseHazardTypes([
        { type_id: "FLOOD", type_name: "Flood" },
        { type_id: "WILDFIRE", type_name: 7 },
      ]),
    ).toThrowError(
      expect.objectContaining({ name: "HazardContractError", path: "hazardTypes.1.type_name" }),
    );
  });

  it.each([
    ["string app_ID", { ...activeHazard, app_ID: "1" }],
    ["non-finite latitude", { ...activeHazard, latitude: Number.NaN }],
    ["non-finite longitude", { ...activeHazard, longitude: Number.POSITIVE_INFINITY }],
    ["missing roles", { ...activeHazard, roles: undefined }],
  ])("rejects an active hazard with %s", (_caseName, invalidHazard) => {
    expect(() => parseActiveHazards([invalidHazard])).toThrowError(
      expect.objectContaining({ name: "HazardContractError" }),
    );
  });
});

describe("DisasterAware hazard service", () => {
  beforeEach(() => {
    authFetchMock.mockReset();
    authorizeMock.mockReset().mockResolvedValue(undefined);
    getAccessTokenMock.mockReset().mockReturnValue("access-token");
    warnMock.mockReset();
  });

  it("authorizes first and returns valid hazard types", async () => {
    getAccessTokenMock.mockReturnValue("");
    authFetchMock.mockResolvedValue(jsonResponse([{ type_id: "FLOOD", type_name: "Flood" }]));

    await expect(fetchHazardTypes()).resolves.toEqual([{ type_id: "FLOOD", type_name: "Flood" }]);
    expect(authorizeMock).toHaveBeenCalledOnce();
    expect(authFetchMock).toHaveBeenCalledWith("/api/hazards/types");
    expect(authorizeMock.mock.invocationCallOrder[0]).toBeLessThan(
      authFetchMock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("degrades an invalid hazard type root with the fixed log event", async () => {
    authFetchMock.mockResolvedValue(jsonResponse({ type_id: "FLOOD", type_name: "Flood" }));

    await expect(fetchHazardTypes()).resolves.toEqual([]);
    expect(warnMock).toHaveBeenCalledWith("hazard_types_fetch_failed");
  });

  it("returns a complete active hazard through the service boundary", async () => {
    authFetchMock.mockResolvedValue(jsonResponse([activeHazard]));

    await expect(fetchHazardsActive("ALL")).resolves.toEqual([activeHazard]);
    expect(authFetchMock).toHaveBeenCalledWith("/api/hazards/active");
    expect(warnMock).not.toHaveBeenCalled();
  });

  it("degrades any invalid active hazard record with the fixed log event", async () => {
    authFetchMock.mockResolvedValue(
      jsonResponse([activeHazard, { ...activeHazard, app_ID: "101" }]),
    );

    await expect(fetchHazardsActive()).resolves.toEqual([]);
    expect(warnMock).toHaveBeenCalledWith("active_hazards_fetch_failed");
  });

  it("preserves encoded category paths while degrading invalid data", async () => {
    authFetchMock.mockResolvedValue(jsonResponse([{ ...activeHazard, roles: undefined }]));

    await expect(fetchHazardsActive("FLOOD/../")).resolves.toEqual([]);
    expect(authFetchMock).toHaveBeenCalledWith("/api/hazards/active/category/FLOOD%2F..%2F");
    expect(warnMock).toHaveBeenCalledWith("active_hazards_fetch_failed");
  });

  it("uses the active hazard parser and fixed log context for category requests", async () => {
    authFetchMock.mockResolvedValue(jsonResponse([{ ...activeHazard, longitude: Number.NaN }]));

    await expect(fetchActiveHazardsByCategory("FLOOD")).resolves.toEqual([]);
    expect(warnMock).toHaveBeenCalledWith("active_hazards_category_fetch_failed", {
      categoryId: "FLOOD",
    });
  });

  it.each([undefined, jsonResponse({ message: "unavailable" }, 503)])(
    "degrades a missing or failed HTTP response without leaking it",
    async (response) => {
      authFetchMock.mockResolvedValue(response);

      await expect(fetchHazardTypes()).resolves.toEqual([]);
      expect(warnMock).toHaveBeenCalledWith("hazard_types_fetch_failed");
    },
  );
});
