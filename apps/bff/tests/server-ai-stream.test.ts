/** 验证 BFF AI SSE 会话的断点续传和 provider 请求复用。 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import test from "node:test";
import { Response } from "node-fetch";

import { createApp, type UpstreamFetch } from "../index.js";
import { prisma } from "../db/prisma.js";
import {
  createResponsesToChatCompletionsStream,
  createWorkflowToChatCompletionsStream,
} from "../ai/ai-stream.js";

const SSE_FRAME_LIMIT_BYTES = 64 * 1024;
const TEST_PASSWORD = "LocalTest-Password-2026!";
const rawFetch = globalThis.fetch.bind(globalThis);
const authenticatedOrigins = new Map<string, { cookie: string; csrfToken: string }>();

async function fetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<globalThis.Response> {
  const inputUrl = input instanceof Request ? input.url : String(input);
  const origin = new URL(inputUrl).origin;
  const auth = authenticatedOrigins.get(origin);
  if (!auth) return rawFetch(input, init);
  const headers = new Headers(input instanceof Request ? input.headers : init?.headers);
  headers.set("cookie", auth.cookie);
  headers.set("origin", origin);
  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) headers.set("x-csrf-token", auth.csrfToken);
  return rawFetch(input, { ...init, headers });
}

async function startTestApp(fetchImpl: UpstreamFetch, env: NodeJS.ProcessEnv = {}) {
  const app = createApp({
    env: {
      AUTH_CSRF_SECRET: "server-ai-stream-test-csrf-secret-32-bytes",
      AI_PROVIDER: "workflow",
      NODE_ENV: "test",
      VOLCENGINE_WORKFLOW_API_URL: "https://workflow.test/run",
      ...env,
    },
    fetchImpl,
  });
  const server = app.listen(0);
  await new Promise<void>((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const email = `server-ai-stream-${randomUUID()}@example.test`;
  const registration = await rawFetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: baseUrl },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  });
  assert.equal(registration.status, 201);
  const cookieHeader = registration.headers.get("set-cookie");
  const registrationPayload: unknown = await registration.json();
  assert.ok(registrationPayload && typeof registrationPayload === "object");
  assert.ok(
    "csrfToken" in registrationPayload && typeof registrationPayload.csrfToken === "string",
  );
  assert.ok(cookieHeader);
  authenticatedOrigins.set(baseUrl, {
    cookie: cookieHeader.split(";", 1)[0] ?? "",
    csrfToken: registrationPayload.csrfToken,
  });
  const conversationResponse = await fetch(`${baseUrl}/api/ai/conversations`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(conversationResponse.status, 201);
  const conversationPayload: unknown = await conversationResponse.json();
  assert.ok(
    conversationPayload &&
      typeof conversationPayload === "object" &&
      "conversation" in conversationPayload &&
      conversationPayload.conversation &&
      typeof conversationPayload.conversation === "object" &&
      "id" in conversationPayload.conversation &&
      typeof conversationPayload.conversation.id === "string",
  );
  const conversationId = conversationPayload.conversation.id;
  return {
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

function chatUrl(testApp: { baseUrl: string; conversationId: string }): string {
  return `${testApp.baseUrl}/api/ai/conversations/${testApp.conversationId}/messages`;
}

const body = JSON.stringify({
  clientMessageId: "server-ai-stream-user-message",
  content: "分析当前灾害",
  disasterContext: null,
});

function messageBody(clientMessageId: string, content: string): string {
  return JSON.stringify({ clientMessageId, content, disasterContext: null });
}

test("unknown resumed AI session returns a stable expiry error", async (t) => {
  const testApp = await startTestApp(async () => {
    throw new Error("provider must not be called for an unknown resume session");
  });
  t.after(testApp.close);

  const response = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-request-id": "missing-session",
      "last-event-id": "3",
    },
    body,
  });

  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), {
    success: false,
    code: "AI_STREAM_SESSION_EXPIRED",
    message: "AI stream session has expired.",
  });
});

test("completed AI session replays only events after Last-Event-ID without a second provider call", async (t) => {
  let providerCalls = 0;
  const testApp = await startTestApp(async () => {
    providerCalls += 1;
    return new Response(
      Readable.from([
        'data: {"content":"风险"}\n\n',
        'data: {"content":"分析"}\n\n',
        "data: [DONE]\n\n",
      ]),
      { headers: { "content-type": "text/event-stream" } },
    );
  });
  t.after(testApp.close);

  const first = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "resume-session" },
    body,
  });
  const firstText = await first.text();
  assert.equal(first.status, 200);
  assert.match(firstText, /id: 1/);
  assert.match(firstText, /id: 3/);

  const resumed = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-request-id": "resume-session",
      "last-event-id": "1",
    },
    body,
  });
  const resumedText = await resumed.text();
  assert.equal(resumed.status, 200);
  assert.doesNotMatch(resumedText, /id: 1/);
  assert.match(resumedText, /id: 2/);
  assert.match(resumedText, /id: 3/);
  assert.equal(providerCalls, 1);
});

test("client disconnect detaches the subscriber while the selected provider continues", async (t) => {
  let providerCalls = 0;
  let isProviderAborted = () => false;
  const providerStream = new Readable({ read() {} });
  const testApp = await startTestApp(async (_url, init) => {
    providerCalls += 1;
    isProviderAborted = () => init?.signal?.aborted ?? false;
    return new Response(providerStream, {
      headers: { "content-type": "text/event-stream" },
    });
  });
  t.after(testApp.close);

  const controller = new AbortController();
  const first = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "disconnect-session" },
    body,
    signal: controller.signal,
  });
  const reader = first.body?.getReader();
  assert.ok(reader);

  providerStream.push('data: {"content":"风险"}\n\n');
  const firstChunk = await reader.read();
  assert.match(new TextDecoder().decode(firstChunk.value), /id: 1/);

  controller.abort();
  await reader.cancel().catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(isProviderAborted(), false);

  providerStream.push('data: {"content":"分析"}\n\n');
  providerStream.push("data: [DONE]\n\n");
  providerStream.push(null);

  const resumed = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ai-request-id": "disconnect-session",
      "last-event-id": "1",
    },
    body,
  });
  const resumedText = await resumed.text();
  assert.equal(resumed.status, 200);
  assert.match(resumedText, /id: 2/);
  assert.match(resumedText, /id: 3/);
  assert.equal(providerCalls, 1);
});

test("split UTF-8 bytes in upstream chunks are preserved in replayed SSE events", async (t) => {
  const event = Buffer.from('data: {"content":"风险分析"}\n\n');
  const splitAt = event.indexOf(Buffer.from("风")) + 1;
  const testApp = await startTestApp(
    async () =>
      new Response(
        Readable.from([
          event.subarray(0, splitAt),
          event.subarray(splitAt),
          Buffer.from("data: [DONE]\n\n"),
        ]),
        { headers: { "content-type": "text/event-stream" } },
      ),
  );
  t.after(testApp.close);

  const response = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "utf8-session" },
    body,
  });

  const text = await response.text();
  assert.equal(response.status, 200);
  assert.match(text, /风险分析/);
  assert.doesNotMatch(text, /�/);
});

test("raw provider stream rejects an oversized incomplete SSE frame and aborts upstream", async (t) => {
  const providerStream = new Readable({ read() {} });
  let providerAborted = false;
  const testApp = await startTestApp(
    async (_url, init) => {
      init?.signal?.addEventListener("abort", () => {
        providerAborted = true;
      });
      return new Response(providerStream, {
        headers: { "content-type": "text/event-stream" },
      });
    },
    {
      AI_PROVIDER: "ark",
      VOLCENGINE_ARK_API_KEY: "test-key",
      VOLCENGINE_ARK_MODEL: "test-model",
    },
  );
  t.after(testApp.close);

  const response = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "oversized-frame" },
    body,
  });
  const responseTextPromise = response.text();
  providerStream.push(Buffer.alloc(SSE_FRAME_LIMIT_BYTES + 1, "x"));
  providerStream.push(null);
  const responseText = await responseTextPromise;

  assert.equal(response.status, 200);
  assert.match(responseText, /event: error/);
  assert.doesNotMatch(responseText, /x{100}/);
  assert.equal(providerAborted, true);
});

test("workflow route aborts upstream when its provider transform rejects an oversized SSE frame", async (t) => {
  const providerStream = new Readable({ read() {} });
  let providerAborted = false;
  const testApp = await startTestApp(async (_url, init) => {
    init?.signal?.addEventListener("abort", () => {
      providerAborted = true;
    });
    return new Response(providerStream, {
      headers: { "content-type": "text/event-stream" },
    });
  });
  t.after(testApp.close);

  const response = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "oversized-workflow-frame" },
    body,
  });
  const responseTextPromise = response.text();
  providerStream.push(Buffer.alloc(SSE_FRAME_LIMIT_BYTES + 1, "x"));
  const responseText = await responseTextPromise;

  assert.equal(response.status, 200);
  assert.match(responseText, /event: error/);
  assert.doesNotMatch(responseText, /x{100}/);
  assert.equal(providerAborted, true);
  assert.equal(providerStream.destroyed, true);
});

test("workflow provider transform rejects oversized complete and incomplete SSE frames", async () => {
  const transform = createWorkflowToChatCompletionsStream();
  const output = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const oversizedPayload = Buffer.alloc(SSE_FRAME_LIMIT_BYTES, "x");

  await assert.rejects(
    pipeline(
      Readable.from([
        Buffer.concat([Buffer.from("data: "), oversizedPayload, Buffer.from("\n\n")]),
      ]),
      transform,
      output,
    ),
    /SSE frame exceeds the allowed size/,
  );

  await assert.rejects(
    pipeline(
      Readable.from([Buffer.concat([Buffer.from("data: "), oversizedPayload])]),
      createWorkflowToChatCompletionsStream(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    ),
    /SSE frame exceeds the allowed size/,
  );

  const frameThatExceedsLimitAtFlush = Buffer.concat([
    Buffer.from("data: "),
    Buffer.alloc(SSE_FRAME_LIMIT_BYTES - 7, "x"),
    Buffer.from([0xe2]),
  ]);
  await assert.rejects(
    pipeline(
      Readable.from([frameThatExceedsLimitAtFlush]),
      createWorkflowToChatCompletionsStream(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    ),
    /SSE frame exceeds the allowed size/,
  );
});

test("Responses provider transform rejects oversized complete and incomplete SSE frames", async () => {
  const oversizedPayload = Buffer.alloc(SSE_FRAME_LIMIT_BYTES, "x");

  await assert.rejects(
    pipeline(
      Readable.from([
        Buffer.concat([Buffer.from("data: "), oversizedPayload, Buffer.from("\n\n")]),
      ]),
      createResponsesToChatCompletionsStream(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    ),
    /SSE frame exceeds the allowed size/,
  );

  await assert.rejects(
    pipeline(
      Readable.from([Buffer.concat([Buffer.from("data: "), oversizedPayload])]),
      createResponsesToChatCompletionsStream(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    ),
    /SSE frame exceeds the allowed size/,
  );

  const frameThatExceedsLimitAtFlush = Buffer.concat([
    Buffer.from("data: "),
    Buffer.alloc(SSE_FRAME_LIMIT_BYTES - 7, "x"),
    Buffer.from([0xe2]),
  ]);
  await assert.rejects(
    pipeline(
      Readable.from([frameThatExceedsLimitAtFlush]),
      createResponsesToChatCompletionsStream(),
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    ),
    /SSE frame exceeds the allowed size/,
  );
});

test("evicted AI session aborts an in-flight provider request and disposes a late response body", async (t) => {
  let resolveFirstResponse: ((response: Response) => void) | undefined;
  let firstProviderAborted = false;
  let firstProviderStarted: (() => void) | undefined;
  const firstBody = new Readable({ read() {} });
  let callCount = 0;
  const firstCallStarted = new Promise<void>((resolve) => {
    firstProviderStarted = resolve;
  });
  const testApp = await startTestApp(
    async (_url, init) => {
      callCount += 1;
      if (callCount === 1) {
        init?.signal?.addEventListener("abort", () => {
          firstProviderAborted = true;
        });
        firstProviderStarted?.();
        return new Promise<Response>((resolve) => {
          resolveFirstResponse = resolve;
        });
      }
      return new Response(JSON.stringify({ data: { outputs: { result: "第二个请求" } } }));
    },
    { BFF_AI_STREAM_RESUME_MAX_SESSIONS: "1" },
  );
  t.after(async () => {
    resolveFirstResponse?.(new Response("{}"));
    await testApp.close();
  });

  const firstRequest = fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "evicted-request" },
    body,
  });
  await firstCallStarted;

  const secondResponse = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "replacement-request" },
    body: messageBody("replacement-user-message", "第二个请求"),
  });
  assert.equal(secondResponse.status, 200);
  await secondResponse.text();
  assert.equal(firstProviderAborted, true);

  resolveFirstResponse?.(
    new Response(firstBody, { headers: { "content-type": "text/event-stream" } }),
  );
  const firstResponse = await firstRequest;
  assert.equal(firstResponse.status, 410);
  await firstResponse.text();
  assert.equal(firstBody.destroyed, true);
});

test("evicted Workflow JSON response clears its provider timeout after parsing finishes", async (t) => {
  let resolveWorkflowJson: ((value: unknown) => void) | undefined;
  let workflowJsonStarted: (() => void) | undefined;
  const jsonStarted = new Promise<void>((resolve) => {
    workflowJsonStarted = resolve;
  });
  const pendingResponse = new Response("{}");
  pendingResponse.json = () =>
    new Promise<unknown>((resolve) => {
      resolveWorkflowJson = resolve;
      workflowJsonStarted?.();
    });

  let firstSignal: unknown;
  let firstAbortCalls = 0;
  const originalAbort = AbortController.prototype.abort;
  AbortController.prototype.abort = function (...args: Parameters<AbortController["abort"]>) {
    if ((this.signal as unknown) === firstSignal) firstAbortCalls += 1;
    return originalAbort.apply(this, args);
  };

  const testAppCleanup: { close?: () => Promise<void> } = {};
  t.after(async () => {
    AbortController.prototype.abort = originalAbort;
    resolveWorkflowJson?.({ data: { outputs: { result: "迟到的结果" } } });
    await testAppCleanup.close?.();
  });

  let providerCalls = 0;
  const testApp = await startTestApp(
    async (_url, init) => {
      providerCalls += 1;
      if (providerCalls === 1) {
        firstSignal = init?.signal ?? undefined;
        return pendingResponse;
      }
      return new Response(JSON.stringify({ data: { outputs: { result: "第二个请求" } } }));
    },
    {
      BFF_AI_STREAM_RESUME_MAX_SESSIONS: "1",
      VOLCENGINE_ARK_TIMEOUT_MS: "1000",
    },
  );
  testAppCleanup.close = testApp.close;

  const firstRequest = fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "evicted-json-request" },
    body,
  });
  await jsonStarted;

  const secondResponse = await fetch(chatUrl(testApp), {
    method: "POST",
    headers: { "content-type": "application/json", "x-ai-request-id": "replacement-json-request" },
    body: messageBody("replacement-json-user-message", "第二个请求"),
  });
  assert.equal(secondResponse.status, 200);
  await secondResponse.text();
  assert.equal(firstAbortCalls, 1);

  resolveWorkflowJson?.({ data: { outputs: { result: "迟到的结果" } } });
  const firstResponse = await firstRequest;
  assert.equal(firstResponse.status, 410);
  await firstResponse.text();
  const abortCallsAfterResponse = firstAbortCalls;

  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(firstAbortCalls, abortCallsAfterResponse);
});

test.after(async () => {
  await prisma.$disconnect();
});
