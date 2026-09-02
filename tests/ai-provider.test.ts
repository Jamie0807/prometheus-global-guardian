import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAIProviderRequest,
  buildChatCompletionPayload,
  buildDisasterSystemPrompt,
  buildResponsesPayload,
  buildWorkflowPayload,
  normalizeAIProviderApiUrl,
  resolveAIRequestTimeoutMs,
  resolveServerAIProviderConfig,
} from '../server/ai/ai-provider.js';

test('resolveServerAIProviderConfig reads server-side Volcengine Ark variables', () => {
  const config = resolveServerAIProviderConfig({
    VOLCENGINE_ARK_API_KEY: ' ark-key ',
    VOLCENGINE_ARK_MODEL: ' doubao-seed ',
    VOLCENGINE_ARK_API_URL: ' https://ark.example.com/chat ',
  });

  assert.equal(config.configured, true);
  assert.equal(config.apiKey, 'ark-key');
  assert.equal(config.model, 'doubao-seed');
  assert.equal(config.apiUrl, 'https://ark.example.com/chat');
  assert.equal(config.requestTimeoutMs, 30000);
});

test('resolveServerAIProviderConfig reports missing model separately from missing key', () => {
  const config = resolveServerAIProviderConfig({
    VOLCENGINE_ARK_API_KEY: 'ark-key',
  });

  assert.equal(config.configured, false);
  assert.equal(config.reason, 'missing_model');
});

test('resolveServerAIProviderConfig reads workflow provider configuration', () => {
  const config = resolveServerAIProviderConfig({
    AI_PROVIDER: 'workflow',
    VOLCENGINE_WORKFLOW_API_URL: ' http://localhost:3100/api/v1/apps/run ',
    VOLCENGINE_WORKFLOW_API_KEY: ' workflow-key ',
  });

  assert.equal(config.configured, true);
  assert.equal(config.providerName, 'workflow');
  assert.equal(config.apiUrl, 'http://localhost:3100/api/v1/apps/run');
  assert.equal(config.apiKey, 'workflow-key');
});

test('resolveServerAIProviderConfig reports missing workflow url', () => {
  const config = resolveServerAIProviderConfig({
    AI_PROVIDER: 'workflow',
  });

  assert.equal(config.configured, false);
  assert.equal(config.reason, 'missing_workflow_url');
  assert.equal(config.providerName, 'workflow');
});

test('resolveAIRequestTimeoutMs defaults and caps provider timeouts', () => {
  assert.equal(resolveAIRequestTimeoutMs({}), 30000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: '45000' }), 45000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: '180000' }), 120000);
  assert.equal(resolveAIRequestTimeoutMs({ VOLCENGINE_ARK_TIMEOUT_MS: '-1' }), 30000);
});

test('normalizeAIProviderApiUrl routes plan base URLs to responses endpoint', () => {
  assert.deepEqual(
    normalizeAIProviderApiUrl('https://ark.cn-beijing.volces.com/api/plan/v3'),
    {
      apiUrl: 'https://ark.cn-beijing.volces.com/api/plan/v3/responses',
      protocol: 'responses',
    },
  );

  assert.deepEqual(
    normalizeAIProviderApiUrl('https://ark.cn-beijing.volces.com/api/v3/chat/completions'),
    {
      apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
      protocol: 'chat_completions',
    },
  );
});

test('buildResponsesPayload converts chat messages for the Responses API', () => {
  const payload = buildResponsesPayload({
    messages: [
      { role: 'assistant', content: 'Previous answer' },
      { role: 'user', content: 'Summarize current risk' },
    ],
    disasterContext: { total: 0, byType: {}, recent: [] },
    model: 'ark-code-latest',
  });

  assert.equal(payload.model, 'ark-code-latest');
  assert.equal(payload.stream, true);
  assert.equal(payload.max_output_tokens, 1500);
  assert.match(payload.instructions, /Prometheus Global Guardian/);
  assert.deepEqual(payload.input, [
    { role: 'assistant', content: 'Previous answer' },
    { role: 'user', content: 'Summarize current risk' },
  ]);
});

test('buildAIProviderRequest chooses Responses API for plan base URLs', () => {
  const request = buildAIProviderRequest({
    config: {
      model: 'ark-code-latest',
      apiUrl: 'https://ark.cn-beijing.volces.com/api/plan/v3',
    },
    messages: [{ role: 'user', content: 'hello' }],
    disasterContext: null,
  });

  assert.equal(request.protocol, 'responses');
  assert.equal(request.apiUrl, 'https://ark.cn-beijing.volces.com/api/plan/v3/responses');
  assert.equal(request.payload.model, 'ark-code-latest');
  assert.equal(request.payload.input[0].content, 'hello');
});

test('buildWorkflowPayload sends the latest user input and workflow context', () => {
  const payload = buildWorkflowPayload({
    messages: [
      { role: 'assistant', content: 'Previous answer' },
      { role: 'user', content: '灾害种类地震12次,海啸10次' },
    ],
    disasterContext: { total: 22, byType: { EARTHQUAKE: 12, TSUNAMI: 10 }, recent: [] },
    location: '全球',
    language: 'zh',
  });

  assert.deepEqual(Object.keys(payload), ['inputs']);
  assert.equal(payload.inputs.user_input, '用户：灾害种类地震12次,海啸10次');
  assert.deepEqual(payload.inputs.hazard_context, {
    total: 22,
    byType: { EARTHQUAKE: 12, TSUNAMI: 10 },
    recent: [],
  });
  assert.equal(payload.inputs.location, '全球');
  assert.equal(payload.inputs.language, 'zh');
});

test('buildAIProviderRequest chooses workflow protocol for workflow provider', () => {
  const request = buildAIProviderRequest({
    config: {
      providerName: 'workflow',
      apiUrl: 'http://localhost:3100/api/v1/apps/run',
    },
    messages: [{ role: 'user', content: 'hello workflow' }],
    disasterContext: { total: 0, byType: {}, recent: [] },
    location: '全球',
    language: 'zh',
  });

  assert.equal(request.protocol, 'workflow');
  assert.equal(request.apiUrl, 'http://localhost:3100/api/v1/apps/run');
  assert.equal(request.headers, undefined);
  assert.equal(request.payload.stream, true);
  assert.equal(request.payload.inputs.location, '全球');
  assert.equal(request.payload.inputs.language, 'zh');
  assert.deepEqual(request.payload.inputs.hazard_context, {
    total: 0,
    byType: {},
    recent: [],
  });
  assert.equal(request.payload.inputs.user_input.includes('hello workflow'), true);
});

test('buildChatCompletionPayload injects disaster context into system prompt', () => {
  const payload = buildChatCompletionPayload({
    messages: [{ role: 'user', content: 'Summarize current risk' }],
    disasterContext: {
      total: 2,
      byType: { EARTHQUAKE: 1, FLOOD: 1 },
      recent: [
        {
          title: 'M 5.1 earthquake',
          type: 'EARTHQUAKE',
          severity: 'WATCH',
          magnitude: 5.1,
        },
      ],
    },
    model: 'doubao-seed',
  });

  assert.equal(payload.model, 'doubao-seed');
  assert.equal(payload.stream, true);
  assert.equal(payload.messages[0].role, 'system');
  assert.match(payload.messages[0].content, /2 条/);
  assert.match(payload.messages[0].content, /EARTHQUAKE\(1\)/);
  assert.equal(payload.messages[1].content, 'Summarize current risk');
});

test('buildDisasterSystemPrompt works without live hazard context', () => {
  const prompt = buildDisasterSystemPrompt();

  assert.match(prompt, /Prometheus Global Guardian/);
  assert.doesNotMatch(prompt, /平台实时数据上下文/);
});
