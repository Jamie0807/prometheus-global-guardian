/** 验证 BFF 认证、灾害代理、缓存回退和请求安全边界。 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import test from "node:test";

import { Headers, Response, type HeadersInit } from "node-fetch";

import { createApp, type UpstreamFetch } from "../apps/bff/index.js";
import { prisma } from "../apps/bff/db/prisma.js";
import { fetchAllHazards } from "../apps/bff/hazards/hazard-source.js";
import {
  createForwardHeaders,
  createRateLimitMiddleware,
  createRawBodyMiddleware,
  fetchWithTimeout,
  matchDisasterAwareRoute,
  RequestBoundaryError,
  validateQuery,
} from "../apps/bff/security/request-boundaries.js";

const serverEnv = {
  AUTH_CSRF_SECRET: "server-auth-test-csrf-secret-at-least-32-bytes",
  DISASTERAWARE_USERNAME: "server-user",
  DISASTERAWARE_PASSWORD: "server-password",
  NODE_ENV: "test",
} satisfies NodeJS.ProcessEnv;

const rawFetch = globalThis.fetch.bind(globalThis);
const TEST_PASSWORD = "LocalTest-Password-2026!";
const authenticatedOrigins = new Map<string, { cookie: string; csrfToken: string }>();

async function fetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<globalThis.Response> {
  const inputUrl = input instanceof Request ? input.url : String(input);
  const origin = new URL(inputUrl).origin;
  const auth = authenticatedOrigins.get(origin);
  if (!auth) return rawFetch(input, init);

  const headers = new globalThis.Headers(input instanceof Request ? input.headers : init?.headers);
  headers.set("cookie", auth.cookie);
  headers.set("origin", origin);
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("x-csrf-token", auth.csrfToken);
  return rawFetch(input, { ...init, headers });
}

function readForwardedHeader(headers: HeadersInit | undefined, name: string): string | undefined {
  return headers ? (new Headers(headers).get(name) ?? undefined) : undefined;
}

async function readErrorCode(response: { json: () => Promise<unknown> }): Promise<string> {
  const body = (await response.json()) as { code?: unknown };
  if (typeof body.code !== "string") {
    throw new Error("Expected an API error code.");
  }
  return body.code;
}

function sourceSummaries(sources: Array<{ id: string; status: string; count: number }>): unknown[] {
  return sources.map(({ id, status, count }) => ({ id, status, count }));
}

async function startTestApp(
  fetchImpl: UpstreamFetch,
  envOverrides: NodeJS.ProcessEnv = {},
  fetchHazards: typeof fetchAllHazards = async () => ({
    hazards: [],
    sources: [
      { id: "usgs", status: "empty", count: 0 },
      { id: "nasa-eonet", status: "empty", count: 0 },
      { id: "gdacs", status: "empty", count: 0 },
    ],
  }),
  now?: () => Date,
) {
  const app = createApp({
    env: { ...serverEnv, ...envOverrides },
    fetchImpl,
    fetchHazards,
    ...(now ? { now } : {}),
  } as unknown as Parameters<typeof createApp>[0]);
  const server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const email = `server-auth-${randomUUID()}@example.test`;
  const registration = await rawFetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  if (registration.status !== 201) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    throw new Error(`Could not register BFF test user (${registration.status}).`);
  }
  const cookieHeader = registration.headers.get("set-cookie");
  const registrationPayload: unknown = await registration.json();
  if (
    !cookieHeader ||
    !isRecord(registrationPayload) ||
    typeof registrationPayload.csrfToken !== "string"
  ) {
    throw new Error("BFF test registration did not return session credentials.");
  }
  authenticatedOrigins.set(baseUrl, {
    cookie: cookieHeader.split(";", 1)[0] ?? "",
    csrfToken: registrationPayload.csrfToken,
  });
  const conversationId = randomUUID();
  return {
    app,
    baseUrl,
    conversationId,
    close: async () => {
      authenticatedOrigins.delete(baseUrl);
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

test("POST /api/authorize uses server credentials without exposing the upstream token", async (t) => {
  const calls: Parameters<UpstreamFetch>[] = [];
  const fetchImpl: UpstreamFetch = async (...args) => {
    calls.push(args);
    return new Response(
      JSON.stringify({
        accessToken: "server-access-token",
        refreshToken: "server-refresh-token",
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const testApp = await startTestApp(fetchImpl);
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/authorize`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "browser-user", password: "browser-password" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { authorized: true });
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0]?.[0]), "https://api.disasteraware.com/authorize");
  assert.deepEqual(JSON.parse(String(calls[0]?.[1]?.body)), {
    username: "server-user",
    password: "server-password",
  });
});

test("protected hazard proxy injects its token and refreshes once after an upstream 401", async (t) => {
  const authorizationHeaders: Array<string | undefined> = [];
  let authorizationCount = 0;
  const fetchImpl: UpstreamFetch = async (url, init) => {
    if (String(url).endsWith("/authorize")) {
      authorizationCount += 1;
      return new Response(JSON.stringify({ accessToken: `token-${authorizationCount}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    authorizationHeaders.push(
      init?.headers instanceof Headers
        ? (init.headers.get("authorization") ?? undefined)
        : (init?.headers as Record<string, string> | undefined)?.authorization,
    );

    if (authorizationHeaders.length === 1) {
      return new Response("expired", { status: 401 });
    }

    return new Response(JSON.stringify([{ id: "hazard-1" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const testApp = await startTestApp(fetchImpl);
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards/active?limit=1`, {
    headers: { authorization: "Bearer browser-controlled-token" },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), [{ id: "hazard-1" }]);
  assert.equal(authorizationCount, 2);
  assert.deepEqual(authorizationHeaders, ["Bearer token-1", "Bearer token-2"]);
});

test("GET /api/hazards prefers DisasterAWARE and does not request fallback sources", async (t) => {
  const urls: string[] = [];
  let fallbackCalls = 0;
  const testApp = await startTestApp(
    async (url) => {
      urls.push(url);
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return new Response(
        JSON.stringify([
          {
            hazard_ID: 1,
            hazard_Name: "Primary flood",
            type_ID: "FLOOD",
            latitude: 31.23,
            longitude: 121.47,
            creator: "DisasterAWARE",
            description: "Primary fixture",
            severity_ID: "HIGH",
            create_Date: "2026-09-09T00:00:00.000Z",
          },
        ]),
        { headers: { "content-type": "application/json" } },
      );
    },
    {},
    async () => {
      fallbackCalls += 1;
      return { hazards: [], sources: [] };
    },
    () => new Date("2026-09-09T00:00:00.000Z"),
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    hazards: Array<{ id: string }>;
    meta: {
      primary: string;
      fallbackUsed: boolean;
      generatedAt: string;
      stale: boolean;
      sources: Array<{
        id: string;
        status: string;
        count: number;
        fetchedAt?: string;
        health?: Record<string, unknown>;
      }>;
    };
  };
  assert.deepEqual(body.hazards, [
    {
      schemaVersion: "1",
      eventId: "disasteraware:1",
      sourceEventId: "1",
      sourceId: "disasteraware",
      layerId: "hydrological",
      id: "disasteraware:1",
      title: "Primary flood",
      type: "FLOOD",
      geometry: { type: "Point", coordinates: [121.47, 31.23] },
      description: "Primary fixture",
      source: "DisasterAWARE",
      severity: "HIGH",
      timestamp: "2026-09-09T00:00:00.000Z",
      observedAt: "2026-09-09T00:00:00.000Z",
    },
  ]);
  assert.deepEqual(body.meta, {
    primary: "disasteraware",
    fallbackUsed: false,
    generatedAt: body.meta.generatedAt,
    stale: false,
    sources: [
      {
        id: "disasteraware",
        status: "success",
        count: 1,
        fetchedAt: body.meta.sources[0]?.fetchedAt,
        health: {
          windowMs: 300000,
          attempts: 1,
          successes: 1,
          failures: 0,
          successRate: 1,
          averageLatencyMs: 0,
          lastLatencyMs: 0,
          lastAttemptAt: body.meta.sources[0]?.health?.lastAttemptAt,
          lastSuccessAt: body.meta.sources[0]?.health?.lastSuccessAt,
          consecutiveFailures: 0,
        },
      },
      {
        id: "usgs",
        status: "fallback",
        count: 0,
        health: {
          windowMs: 300000,
          attempts: 0,
          successes: 0,
          failures: 0,
          consecutiveFailures: 0,
        },
      },
      {
        id: "nasa-eonet",
        status: "fallback",
        count: 0,
        health: {
          windowMs: 300000,
          attempts: 0,
          successes: 0,
          failures: 0,
          consecutiveFailures: 0,
        },
      },
      {
        id: "gdacs",
        status: "fallback",
        count: 0,
        health: {
          windowMs: 300000,
          attempts: 0,
          successes: 0,
          failures: 0,
          consecutiveFailures: 0,
        },
      },
    ],
  });
  assert.match(body.meta.generatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(body.meta.sources[0]?.fetchedAt ?? "", /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(urls, [
    "https://api.disasteraware.com/authorize",
    "https://api.disasteraware.com/hazards/active",
  ]);
  assert.equal(fallbackCalls, 0);
});

test("GET /api/hazards serves an unexpired DisasterAWARE cache after both live attempts fail", async (t) => {
  let activeCalls = 0;
  let fallbackCalls = 0;
  let shouldFail = false;
  let currentTime = new Date("2026-09-09T00:00:00.000Z");
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      activeCalls += 1;
      if (shouldFail) return new Response("upstream body must not escape", { status: 502 });
      return new Response(
        JSON.stringify([
          {
            hazard_ID: "cached-1",
            hazard_Name: "Cached flood",
            type_ID: "FLOOD",
            latitude: 31.23,
            longitude: 121.47,
          },
        ]),
        { headers: { "content-type": "application/json" } },
      );
    },
    {},
    async () => {
      fallbackCalls += 1;
      return {
        hazards: [
          {
            schemaVersion: "1",
            eventId: "gdacs:fallback-1",
            sourceEventId: "fallback-1",
            sourceId: "gdacs",
            layerId: "fire",
            id: "gdacs:fallback-1",
            title: "Fallback wildfire",
            type: "WILDFIRE",
            description: "Fallback fixture",
            geometry: { type: "Point", coordinates: [12, 34] },
            source: "GDACS",
          },
        ],
        sources: [
          { id: "usgs", status: "empty", count: 0 },
          { id: "nasa-eonet", status: "empty", count: 0 },
          { id: "gdacs", status: "success", count: 1 },
        ],
      };
    },
    () => currentTime,
  );
  t.after(testApp.close);

  const first = await fetch(`${testApp.baseUrl}/api/hazards`);
  assert.equal(first.status, 200);
  const firstBody = (await first.json()) as {
    meta: {
      sources: Array<{ fetchedAt?: string; health?: { attempts: number; successes: number } }>;
    };
  };
  assert.equal(firstBody.meta.sources[0]?.fetchedAt, "2026-09-09T00:00:00.000Z");
  assert.deepEqual(firstBody.meta.sources[0]?.health, {
    windowMs: 300000,
    attempts: 1,
    successes: 1,
    failures: 0,
    successRate: 1,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    lastAttemptAt: "2026-09-09T00:00:00.000Z",
    lastSuccessAt: "2026-09-09T00:00:00.000Z",
    consecutiveFailures: 0,
  });

  shouldFail = true;
  currentTime = new Date("2026-09-09T00:04:59.999Z");
  const second = await fetch(`${testApp.baseUrl}/api/hazards`);
  assert.equal(second.status, 200);
  const secondBody = (await second.json()) as {
    hazards: Array<{ id: string }>;
    meta: {
      stale: boolean;
      fallbackUsed: boolean;
      sources: Array<{
        status: string;
        fetchedAt?: string;
        health?: {
          attempts: number;
          successes: number;
          failures: number;
          lastErrorCode?: string;
        };
      }>;
    };
  };
  assert.deepEqual(
    secondBody.hazards.map((hazard) => hazard.id),
    ["disasteraware:cached-1", "gdacs:fallback-1"],
  );
  assert.equal(secondBody.meta.stale, true);
  assert.equal(secondBody.meta.fallbackUsed, true);
  assert.equal(secondBody.meta.sources[0]?.status, "stale");
  assert.equal(secondBody.meta.sources[0]?.fetchedAt, "2026-09-09T00:00:00.000Z");
  assert.deepEqual(secondBody.meta.sources[0]?.health, {
    windowMs: 300000,
    attempts: 3,
    successes: 1,
    failures: 2,
    successRate: 1 / 3,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    lastAttemptAt: "2026-09-09T00:04:59.999Z",
    lastSuccessAt: "2026-09-09T00:00:00.000Z",
    consecutiveFailures: 2,
    lastErrorCode: "HTTP_ERROR",
  });
  assert.equal(activeCalls, 3);
  assert.equal(fallbackCalls, 1);
  assert.equal(JSON.stringify(secondBody).includes("upstream body must not escape"), false);
});

test("GET /api/hazards does not serve a DisasterAWARE cache older than five minutes", async (t) => {
  let shouldFail = false;
  let currentTime = new Date("2026-09-09T00:00:00.000Z");
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return shouldFail
        ? new Response("unavailable", { status: 502 })
        : new Response(
            JSON.stringify([
              { hazard_ID: "expired-1", hazard_Name: "Expired", latitude: 0, longitude: 0 },
            ]),
            { headers: { "content-type": "application/json" } },
          );
    },
    {},
    async () => ({ hazards: [], sources: [] }),
    () => currentTime,
  );
  t.after(testApp.close);

  await fetch(`${testApp.baseUrl}/api/hazards`);
  shouldFail = true;
  currentTime = new Date("2026-09-09T00:05:00.001Z");

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  const body = (await response.json()) as {
    hazards: Array<{ id: string }>;
    meta: {
      stale: boolean;
      sources: Array<{
        status: string;
        health?: {
          attempts: number;
          successes: number;
          failures: number;
          successRate?: number;
          averageLatencyMs?: number;
          lastLatencyMs?: number;
          lastAttemptAt?: string;
          consecutiveFailures: number;
          lastErrorCode?: string;
        };
      }>;
    };
  };
  assert.deepEqual(body.hazards, []);
  assert.equal(body.meta.stale, false);
  assert.equal(body.meta.sources[0]?.status, "unavailable");
  assert.deepEqual(body.meta.sources[0]?.health, {
    windowMs: 300000,
    attempts: 2,
    successes: 0,
    failures: 2,
    successRate: 0,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    lastAttemptAt: "2026-09-09T00:05:00.001Z",
    consecutiveFailures: 2,
    lastErrorCode: "HTTP_ERROR",
  });
});

test("GET /api/hazards retries a timed-out DisasterAWARE request once", async (t) => {
  let activeCalls = 0;
  const testApp = await startTestApp(
    async (url, init) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      activeCalls += 1;
      if (activeCalls === 1) {
        return new Promise<never>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        });
      }
      return new Response(
        JSON.stringify([
          { hazard_ID: "retry-1", hazard_Name: "Retried", latitude: 0, longitude: 0 },
        ]),
        { headers: { "content-type": "application/json" } },
      );
    },
    { HAZARD_SOURCE_TIMEOUT_MS: "1" },
    undefined,
    () => new Date("2026-09-09T00:00:00.000Z"),
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  const body = (await response.json()) as {
    hazards: Array<{ id: string }>;
    meta: { stale: boolean; sources: Array<{ status: string }> };
  };
  assert.deepEqual(
    body.hazards.map((hazard) => hazard.id),
    ["disasteraware:retry-1"],
  );
  assert.equal(body.meta.stale, false);
  assert.equal(body.meta.sources[0]?.status, "success");
  assert.deepEqual((body.meta.sources[0] as { health?: unknown }).health, {
    windowMs: 300000,
    attempts: 2,
    successes: 1,
    failures: 1,
    successRate: 0.5,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    lastAttemptAt: (body.meta.sources[0] as { health?: { lastAttemptAt?: string } }).health
      ?.lastAttemptAt,
    lastSuccessAt: (body.meta.sources[0] as { health?: { lastSuccessAt?: string } }).health
      ?.lastSuccessAt,
    consecutiveFailures: 0,
    lastErrorCode: "TIMEOUT",
  });
  assert.equal(activeCalls, 2);
});

test("GET /api/hazards records invalid DisasterAWARE JSON as a stable failed attempt", async (t) => {
  const rawPayload = "unexpected-upstream-payload";
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return new Response(rawPayload, { headers: { "content-type": "application/json" } });
    },
    {},
    async () => ({ hazards: [], sources: [] }),
    () => new Date("2026-09-09T00:00:00.000Z"),
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  const body = (await response.json()) as {
    meta: {
      sources: Array<{
        status: string;
        health?: {
          attempts: number;
          successes: number;
          failures: number;
          lastErrorCode?: string;
        };
      }>;
    };
  };

  assert.equal(body.meta.sources[0]?.status, "unavailable");
  assert.deepEqual(body.meta.sources[0]?.health, {
    windowMs: 300000,
    attempts: 2,
    successes: 0,
    failures: 2,
    successRate: 0,
    averageLatencyMs: 0,
    lastLatencyMs: 0,
    lastAttemptAt: "2026-09-09T00:00:00.000Z",
    consecutiveFailures: 2,
    lastErrorCode: "INVALID_RESPONSE",
  });
  assert.equal(JSON.stringify(body).includes(rawPayload), false);
});

for (const source of [
  ["USGS", "usgs"],
  ["NASA", "nasa-eonet"],
  ["GDACS", "gdacs"],
] as const) {
  test(`GET /api/hazards records an invalid ${source[0]} response shape as unavailable`, async (t) => {
    let sourceCalls = 0;
    const testApp = await startTestApp(
      async (url) => {
        if (url.endsWith("/authorize")) {
          return new Response(JSON.stringify({ accessToken: "token" }));
        }
        if (url.includes("api.disasteraware.com")) {
          return new Response("[]", { headers: { "content-type": "application/json" } });
        }
        sourceCalls += 1;
        return new Response("{}", { headers: { "content-type": "application/json" } });
      },
      {},
      fetchAllHazards,
      () => new Date("2026-09-09T00:00:00.000Z"),
    );
    t.after(testApp.close);

    const response = await fetch(`${testApp.baseUrl}/api/hazards?source=${source[0]}`);
    const body = (await response.json()) as {
      meta: {
        sources: Array<{
          id: string;
          status: string;
          health?: {
            attempts: number;
            successes: number;
            failures: number;
            lastErrorCode?: string;
          };
        }>;
      };
    };
    const sourceStatus = body.meta.sources.find((status) => status.id === source[1]);

    assert.equal(sourceCalls, 2);
    assert.equal(sourceStatus?.status, "unavailable");
    assert.deepEqual(sourceStatus?.health, {
      windowMs: 300000,
      attempts: 2,
      successes: 0,
      failures: 2,
      successRate: 0,
      averageLatencyMs: 0,
      lastLatencyMs: 0,
      lastAttemptAt: "2026-09-09T00:00:00.000Z",
      consecutiveFailures: 2,
      lastErrorCode: "INVALID_RESPONSE",
    });
  });
}

test("GET /api/hazards removes duplicate source and id pairs from aggregated hazards", async (t) => {
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return new Response("[]", { headers: { "content-type": "application/json" } });
    },
    {},
    async () => ({
      hazards: [
        {
          schemaVersion: "1",
          eventId: "gdacs:duplicate-1",
          sourceEventId: "duplicate-1",
          sourceId: "gdacs",
          layerId: "hydrological",
          id: "gdacs:duplicate-1",
          title: "First",
          type: "FLOOD",
          description: "fixture",
          geometry: { type: "Point", coordinates: [0, 0] },
          source: "GDACS",
        },
        {
          schemaVersion: "1",
          eventId: "gdacs:duplicate-1",
          sourceEventId: "duplicate-1",
          sourceId: "gdacs",
          layerId: "hydrological",
          id: "gdacs:duplicate-1",
          title: "Second",
          type: "FLOOD",
          description: "fixture",
          geometry: { type: "Point", coordinates: [0, 0] },
          source: "GDACS",
        },
      ],
      sources: [{ id: "gdacs", status: "success", count: 2 }],
    }),
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  const body = (await response.json()) as { hazards: Array<{ id: string; title: string }> };
  assert.deepEqual(
    body.hazards.map(({ id, title }) => ({ id, title })),
    [{ id: "gdacs:duplicate-1", title: "Second" }],
  );
});

for (const primaryResponse of ["empty", "unavailable"] as const) {
  test(`GET /api/hazards uses fallback sources when DisasterAWARE is ${primaryResponse}`, async (t) => {
    let fallbackCalls = 0;
    const secret = "private-url?token=do-not-expose";
    const testApp = await startTestApp(
      async (url) => {
        if (url.endsWith("/authorize"))
          return new Response(JSON.stringify({ accessToken: "token" }));
        if (primaryResponse === "unavailable") return new Response(secret, { status: 502 });
        return new Response("[]", { headers: { "content-type": "application/json" } });
      },
      {},
      async () => {
        fallbackCalls += 1;
        return {
          hazards: [
            {
              schemaVersion: "1",
              eventId: "gdacs:public-1",
              sourceEventId: "public-1",
              sourceId: "gdacs",
              layerId: "hydrological",
              id: "gdacs:public-1",
              title: "Public flood",
              type: "FLOOD",
              description: "Public fixture",
              geometry: { type: "Point", coordinates: [0, 0] },
              source: "GDACS",
            },
          ],
          sources: [
            { id: "usgs", status: "empty", count: 0 },
            { id: "nasa-eonet", status: "unavailable", count: 0 },
            { id: "gdacs", status: "success", count: 1 },
          ],
        };
      },
      () => new Date("2026-09-09T00:00:00.000Z"),
    );
    t.after(testApp.close);

    const response = await fetch(`${testApp.baseUrl}/api/hazards?type=FLOOD`);
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      hazards: Array<{ id: string }>;
      meta: {
        fallbackUsed: boolean;
        sources: Array<{
          id: string;
          status: string;
          count: number;
          health?: {
            attempts: number;
            successes: number;
            failures: number;
            successRate?: number;
            averageLatencyMs?: number;
            lastLatencyMs?: number;
            lastAttemptAt?: string;
            lastSuccessAt?: string;
            consecutiveFailures: number;
            lastErrorCode?: string;
          };
        }>;
      };
    };
    assert.deepEqual(
      body.hazards.map((hazard) => hazard.id),
      ["gdacs:public-1"],
    );
    assert.equal(body.meta.fallbackUsed, true);
    assert.deepEqual(sourceSummaries(body.meta.sources), [
      { id: "disasteraware", status: primaryResponse, count: 0 },
      { id: "usgs", status: "empty", count: 0 },
      { id: "nasa-eonet", status: "unavailable", count: 0 },
      { id: "gdacs", status: "success", count: 1 },
    ]);
    assert.deepEqual(
      body.meta.sources[0]?.health,
      primaryResponse === "empty"
        ? {
            windowMs: 300000,
            attempts: 1,
            successes: 1,
            failures: 0,
            successRate: 1,
            averageLatencyMs: 0,
            lastLatencyMs: 0,
            lastAttemptAt: body.meta.sources[0]?.health?.lastAttemptAt,
            lastSuccessAt: body.meta.sources[0]?.health?.lastSuccessAt,
            consecutiveFailures: 0,
          }
        : {
            windowMs: 300000,
            attempts: 2,
            successes: 0,
            failures: 2,
            successRate: 0,
            averageLatencyMs: 0,
            lastLatencyMs: 0,
            lastAttemptAt: body.meta.sources[0]?.health?.lastAttemptAt,
            consecutiveFailures: 2,
            lastErrorCode: "HTTP_ERROR",
          },
    );
    assert.equal(fallbackCalls, 1);
    assert.equal(JSON.stringify(body).includes(secret), false);
  });
}

test("GET /api/hazards forwards source selection only to its fallback aggregator", async (t) => {
  let requestedSources: string[] | undefined;
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return new Response("[]", { headers: { "content-type": "application/json" } });
    },
    {},
    async (options) => {
      requestedSources = options?.sources;
      return {
        hazards: [],
        sources: [{ id: "usgs", status: "empty", count: 0 }],
      };
    },
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards?source=USGS`);
  assert.equal(response.status, 200);
  assert.deepEqual(requestedSources, ["USGS"]);
  const body = (await response.json()) as {
    meta: { sources: Array<{ id: string; status: string; count: number }> };
  };
  assert.deepEqual(sourceSummaries(body.meta.sources), [
    { id: "disasteraware", status: "empty", count: 0 },
    { id: "usgs", status: "empty", count: 0 },
    { id: "nasa-eonet", status: "fallback", count: 0 },
    { id: "gdacs", status: "fallback", count: 0 },
  ]);
});

test("GET /api/hazards returns an empty successful feed when every source is unavailable", async (t) => {
  const secret = "private-url?token=do-not-expose";
  const testApp = await startTestApp(
    async (url) => {
      if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
      return new Response(secret, { status: 502 });
    },
    {},
    async () => {
      throw new Error(secret);
    },
  );
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    hazards: unknown[];
    meta: { fallbackUsed: boolean; sources: Array<{ id: string; status: string; count: number }> };
  };
  assert.deepEqual(body.hazards, []);
  assert.equal(body.meta.fallbackUsed, true);
  assert.deepEqual(sourceSummaries(body.meta.sources), [
    { id: "disasteraware", status: "unavailable", count: 0 },
    { id: "usgs", status: "unavailable", count: 0 },
    { id: "nasa-eonet", status: "unavailable", count: 0 },
    { id: "gdacs", status: "unavailable", count: 0 },
  ]);
  assert.equal(JSON.stringify(body).includes(secret), false);
});

test("proxy rejects paths outside the DisasterAware allowlist before authenticating upstream", async (t) => {
  let upstreamCalls = 0;
  const testApp = await startTestApp(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ accessToken: "unexpected-token" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/admin/export`);

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    code: "API_ROUTE_NOT_FOUND",
    message: "API route is not available.",
  });
  assert.equal(upstreamCalls, 0);
});

test("proxy rejects methods not declared for an allowed DisasterAware route", async (t) => {
  let upstreamCalls = 0;
  const testApp = await startTestApp(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ accessToken: "unexpected-token" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards/active`, { method: "DELETE" });

  assert.equal(response.status, 405);
  assert.deepEqual(await response.json(), {
    code: "API_METHOD_NOT_ALLOWED",
    message: "HTTP method is not allowed for this API route.",
  });
  assert.equal(upstreamCalls, 0);
});

test("proxy strips client-controlled sensitive headers before forwarding upstream", async (t) => {
  let upstreamHeaders: HeadersInit | undefined;
  const fetchImpl: UpstreamFetch = async (url, init) => {
    if (String(url).endsWith("/authorize")) {
      return new Response(JSON.stringify({ accessToken: "server-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    upstreamHeaders = init?.headers;
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  };
  const testApp = await startTestApp(fetchImpl);
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards/active`, {
    headers: {
      accept: "application/json",
      authorization: "Bearer browser-controlled-token",
      cookie: "session=browser-controlled",
      "x-forwarded-host": "attacker.example",
      "x-unrelated": "do-not-forward",
    },
  });

  assert.equal(response.status, 200);
  assert.equal(readForwardedHeader(upstreamHeaders, "authorization"), "Bearer server-token");
  assert.equal(readForwardedHeader(upstreamHeaders, "accept"), "application/json");
  assert.equal(readForwardedHeader(upstreamHeaders, "cookie"), undefined);
  assert.equal(readForwardedHeader(upstreamHeaders, "x-forwarded-host"), undefined);
  assert.equal(readForwardedHeader(upstreamHeaders, "x-unrelated"), undefined);
});

test("proxy rejects oversized request bodies before the AI route consumes them", async (t) => {
  const testApp = await startTestApp(async () => {
    throw new Error("upstream must not be called for an oversized body");
  });
  t.after(testApp.close);

  const response = await fetch(
    `${testApp.baseUrl}/api/ai/conversations/${testApp.conversationId}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(65 * 1024) }),
    },
  );

  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), {
    code: "REQUEST_BODY_TOO_LARGE",
    message: "Request body exceeds the allowed size.",
  });
});

test("proxy rejects oversized query values before authenticating upstream", async (t) => {
  let upstreamCalls = 0;
  const testApp = await startTestApp(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ accessToken: "unexpected-token" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  t.after(testApp.close);

  const response = await fetch(`${testApp.baseUrl}/api/hazards/active?limit=${"1".repeat(257)}`);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    code: "INVALID_QUERY",
    message: "Query parameters exceed the allowed limits.",
  });
  assert.equal(upstreamCalls, 0);
});

test("authorization requests are rate limited with a stable response", async (t) => {
  const testApp = await startTestApp(
    async () =>
      new Response(JSON.stringify({ accessToken: "server-token" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    { BFF_AUTHORIZE_RATE_LIMIT_MAX: "1" },
  );
  t.after(testApp.close);

  const first = await fetch(`${testApp.baseUrl}/api/authorize`, { method: "POST" });
  const second = await fetch(`${testApp.baseUrl}/api/authorize`, { method: "POST" });

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.deepEqual(await second.json(), {
    code: "RATE_LIMITED",
    message: "Too many requests. Please try again later.",
  });
});

test("authorize reuses its cached token and disables proxy trust and framework headers", async (t) => {
  let calls = 0;
  const testApp = await startTestApp(async (_url, init) => {
    calls += 1;
    assert.equal(init?.redirect, "error");
    return new Response(JSON.stringify({ accessToken: "cached-token" }));
  });
  t.after(testApp.close);

  assert.equal(testApp.app.get("trust proxy"), false);
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${testApp.baseUrl}/api/authorize`, { method: "POST" });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-powered-by"), null);
    assert.deepEqual(await response.json(), { authorized: true });
  }
  assert.equal(calls, 1);
});

test("JSON routes reject non-JSON content types while empty authorize remains valid", async (t) => {
  let upstreamCalls = 0;
  const testApp = await startTestApp(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ accessToken: "server-token" }));
  });
  t.after(testApp.close);

  const jsonRoutes = [
    `${testApp.baseUrl}/api/authorize`,
    `${testApp.baseUrl}/api/ai/conversations/${testApp.conversationId}/messages`,
  ];
  for (const routeUrl of jsonRoutes) {
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded"]) {
      const response = await fetch(routeUrl, {
        method: "POST",
        headers: { "content-type": contentType },
        body: "{",
      });
      assert.equal(response.status, 415);
      assert.equal(await readErrorCode(response), "UNSUPPORTED_MEDIA_TYPE");
    }
  }
  assert.equal(upstreamCalls, 0);
  const response = await fetch(
    `${testApp.baseUrl}/api/ai/conversations/${testApp.conversationId}/messages`,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: "{",
    },
  );
  assert.equal(response.status, 400);
  assert.equal(await readErrorCode(response), "INVALID_JSON");
});

test("AI requests use an independent limit and cannot bypass it using forwarded IPs", async (t) => {
  const testApp = await startTestApp(
    async () => {
      throw new Error("Unexpected DisasterAware call");
    },
    { BFF_AI_RATE_LIMIT_MAX: "1" },
  );
  t.after(testApp.close);

  for (const [index, expectedStatus] of [400, 429].entries()) {
    const response = await fetch(
      `${testApp.baseUrl}/api/ai/conversations/${testApp.conversationId}/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${index + 1}` },
        body: "{",
      },
    );
    assert.equal(response.status, expectedStatus);
    assert.equal(await readErrorCode(response), index === 0 ? "INVALID_JSON" : "RATE_LIMITED");
  }
});

test("API route gate handles local methods, HEAD, OPTIONS and unknown descendants", async (t) => {
  let upstreamCalls = 0;
  const testApp = await startTestApp(async () => {
    upstreamCalls += 1;
    return new Response(JSON.stringify({ accessToken: "unexpected-token" }));
  });
  t.after(testApp.close);

  for (const [route, method, status] of [
    ["authorize", "GET", 405],
    [`ai/conversations/${testApp.conversationId}/messages`, "GET", 405],
    ["hazards", "POST", 405],
    ["hazards/types", "HEAD", 405],
    ["hazards/active", "OPTIONS", 405],
    ["hazards/active/category/flood", "POST", 405],
    ["authorize/extra", "POST", 404],
    ["ai/chat/extra", "POST", 404],
    ["hazards/active/", "GET", 404],
    ["HAZARDS/active", "GET", 404],
    ["", "GET", 404],
  ] as const) {
    const response = await fetch(`${testApp.baseUrl}/api/${route}`, { method });
    assert.equal(response.status, status, `${method} ${route}`);
    if (method !== "HEAD") {
      assert.equal(
        await readErrorCode(response),
        status === 405 ? "API_METHOD_NOT_ALLOWED" : "API_ROUTE_NOT_FOUND",
      );
    }
  }
  assert.equal(upstreamCalls, 0);
});

test("proxy permits declared category IDs and rejects encoded or malformed categories", async (t) => {
  const proxyUrls: string[] = [];
  const testApp = await startTestApp(async (url, init) => {
    assert.equal(init?.redirect, "error");
    if (url.endsWith("/authorize")) return new Response(JSON.stringify({ accessToken: "token" }));
    proxyUrls.push(url);
    return new Response("[]", { headers: { "content-type": "application/json" } });
  });
  t.after(testApp.close);

  for (const route of ["types", "active", "active/category/FLOOD_1-test"]) {
    const response = await fetch(`${testApp.baseUrl}/api/hazards/${route}?limit=1`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/);
    assert.equal(proxyUrls.at(-1), `https://api.disasteraware.com/hazards/${route}?limit=1`);
  }
  for (const category of ["", "a/b", "a.b", "%2f", "%61", "a%2e", "a".repeat(65)]) {
    const response = await fetch(`${testApp.baseUrl}/api/hazards/active/category/${category}`);
    assert.equal(response.status, 404, category);
  }
  assert.equal(proxyUrls.length, 3);
});

test("query validation protects both proxy and local aggregation routes", async (t) => {
  const testApp = await startTestApp(async () => {
    throw new Error("Unexpected upstream call");
  });
  t.after(testApp.close);

  const queries = [
    "q=1&q=2",
    "q[value]=1",
    "q[]=1",
    `${"k".repeat(257)}=1`,
    Array.from({ length: 21 }, (_, index) => `q${index}=1`).join("&"),
  ];
  for (const route of ["hazards", "hazards/active"]) {
    for (const query of queries) {
      const response = await fetch(`${testApp.baseUrl}/api/${route}?${query}`);
      assert.equal(response.status, 400, query);
      assert.equal(await readErrorCode(response), "INVALID_QUERY");
    }
  }
});

test("hazard aggregation and proxy share their configured rate limit", async (t) => {
  let calls = 0;
  const testApp = await startTestApp(
    async () => {
      calls += 1;
      return new Response("unexpected");
    },
    { BFF_HAZARD_RATE_LIMIT_MAX: "1" },
  );
  t.after(testApp.close);

  assert.equal((await fetch(`${testApp.baseUrl}/api/hazards`)).status, 200);
  const response = await fetch(`${testApp.baseUrl}/api/hazards/active`);
  assert.equal(response.status, 429);
  assert.equal(await readErrorCode(response), "RATE_LIMITED");
  assert.equal(calls, 2);
});

for (const phase of ["authorize", "proxy"] as const) {
  test(`${phase} upstream timeout returns sanitized 504 and aborts the request`, async (t) => {
    let aborted = false;
    const testApp = await startTestApp(
      async (url, init) => {
        if (phase === "proxy" && url.endsWith("/authorize")) {
          return new Response(JSON.stringify({ accessToken: "token" }));
        }
        return new Promise<Response>((resolve, reject) => {
          const fallback = setTimeout(
            () => resolve(new Response("late upstream response", { status: 500 })),
            100,
          );
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            clearTimeout(fallback);
            reject(new Error("internal timeout detail"));
          });
        });
      },
      { DISASTERAWARE_REQUEST_TIMEOUT_MS: "5" },
    );
    t.after(testApp.close);

    const response =
      phase === "authorize"
        ? await fetch(`${testApp.baseUrl}/api/authorize`, { method: "POST" })
        : await fetch(`${testApp.baseUrl}/api/hazards/active`);
    assert.equal(response.status, 504);
    assert.equal(await readErrorCode(response), "UPSTREAM_TIMEOUT");
    assert.equal(aborted, true);
  });

  for (const failure of ["exception", "status", "invalid-token"] as const) {
    test(`${phase} ${failure} does not expose upstream details`, async (t) => {
      const secret = "private-url?password=secret-token";
      const testApp = await startTestApp(async (url) => {
        if (phase === "proxy" && url.endsWith("/authorize")) {
          return new Response(JSON.stringify({ accessToken: "token" }));
        }
        if (failure === "exception") throw new Error(secret);
        return new Response(secret, {
          status: failure === "invalid-token" && phase === "authorize" ? 200 : 500,
        });
      });
      t.after(testApp.close);

      const response =
        phase === "authorize"
          ? await fetch(`${testApp.baseUrl}/api/authorize`, { method: "POST" })
          : await fetch(`${testApp.baseUrl}/api/hazards/active`);
      assert.equal(response.status, 502);
      const body = await response.text();
      assert.doesNotMatch(body, /private-url|password|secret-token|Authentication|access token/);
      assert.equal(JSON.parse(body).code, "UPSTREAM_UNAVAILABLE");
    });
  }
}

for (const status of [401, 403]) {
  test(`proxy refreshes only once when upstream repeatedly returns ${status}`, async (t) => {
    let authorizations = 0;
    let proxyCalls = 0;
    const testApp = await startTestApp(async (url) => {
      if (url.endsWith("/authorize")) {
        authorizations += 1;
        return new Response(JSON.stringify({ accessToken: `token-${authorizations}` }));
      }
      proxyCalls += 1;
      return new Response("private upstream error", { status });
    });
    t.after(testApp.close);

    const response = await fetch(`${testApp.baseUrl}/api/hazards/active`);
    assert.equal(response.status, 502);
    assert.equal(await readErrorCode(response), "UPSTREAM_UNAVAILABLE");
    assert.equal(authorizations, 2);
    assert.equal(proxyCalls, 2);
  });
}

function createResponseRecorder() {
  let statusCode = 200;
  let payload: unknown;

  const response = {
    status(code: number) {
      statusCode = code;
      return response;
    },
    json(body: unknown) {
      payload = body;
      return response;
    },
  };

  return {
    response: response as unknown as import("express").Response,
    read: () => ({ statusCode, payload }),
  };
}

test("matchDisasterAwareRoute only permits declared GET proxy routes", () => {
  assert.deepEqual(matchDisasterAwareRoute("GET", "/hazards/types"), { kind: "allowed" });
  assert.deepEqual(matchDisasterAwareRoute("GET", "/hazards/active"), { kind: "allowed" });
  assert.deepEqual(matchDisasterAwareRoute("GET", "/hazards/active/category/flood"), {
    kind: "allowed",
  });
  assert.deepEqual(matchDisasterAwareRoute("DELETE", "/hazards/active"), {
    kind: "method_not_allowed",
  });
  assert.deepEqual(matchDisasterAwareRoute("GET", "/admin/export"), { kind: "not_found" });
});

test("validateQuery rejects a query value longer than 256 characters", () => {
  const recorder = createResponseRecorder();
  let nextCalled = false;

  validateQuery(
    { query: { limit: "1".repeat(257) } } as unknown as import("express").Request,
    recorder.response,
    () => {
      nextCalled = true;
    },
  );

  assert.equal(nextCalled, false);
  assert.deepEqual(recorder.read(), {
    statusCode: 400,
    payload: {
      code: "INVALID_QUERY",
      message: "Query parameters exceed the allowed limits.",
    },
  });
});

test.after(async () => {
  await prisma.$disconnect();
});

test("createRawBodyMiddleware rejects a body larger than 64 KiB", async () => {
  const recorder = createResponseRecorder();
  const request = Object.assign(Readable.from(Buffer.alloc(64 * 1024 + 1)), {
    method: "POST",
    headers: {},
  }) as unknown as import("express").Request;

  await createRawBodyMiddleware()(request, recorder.response, () => {
    throw new Error("next must not be called for an oversized body");
  });

  assert.deepEqual(recorder.read(), {
    statusCode: 413,
    payload: {
      code: "REQUEST_BODY_TOO_LARGE",
      message: "Request body exceeds the allowed size.",
    },
  });
});

test("createForwardHeaders keeps only approved client headers and the server token", () => {
  const headers = createForwardHeaders(
    {
      headers: {
        accept: "application/json",
        authorization: "Bearer browser-token",
        cookie: "session=browser",
        "x-forwarded-host": "attacker.example",
        "x-unrelated": "do-not-forward",
      },
    },
    "server-token",
  );

  assert.deepEqual(headers, {
    accept: "application/json",
    authorization: "Bearer server-token",
  });
});

test("fetchWithTimeout rejects with a stable timeout code", async () => {
  const neverResolvingFetch: UpstreamFetch = async (_url, init) =>
    new Promise<never>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new Error("aborted"));
      });
    });

  await assert.rejects(
    fetchWithTimeout(neverResolvingFetch, "https://example.test/hazards", {}, 1),
    (error: unknown) => {
      if (!(error instanceof RequestBoundaryError)) {
        return false;
      }
      assert.equal(error.code, "UPSTREAM_TIMEOUT");
      assert.equal(error.message, "Upstream request timed out.");
      return true;
    },
  );
});

test("createRateLimitMiddleware returns a stable response after its fixed window limit", () => {
  const recorder = createResponseRecorder();
  const middleware = createRateLimitMiddleware({
    maxRequests: 1,
    now: () => 1_000,
    windowMs: 60_000,
  });
  const request = { ip: "127.0.0.1" } as unknown as import("express").Request;
  let nextCalls = 0;

  middleware(request, recorder.response, () => {
    nextCalls += 1;
  });
  middleware(request, recorder.response, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 1);
  assert.deepEqual(recorder.read(), {
    statusCode: 429,
    payload: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
  });
});
