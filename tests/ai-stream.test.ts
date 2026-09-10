import test from "node:test";
import assert from "node:assert/strict";

import {
  convertResponsesSSEToChatCompletionsSSE,
  convertWorkflowSSEToChatCompletionsSSE,
  extractWorkflowResult,
  workflowResultToChatCompletionsSSE,
} from "../server/ai/ai-stream.js";

test("convertResponsesSSEToChatCompletionsSSE converts output text deltas", () => {
  const converted = convertResponsesSSEToChatCompletionsSSE(
    [
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":"hello"}',
      "",
      "event: response.output_text.delta",
      'data: {"type":"response.output_text.delta","delta":" world"}',
      "",
    ].join("\n"),
  );

  assert.equal(
    converted,
    [
      'data: {"choices":[{"delta":{"content":"hello"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      "",
      "",
    ].join("\n"),
  );
});

test("convertResponsesSSEToChatCompletionsSSE emits done on completed events", () => {
  const converted = convertResponsesSSEToChatCompletionsSSE(
    ["event: response.completed", 'data: {"type":"response.completed"}', ""].join("\n"),
  );

  assert.equal(converted, "data: [DONE]\n\n");
});

test("convertResponsesSSEToChatCompletionsSSE exposes provider failure without completing", () => {
  const converted = convertResponsesSSEToChatCompletionsSSE('data: {"type":"response.failed"}\n\n');

  assert.match(converted, /event: error/);
  assert.match(converted, /AI_PROVIDER_STREAM_FAILED/);
  assert.doesNotMatch(converted, /\[DONE\]/);
});

test("convertResponsesSSEToChatCompletionsSSE exposes incomplete output without completing", () => {
  const converted = convertResponsesSSEToChatCompletionsSSE(
    'data: {"type":"response.incomplete"}\n\n',
  );

  assert.match(converted, /AI_PROVIDER_STREAM_INCOMPLETE/);
  assert.doesNotMatch(converted, /\[DONE\]/);
});

test("extractWorkflowResult reads published workflow outputs.result", () => {
  const result = extractWorkflowResult({
    success: true,
    data: {
      executionId: "exec_123",
      status: "SUCCESS",
      outputs: {
        result: "答案：地震类型12次，海啸类型10次。",
      },
    },
  });

  assert.equal(result, "答案：地震类型12次，海啸类型10次。");
});

test("workflowResultToChatCompletionsSSE wraps a workflow result for the frontend parser", () => {
  assert.equal(
    workflowResultToChatCompletionsSSE("答案"),
    'data: {"choices":[{"delta":{"content":"答案"}}]}\n\ndata: [DONE]\n\n',
  );
});

test("convertWorkflowSSEToChatCompletionsSSE converts cumulative workflow results to deltas", () => {
  const state = {};
  const first = convertWorkflowSSEToChatCompletionsSSE(
    'data: {"data":{"outputs":{"result":"答案"}}}\n\n',
    state,
  );
  const second = convertWorkflowSSEToChatCompletionsSSE(
    'data: {"data":{"outputs":{"result":"答案：地震"}}}\n\n',
    state,
  );

  assert.equal(first, 'data: {"choices":[{"delta":{"content":"答案"}}]}\n\n');
  assert.equal(second, 'data: {"choices":[{"delta":{"content":"：地震"}}]}\n\n');
});

test("convertWorkflowSSEToChatCompletionsSSE converts the workflow complete event", () => {
  const converted = convertWorkflowSSEToChatCompletionsSSE(
    [
      "event: complete",
      'data: {"executionId":"exec_123","status":"SUCCESS","outputs":{"result":"答案：地震风险可控。"}}',
      "",
    ].join("\n"),
  );

  assert.equal(
    converted,
    'data: {"choices":[{"delta":{"content":"答案：地震风险可控。"}}]}\n\ndata: [DONE]\n\n',
  );
});

test("convertWorkflowSSEToChatCompletionsSSE forwards workflow done markers", () => {
  assert.equal(convertWorkflowSSEToChatCompletionsSSE("data: [DONE]\n\n"), "data: [DONE]\n\n");
});
