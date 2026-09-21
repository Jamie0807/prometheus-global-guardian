/** 验证 AI 生成在重复请求和生成前取消时的数据库状态。 */
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";
import { Response } from "node-fetch";

import { createApp, type UpstreamFetch } from "../server.js";
import * as conversationRepository from "../server/ai/conversation-repository.js";
import { prisma } from "../server/db/prisma.js";

const TEST_PASSWORD = "LocalTest-Password-2026!";

interface AuthenticatedTestApp {
  baseUrl: string;
  conversationId: string;
  email: string;
  request: (path: string, init?: RequestInit) => Promise<globalThis.Response>;
  requestMessage: (clientMessageId: string, requestId: string) => Promise<globalThis.Response>;
  close: () => Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readAssistantMessages(
  response: globalThis.Response,
): Promise<Array<{ id: string; status: string }>> {
  const payload: unknown = await response.json();
  assert.ok(isRecord(payload) && isRecord(payload.conversation));
  const messages = payload.conversation.messages;
  assert.ok(Array.isArray(messages));
  return messages.flatMap((message) =>
    isRecord(message) &&
    message.role === "ASSISTANT" &&
    typeof message.id === "string" &&
    typeof message.status === "string"
      ? [{ id: message.id, status: message.status }]
      : [],
  );
}

async function startAuthenticatedTestApp(fetchImpl: UpstreamFetch): Promise<AuthenticatedTestApp> {
  const app = createApp({
    env: {
      NODE_ENV: "test",
      AI_PROVIDER: "workflow",
      VOLCENGINE_WORKFLOW_API_URL: "https://workflow.test/run",
      AUTH_CSRF_SECRET: "local-test-csrf-secret",
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
  const origin = baseUrl;
  const email = `ai-persistence-${randomUUID()}@example.test`;
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      email,
      password: TEST_PASSWORD,
    }),
  });
  assert.equal(registration.status, 201);
  const cookieHeader = registration.headers.get("set-cookie");
  assert.ok(cookieHeader);
  const cookie = cookieHeader.split(";", 1)[0];
  const registrationPayload: unknown = await registration.json();
  assert.ok(isRecord(registrationPayload) && typeof registrationPayload.csrfToken === "string");
  const csrfToken = registrationPayload.csrfToken;

  const request = async (path: string, init: RequestInit = {}): Promise<globalThis.Response> => {
    const headers = new Headers(init.headers);
    headers.set("cookie", cookie);
    headers.set("origin", origin);
    if (!headers.has("content-type") && init.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (!["GET", "HEAD", "OPTIONS"].includes((init.method ?? "GET").toUpperCase())) {
      headers.set("x-csrf-token", csrfToken);
    }
    return fetch(`${baseUrl}${path}`, { ...init, headers });
  };

  const createdConversation = await request("/api/ai/conversations", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.equal(createdConversation.status, 201);
  const conversationPayload: unknown = await createdConversation.json();
  assert.ok(isRecord(conversationPayload) && isRecord(conversationPayload.conversation));
  const conversationId = conversationPayload.conversation.id;
  assert.equal(typeof conversationId, "string");
  if (typeof conversationId !== "string") throw new Error("Conversation ID was not returned.");

  const requestMessage = (clientMessageId: string, requestId: string) =>
    request(`/api/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "x-ai-request-id": requestId,
        "x-ai-client-message-id": clientMessageId,
      },
      body: JSON.stringify({
        clientMessageId,
        content: "请分析当前地震风险。",
        disasterContext: null,
      }),
    });

  return {
    baseUrl,
    conversationId,
    email,
    request,
    requestMessage,
    close: async () => {
      await prisma.user.deleteMany({ where: { email } });
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

test.after(async () => {
  await prisma.$disconnect();
});

test("a registered account can log in, restore its session, and revoke it on logout", async (t) => {
  const testApp = await startAuthenticatedTestApp(async () => {
    throw new Error("No AI provider request is expected in the authentication lifecycle test.");
  });
  t.after(testApp.close);

  const login = await fetch(`${testApp.baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: testApp.baseUrl },
    body: JSON.stringify({ email: testApp.email, password: TEST_PASSWORD }),
  });
  assert.equal(login.status, 200);
  const loginCookieHeader = login.headers.get("set-cookie");
  const loginPayload: unknown = await login.json();
  assert.ok(isRecord(loginPayload) && typeof loginPayload.csrfToken === "string");
  assert.ok(loginCookieHeader);
  const loginCookie = loginCookieHeader.split(";", 1)[0] ?? "";
  const csrfToken = loginPayload.csrfToken;

  const restoredSession = await fetch(`${testApp.baseUrl}/api/auth/session`, {
    headers: { cookie: loginCookie },
  });
  assert.equal(restoredSession.status, 200);
  const restoredPayload: unknown = await restoredSession.json();
  assert.ok(isRecord(restoredPayload) && restoredPayload.authenticated === true);

  const logout = await fetch(`${testApp.baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { cookie: loginCookie, origin: testApp.baseUrl, "x-csrf-token": csrfToken },
  });
  assert.equal(logout.status, 204);
  const revokedSession = await fetch(`${testApp.baseUrl}/api/auth/session`, {
    headers: { cookie: loginCookie },
  });
  assert.deepEqual(await revokedSession.json(), { authenticated: false });
});

test("startup recovery makes interrupted assistant generations reusable", async (t) => {
  const testApp = await startAuthenticatedTestApp(async () => {
    throw new Error("No AI provider request is expected while recovering an interrupted message.");
  });
  t.after(testApp.close);

  const user = await prisma.user.findUnique({
    where: { email: testApp.email },
    select: { id: true },
  });
  assert.ok(user);

  const userMessage = await prisma.aIMessage.create({
    data: {
      conversationId: testApp.conversationId,
      clientMessageId: randomUUID(),
      role: "USER",
      content: "恢复中断的回答",
      status: "COMPLETE",
    },
    select: { id: true },
  });
  const assistantMessage = await prisma.aIMessage.create({
    data: {
      conversationId: testApp.conversationId,
      replyToMessageId: userMessage.id,
      role: "ASSISTANT",
      content: "尚未完成的部分内容",
      status: "STREAMING",
    },
    select: { id: true },
  });

  assert.equal(await conversationRepository.recoverInterruptedAssistantMessages(), 1);
  const recovered = await prisma.aIMessage.findUniqueOrThrow({
    where: { id: assistantMessage.id },
    select: { status: true },
  });
  assert.equal(recovered.status, "FAILED");

  assert.deepEqual(
    await conversationRepository.claimAssistantMessage(
      user.id,
      testApp.conversationId,
      userMessage.id,
    ),
    { kind: "claimed", id: assistantMessage.id },
  );
});

test("a repeated client message cannot start a second concurrent assistant generation", async (t) => {
  const providerStream = new Readable({ read() {} });
  let providerCalls = 0;
  const testApp = await startAuthenticatedTestApp(async () => {
    providerCalls += 1;
    return new Response(providerStream, { headers: { "content-type": "text/event-stream" } });
  });
  t.after(testApp.close);

  const clientMessageId = randomUUID();
  const first = await testApp.requestMessage(clientMessageId, randomUUID());
  assert.equal(first.status, 200);

  const duplicate = await testApp.requestMessage(clientMessageId, randomUUID());
  assert.equal(duplicate.status, 409);
  assert.deepEqual(await duplicate.json(), {
    success: false,
    code: "AI_GENERATION_IN_PROGRESS",
    message: "An assistant response is already being generated for this message.",
  });
  assert.equal(providerCalls, 1);

  providerStream.push('data: {"content":"已保存的分析"}\n\n');
  providerStream.push("data: [DONE]\n\n");
  providerStream.push(null);
  assert.match(await first.text(), /data: \[DONE\]/);

  const replay = await testApp.requestMessage(clientMessageId, randomUUID());
  assert.equal(replay.status, 200);
  assert.match(await replay.text(), /已保存的分析/);
  assert.equal(providerCalls, 1);

  const conversation = await testApp.request(`/api/ai/conversations/${testApp.conversationId}`);
  assert.equal(conversation.status, 200);
  const assistantMessages = await readAssistantMessages(conversation);
  assert.equal(assistantMessages.length, 1);
  assert.equal(assistantMessages[0]?.status, "COMPLETE");
});

test("cancelling before upstream headers persists a reusable CANCELLED assistant row", async (t) => {
  let beginFirstProviderRequest!: () => void;
  const providerStarted = new Promise<void>((resolve) => {
    beginFirstProviderRequest = resolve;
  });
  let providerCalls = 0;
  const retryStream = new Readable({ read() {} });
  const testApp = await startAuthenticatedTestApp(async (_url, init) => {
    providerCalls += 1;
    if (providerCalls > 1) {
      return new Response(retryStream, { headers: { "content-type": "text/event-stream" } });
    }
    beginFirstProviderRequest();
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const error = new Error("request aborted");
        error.name = "AbortError";
        reject(error);
      });
    });
  });
  t.after(testApp.close);

  const clientMessageId = randomUUID();
  const firstRequestId = randomUUID();
  const firstRequest = testApp.requestMessage(clientMessageId, firstRequestId);
  await providerStarted;

  const cancellation = await testApp.request("/api/ai/cancel", {
    method: "POST",
    body: JSON.stringify({ requestId: firstRequestId }),
  });
  assert.equal(cancellation.status, 204);
  const cancelledResponse = await firstRequest;
  assert.equal(cancelledResponse.status, 410);

  const cancelledConversation = await testApp.request(
    `/api/ai/conversations/${testApp.conversationId}`,
  );
  const cancelledAssistantMessages = await readAssistantMessages(cancelledConversation);
  assert.equal(cancelledAssistantMessages.length, 1);
  const cancelledAssistant = cancelledAssistantMessages[0];
  assert.ok(cancelledAssistant);
  assert.equal(cancelledAssistant.status, "CANCELLED");

  const retry = await testApp.requestMessage(clientMessageId, randomUUID());
  assert.equal(retry.status, 200);
  retryStream.push('data: {"content":"重试成功"}\n\n');
  retryStream.push("data: [DONE]\n\n");
  retryStream.push(null);
  assert.match(await retry.text(), /data: \[DONE\]/);
  assert.equal(providerCalls, 2);

  const completedConversation = await testApp.request(
    `/api/ai/conversations/${testApp.conversationId}`,
  );
  const completedAssistantMessages = await readAssistantMessages(completedConversation);
  assert.equal(completedAssistantMessages.length, 1);
  assert.equal(completedAssistantMessages[0]?.id, cancelledAssistant.id);
  assert.equal(completedAssistantMessages[0]?.status, "COMPLETE");
});
