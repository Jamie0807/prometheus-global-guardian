import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { Response } from "node-fetch";

import { createApp, type UpstreamFetch } from "../server.js";

const serverEnv = {
  DISASTERAWARE_USERNAME: "server-user",
  DISASTERAWARE_PASSWORD: "server-password",
} satisfies NodeJS.ProcessEnv;

async function startTestApp(fetchImpl: UpstreamFetch) {
  const app = createApp({
    env: serverEnv,
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
