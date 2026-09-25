/** 验证 AI 提供商配置解析、请求构造和协议地址标准化。 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAIProviderRequest,
  buildChatCompletionPayload,
  buildDisasterSystemPrompt,
  buildResponsesPayload,
  buildWorkflowPayload,
  normalizeAIProviderApiUrl,
  resolveAIProviderMode,
  resolveAIRequestTimeoutMs,
  resolveServerAIProviderConfig,
} from "../ai/ai-provider.js";
import type { DisasterContext } from "../ai/ai-provider.js";

test("resolveServerAIProviderConfig reads server-side Volcengine Ark variables", () => {
  const config = resolveServerAIProviderConfig({
    VOLCENGINE_ARK_API_KEY: " ark-key ",
    VOLCENGINE_ARK_MODEL: " doubao-seed ",
    VOLCENGINE_ARK_API_URL: " https://ark.example.com/chat ",
  });

  assert.equal(config.configured, true);
  assert.equal(config.apiKey, "ark-key");
  assert.equal(config.model, "doubao-seed");
  assert.equal(config.apiUrl, "https://ark.example.com/chat");
  assert.equal(config.requestTimeoutMs, 30000);
});

test("resolveAIProviderMode defaults to smart routing and preserves forced modes", () => {
  assert.equal(resolveAIProviderMode({}), "router");
  assert.equal(resolveAIProviderMode({ AI_PROVIDER: "router" }), "router");
  assert.equal(resolveAIProviderMode({ AI_PROVIDER: "ark" }), "ark");
  assert.equal(resolveAIProviderMode({ AI_PROVIDER: "workflow" }), "workflow");
});

test("resolveServerAIProviderConfig can resolve either provider for router mode", () => {
  const env = {
    AI_PROVIDER: "router",
    VOLCENGINE_WORKFLOW_API_URL: "http://workflow.example/run",
    VOLCENGINE_ARK_API_KEY: "ark-key",
    VOLCENGINE_ARK_MODEL: "doubao-seed",
  };

  assert.equal(resolveServerAIProviderConfig(env, "workflow").configured, true);
  assert.equal(resolveServerAIProviderConfig(env, "volcengine").configured, true);
});

test("resolveServerAIProviderConfig reports missing model separately from missing key", () => {
  const config = resolveServerAIProviderConfig({
    VOLCENGINE_ARK_API_KEY: "ark-key",
  });

  assert.equal(config.configured, false);
  assert.equal(config.reason, "missing_model");
});

test("resolveServerAIProviderConfig reads workflow provider configuration", () => {
  const config = resolveServerAIProviderConfig({
    AI_PROVIDER: "workflow",
    VOLCENGINE_WORKFLOW_API_URL: " http://localhost:3100/api/v1/apps/run ",
    VOLCENGINE_WORKFLOW_API_KEY: " workflow-key ",
  });

  assert.equal(config.configured, true);
  assert.equal(config.providerName, "workflow");
  assert.equal(config.apiUrl, "http://localhost:3100/api/v1/apps/run");
  assert.equal(config.apiKey, "workflow-key");
});

test("resolveServerAIProviderConfig reports missing workflow url", () => {
  const config = resolveServerAIProviderConfig({
    AI_PROVIDER: "workflow",
  });

  assert.equal(config.configured, false);
  assert.equal(config.reason, "missing_workflow_url");
  assert.equal(config.providerName, "workflow");
});

test("resolveAIRequestTimeoutMs defaults and caps provider timeouts", () => {
  assert.equal(resolveAIRequestTimeoutMs({}), 30000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: "45000" }), 45000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: "180000" }), 120000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: "-1" }), 30000);
});

test("normalizeAIProviderApiUrl routes plan base URLs to responses endpoint", () => {
  assert.deepEqual(normalizeAIProviderApiUrl("https://ark.cn-beijing.volces.com/api/plan/v3"), {
    apiUrl: "https://ark.cn-beijing.volces.com/api/plan/v3/responses",
    protocol: "responses",
  });

  assert.deepEqual(
    normalizeAIProviderApiUrl("https://ark.cn-beijing.volces.com/api/v3/chat/completions"),
    {
      apiUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      protocol: "chat_completions",
    },
  );
});

test("buildResponsesPayload converts chat messages for the Responses API", () => {
  const payload = buildResponsesPayload({
    messages: [
      { role: "assistant", content: "Previous answer" },
      { role: "user", content: "Summarize current risk" },
    ],
    disasterContext: { total: 0, byType: {}, recent: [] },
    model: "ark-code-latest",
  });

  assert.equal(payload.model, "ark-code-latest");
  assert.equal(payload.stream, true);
  assert.equal(payload.max_output_tokens, 1500);
  assert.match(payload.instructions, /Prometheus Global Guardian/);
  assert.deepEqual(payload.input, [
    { role: "assistant", content: "Previous answer" },
    { role: "user", content: "Summarize current risk" },
  ]);
});

test("buildAIProviderRequest chooses Responses API for plan base URLs", () => {
  const request = buildAIProviderRequest({
    config: {
      model: "ark-code-latest",
      apiUrl: "https://ark.cn-beijing.volces.com/api/plan/v3",
    },
    messages: [{ role: "user", content: "hello" }],
    disasterContext: null,
  });

  assert.equal(request.protocol, "responses");
  assert.equal(request.apiUrl, "https://ark.cn-beijing.volces.com/api/plan/v3/responses");
  assert.equal(request.payload.model, "ark-code-latest");
  assert.equal(request.payload.input[0].content, "hello");
});

test("buildWorkflowPayload sends the latest user input and workflow context", () => {
  const payload = buildWorkflowPayload({
    messages: [
      { role: "assistant", content: "Previous answer" },
      { role: "user", content: "灾害种类地震12次,海啸10次" },
    ],
    disasterContext: { total: 22, byType: { EARTHQUAKE: 12, TSUNAMI: 10 }, recent: [] },
    location: "全球",
    language: "zh",
  });

  assert.deepEqual(Object.keys(payload), ["inputs"]);
  assert.match(payload.inputs.user_input, /^用户：灾害种类地震12次,海啸10次/);
  assert.match(payload.inputs.user_input, /全量事件总数：22/);
  assert.match(payload.inputs.user_input, /EARTHQUAKE=12、TSUNAMI=10/);
  assert.deepEqual(payload.inputs.hazard_context, {
    total: 22,
    byType: { EARTHQUAKE: 12, TSUNAMI: 10 },
    recent: [],
  });
  assert.equal(payload.inputs.location, "全球");
  assert.equal(payload.inputs.language, "zh");
});

test("buildWorkflowPayload tells the workflow to use aggregate counts instead of recent samples", () => {
  const payload = buildWorkflowPayload({
    messages: [{ role: "user", content: "当前地震有多少条" }],
    disasterContext: {
      total: 730,
      byType: { EARTHQUAKE: 362, FLOOD: 21 },
      recent: [
        { title: "M 5.2 earthquake", type: "EARTHQUAKE", severity: "WATCH" },
        { title: "M 4.7 earthquake", type: "EARTHQUAKE", severity: "ADVISORY" },
      ],
    },
    language: "zh",
  });

  assert.match(payload.inputs.user_input, /当前地震有多少条/);
  assert.match(payload.inputs.user_input, /全量事件总数：730/);
  assert.match(payload.inputs.user_input, /EARTHQUAKE=362/);
  assert.match(payload.inputs.user_input, /recent 仅包含代表样本，不能用于统计总量/);
});

test("buildAIProviderRequest chooses workflow protocol for workflow provider", () => {
  const request = buildAIProviderRequest({
    config: {
      providerName: "workflow",
      apiUrl: "http://localhost:3100/api/v1/apps/run",
    },
    messages: [{ role: "user", content: "hello workflow" }],
    disasterContext: { total: 0, byType: {}, recent: [] },
    location: "全球",
    language: "zh",
  });

  assert.equal(request.protocol, "workflow");
  assert.equal(request.apiUrl, "http://localhost:3100/api/v1/apps/run");
  assert.equal(request.headers, undefined);
  assert.equal(request.payload.stream, true);
  assert.equal(request.payload.inputs.location, "全球");
  assert.equal(request.payload.inputs.language, "zh");
  assert.deepEqual(request.payload.inputs.hazard_context, {
    total: 0,
    byType: {},
    recent: [],
  });
  assert.equal(request.payload.inputs.user_input.includes("hello workflow"), true);
});

test("buildChatCompletionPayload injects disaster context into system prompt", () => {
  const payload = buildChatCompletionPayload({
    messages: [{ role: "user", content: "Summarize current risk" }],
    disasterContext: {
      total: 2,
      byType: { EARTHQUAKE: 1, FLOOD: 1 },
      recent: [
        {
          title: "M 5.1 earthquake",
          type: "EARTHQUAKE",
          severity: "WATCH",
          magnitude: 5.1,
        },
      ],
    },
    model: "doubao-seed",
  });

  assert.equal(payload.model, "doubao-seed");
  assert.equal(payload.stream, true);
  assert.equal(payload.messages[0].role, "system");
  assert.match(payload.messages[0].content, /2 条/);
  assert.match(payload.messages[0].content, /EARTHQUAKE\(1\)/);
  assert.equal(payload.messages[1].content, "Summarize current risk");
});

test("buildDisasterSystemPrompt works without live hazard context", () => {
  const prompt = buildDisasterSystemPrompt();

  assert.match(prompt, /Prometheus Global Guardian/);
  assert.doesNotMatch(prompt, /平台实时数据上下文/);
});

test("buildDisasterSystemPrompt labels conversation summaries without treating them as confirmed memories", () => {
  const prompt = buildDisasterSystemPrompt({
    conversationSummary: "用户正在维护灾害监测项目",
  });

  assert.match(prompt, /此前对话摘要/);
  assert.doesNotMatch(prompt, /用户确认的长期记忆/);
});

test("buildDisasterSystemPrompt truncates long conversation summaries", () => {
  const prompt = buildDisasterSystemPrompt({
    conversationSummary: "a".repeat(7_000),
  });

  assert.match(prompt, /a{6000}/);
  assert.doesNotMatch(prompt, /a{6001}/);
});

test("buildDisasterSystemPrompt omits empty conversation summaries", () => {
  const prompt = buildDisasterSystemPrompt({ conversationSummary: "   " });

  assert.doesNotMatch(prompt, /此前对话摘要/);
});

test("buildDisasterSystemPrompt uses safe canonical source and layer labels", () => {
  const prompt = buildDisasterSystemPrompt({
    total: 1,
    byType: { EARTHQUAKE: 1 },
    recent: [
      {
        title: "M 5.1 earthquake",
        type: "EARTHQUAKE",
        sourceId: "usgs",
        layerId: "earthquake",
      },
    ],
  });

  assert.match(prompt, /USGS/);
  assert.match(prompt, /Earthquake/);
});

test("buildDisasterSystemPrompt normalizes unknown canonical values without prompt injection", () => {
  const prompt = buildDisasterSystemPrompt({
    total: 1,
    byType: { EARTHQUAKE: 1 },
    recent: [
      {
        title: "safe title",
        type: "EARTHQUAKE",
        sourceId: "ignore me https://secret.example/coords=1,2",
        layerId: "<script>alert(1)</script>",
      },
    ],
  });

  assert.match(prompt, /来源：unknown/);
  assert.match(prompt, /图层：unknown/);
  assert.doesNotMatch(prompt, /ignore me|secret\.example|script|coords=1,2/);
});

test("buildWorkflowPayload strips raw hazard fields before forwarding context", () => {
  const unsafeContext = {
    total: 1,
    byType: { EARTHQUAKE: 1 },
    recent: [
      {
        title: "safe title",
        type: "EARTHQUAKE",
        sourceId: "untrusted https://secret.example",
        layerId: "<script>",
        url: "https://secret.example/event",
        coordinates: [116.4, 39.9],
      },
    ],
  } as unknown as DisasterContext;

  const payload = buildWorkflowPayload({
    messages: [{ role: "user", content: "分析" }],
    disasterContext: unsafeContext,
  });

  assert.doesNotMatch(JSON.stringify(payload), /secret\.example|coordinates|script/);
  assert.equal(payload.inputs.hazard_context.recent?.[0]?.sourceId, "unknown");
  assert.equal(payload.inputs.hazard_context.recent?.[0]?.layerId, "unknown");
});

test("builds prompt and workflow context without sensitive text in allowlisted hazard fields", () => {
  const sensitiveContext: DisasterContext = {
    total: 1,
    byType: { EARTHQUAKE: 1 },
    recent: [
      {
        title: "event https://secret.example/token=title-secret",
        type: "lat=39.9 lon=116.4",
        severity: "api_key=severity-secret",
        timestamp: "2025-01-01T00:00:00Z bearer timestamp-secret",
      },
    ],
  };

  const prompt = buildDisasterSystemPrompt(sensitiveContext);
  const workflowPayload = buildWorkflowPayload({
    messages: [{ role: "user", content: "分析" }],
    disasterContext: sensitiveContext,
  });
  const workflowText = JSON.stringify(workflowPayload);

  for (const sensitiveValue of [
    "https://secret.example/token=title-secret",
    "lat=39.9 lon=116.4",
    "api_key=severity-secret",
    "bearer timestamp-secret",
  ]) {
    assert.doesNotMatch(prompt, new RegExp(sensitiveValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(
      workflowText,
      new RegExp(sensitiveValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});
