import assert from "node:assert/strict";
import test from "node:test";
import { PassThrough } from "node:stream";
import type { Request, Response as ExpressResponse } from "express";
import { Response } from "node-fetch";
import { isValidAIRequest } from "../server/security/ai-request.js";
import {
  fetchWithTimeout,
  matchDisasterAwareRoute,
  validateQuery,
  createRateLimitMiddleware,
} from "../server/security/request-boundaries.js";

test("category allowlist rejects encoded separators and dot segments", () => {
  for (const segment of [
    "..",
    "%2e%2e",
    "%2Fadmin",
    "%252fadmin",
    "foo\\bar",
    "foo/bar",
    "a?x=1",
  ]) {
    assert.equal(
      matchDisasterAwareRoute("GET", `/hazards/active/category/${segment}`).kind,
      "not_found",
      segment,
    );
  }
  assert.equal(matchDisasterAwareRoute("POST", "/admin").kind, "not_found");
});

test("query boundary counts repeated values and rejects non-scalar shapes", () => {
  for (const query of [{ limit: Array(21).fill("1") }, { filter: { x: "1" } }]) {
    let status = 0;
    const res = {
      status(n: number) {
        status = n;
        return this;
      },
      json() {},
    } as unknown as ExpressResponse;
    validateQuery({ query } as unknown as Request, res, () =>
      assert.fail("invalid query accepted"),
    );
    assert.equal(status, 400);
  }
});

test("upstream timeout covers a stalled response body", async () => {
  const stream = new PassThrough();
  const response = new Response(stream);
  const result = fetchWithTimeout(async () => response, "https://example.test", {}, 10);
  await assert.rejects(result, { code: "UPSTREAM_TIMEOUT" });
  assert.equal(stream.destroyed, true);
});

test("aborted callers do not start an upstream request", async () => {
  const controller = new AbortController();
  controller.abort();
  let called = false;
  await assert.rejects(
    fetchWithTimeout(
      async () => {
        called = true;
        return new Response("ok");
      },
      "https://example.test",
      { signal: controller.signal },
    ),
  );
  assert.equal(called, false);
});

test("rate limiter reopens after window rollover", () => {
  let now = 0;
  let passed = 0;
  let denied = 0;
  const limit = createRateLimitMiddleware({ maxRequests: 1, windowMs: 1000, now: () => now });
  const req = { ip: "127.0.0.1" } as Request;
  const res = {
    status() {
      return this;
    },
    json() {
      denied++;
    },
    setHeader() {},
  } as unknown as ExpressResponse;
  limit(req, res, () => passed++);
  limit(req, res, () => passed++);
  now = 1000;
  limit(req, res, () => passed++);
  assert.equal(passed, 2);
  assert.equal(denied, 1);
});

test("AI request boundary rejects invalid shapes and excessive message input", () => {
  const message = { role: "user", content: "hello" };
  for (const body of [
    null,
    [],
    {},
    { messages: [null] },
    { messages: Array(51).fill(message) },
    { messages: [{ ...message, content: "x".repeat(8001) }] },
    { messages: [message], disasterContext: { recent: [null] } },
    { messages: [message], disasterContext: { total: -1 } },
    { messages: [message], location: {} },
  ]) {
    assert.equal(isValidAIRequest(body), false);
  }
  assert.equal(isValidAIRequest({ messages: [message], disasterContext: null }), true);
  assert.equal(
    isValidAIRequest({
      messages: [message],
      location: "global",
      disasterContext: {
        total: 1,
        byType: { FLOOD: 1 },
        recent: [{ title: "Flood", type: "FLOOD" }],
      },
    }),
    true,
  );
});
