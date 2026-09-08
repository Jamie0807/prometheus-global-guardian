import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import test from "node:test";

import { Headers, Response, type HeadersInit } from "node-fetch";

import { createApp, type UpstreamFetch } from "../server.js";
import {
  createForwardHeaders,
  createRateLimitMiddleware,
  createRawBodyMiddleware,
  fetchWithTimeout,
  matchDisasterAwareRoute,
  RequestBoundaryError,
  validateQuery,
} from "../server/security/request-boundaries.js";

const serverEnv = {
  DISASTERAWARE_USERNAME: "server-user",
  DISASTERAWARE_PASSWORD: "server-password",
} satisfies NodeJS.ProcessEnv;

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

async function startTestApp(fetchImpl: UpstreamFetch, envOverrides: NodeJS.ProcessEnv = {}) {
  const app = createApp({
    env: { ...serverEnv, ...envOverrides },
    fetchImpl,
    fetchHazards: async () => ({
      hazards: [],
      meta: {
        requestedSources: [],
        successfulSources: [],
        failedSources: [],
        total: 0,
        perSource: {},
        errors: [],
        generatedAt: new Date(0).toISOString(),
      },
    }),
  });
  const server = app.listen(0);

  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  return {
    app,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
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

test("GET /api/hazards remains the local public aggregation route", async (t) => {
  let upstreamCalls = 0;
  const app = createApp({
    env: serverEnv,
    fetchImpl: async () => {
      upstreamCalls += 1;
      return new Response("unexpected upstream call", { status: 500 });
    },
    fetchHazards: async () => ({
      hazards: [
        {
          id: "public-1",
          title: "Public flood",
          type: "FLOOD",
          description: "Public flood fixture",
          geometry: { type: "Point", coordinates: [0, 0] },
          source: "GDACS",
        },
      ],
      meta: {
        requestedSources: ["GDACS"],
        successfulSources: ["GDACS"],
        failedSources: [],
        total: 1,
        perSource: { GDACS: 1 },
        errors: [],
        generatedAt: new Date(0).toISOString(),
      },
    }),
  });
  const server = app.listen(0);
  t.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  );
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;

  const response = await fetch(`http://127.0.0.1:${address.port}/api/hazards`);

  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    success: boolean;
    data: Array<{ id: string }>;
    meta: { returned: number };
  };
  assert.equal(body.success, true);
  assert.deepEqual(body.data, [
    {
      id: "public-1",
      title: "Public flood",
      type: "FLOOD",
      description: "Public flood fixture",
      geometry: { type: "Point", coordinates: [0, 0] },
      source: "GDACS",
    },
  ]);
  assert.equal(body.meta.returned, 1);
  assert.equal(upstreamCalls, 0);
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

  const response = await fetch(`${testApp.baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "x".repeat(65 * 1024) }),
  });

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

  for (const route of ["authorize", "ai/chat"]) {
    for (const contentType of ["text/plain", "application/x-www-form-urlencoded"]) {
      const response = await fetch(`${testApp.baseUrl}/api/${route}`, {
        method: "POST",
        headers: { "content-type": contentType },
        body: "{",
      });
      assert.equal(response.status, 415);
      assert.equal(await readErrorCode(response), "UNSUPPORTED_MEDIA_TYPE");
    }
  }
  assert.equal(upstreamCalls, 0);
  const response = await fetch(`${testApp.baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: "{",
  });
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
    const response = await fetch(`${testApp.baseUrl}/api/ai/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": `192.0.2.${index + 1}` },
      body: "{",
    });
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
    ["ai/chat", "GET", 405],
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
  assert.equal(calls, 0);
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
