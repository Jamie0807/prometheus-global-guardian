/** 验证 AI 流式响应在不同 SSE 协议间的转换结果。 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  convertResponsesSSEToChatCompletionsSSE,
  convertWorkflowSSEToChatCompletionsSSE,
  extractWorkflowResult,
  workflowResultToChatCompletionsSSE,
} from "../ai/ai-stream.js";

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

test("extractWorkflowResult expands structured workflow output when result is only a heading", () => {
  const result = extractWorkflowResult({
    data: {
      outputs: {
        result: "当前全球灾害态势如下：",
        summary: "全球总共有427个灾害事件，其中以地震为主，数量达到360个。",
        risk_level: "MEDIUM",
        key_findings: '[{"type":"EARTHQUAKE","count":360}]',
        recommendations: '[{"type":"通用建议","content":"优先关注高风险事件。"}]',
        limitations: '[{"type":"数据限制","content":"地点信息不完整。"}]',
      },
    },
  });

  assert.match(result, /当前全球灾害态势如下/);
  assert.match(result, /全球总共有427个灾害事件/);
  assert.match(result, /MEDIUM/);
  assert.match(result, /地震：360 起/);
  assert.match(result, /优先关注高风险事件/);
  assert.match(result, /地点信息不完整/);
});

test("extractWorkflowResult renumbers recommendations from one and hides provider field names", () => {
  const result = extractWorkflowResult({
    data: {
      outputs: {
        result: "洪水风险分析如下：",
        recommendations: JSON.stringify([
          { type: "通用建议", message: "遵循当地疏散通知。" },
          { type: "FLOOD", recommendation: "不要步行或驾车穿越未知深度积水。" },
        ]),
      },
    },
  });

  assert.match(
    result,
    /\*\*优先行动建议\*\*\n1\. 遵循当地疏散通知。\n2\. 不要步行或驾车穿越未知深度积水。/,
  );
  assert.doesNotMatch(result, /type\s*[:：]|message\s*[:：]|recommendation\s*[:：]/);
});

test("extractWorkflowResult removes embedded numbering and internal fields from text recommendations", () => {
  const result = extractWorkflowResult({
    outputs: {
      recommendations: JSON.stringify([
        "2. recommendation：提前准备饮水、药品、照明和通讯设备，type：通用建议",
        "6. type：DROUGHT，message：关注当地水资源管理部门的用水通知。",
      ]),
    },
  });

  assert.match(
    result,
    /\*\*优先行动建议\*\*\n1\. 提前准备饮水、药品、照明和通讯设备\n2\. 关注当地水资源管理部门的用水通知。/,
  );
  assert.doesNotMatch(
    result,
    /(^|\n)2\. recommendation|(^|\n)6\. type|message\s*[:：]|type\s*[:：]/,
  );
});

test("extractWorkflowResult presents key findings without raw event metadata", () => {
  const result = extractWorkflowResult({
    outputs: {
      key_findings: JSON.stringify([
        {
          title: "M 4.7 - 80 km SW of Labuan, Indonesia",
          type: "EARTHQUAKE",
          severity: "ADVISORY",
          sourceId: "usgs",
          layerId: "earthquake",
          timestamp: "2026-09-25T13:47:26.836Z",
          magnitude: 4.7,
        },
      ]),
    },
  });

  assert.match(
    result,
    /\*\*关键发现\*\*\n- M 4\.7 - 80 km SW of Labuan, Indonesia（地震，提示级）/,
  );
  assert.doesNotMatch(result, /sourceId|layerId|timestamp|EARTHQUAKE|ADVISORY/);
});

test("extractWorkflowResult removes provider-rendered sections before rebuilding structured sections", () => {
  const result = extractWorkflowResult({
    outputs: {
      result: [
        "当前有 729 条灾害数据。",
        "",
        "**关键发现**",
        "- 地震",
        "",
        "**优先行动建议**",
        "9. 请注意当前地震活动",
      ].join("\n"),
      key_findings: '[{"type":"EARTHQUAKE"},{"type":"EARTHQUAKE"}]',
      recommendations: '["9. 请注意当前地震活动"]',
    },
  });

  assert.equal((result.match(/\*\*关键发现\*\*/g) ?? []).length, 1);
  assert.equal((result.match(/\*\*优先行动建议\*\*/g) ?? []).length, 1);
  assert.match(result, /\*\*优先行动建议\*\*\n1\. 请注意当前地震活动/);
  assert.doesNotMatch(result, /(^|\n)9\. /);
});

test("extractWorkflowResult deduplicates repeated key findings after humanization", () => {
  const result = extractWorkflowResult({
    outputs: {
      key_findings: JSON.stringify([
        { type: "EARTHQUAKE" },
        { type: "EARTHQUAKE" },
        { type: "FLOOD" },
      ]),
    },
  });

  assert.equal((result.match(/- 地震/g) ?? []).length, 1);
  assert.equal((result.match(/- 洪水/g) ?? []).length, 1);
});

test("extractWorkflowResult preserves a provider-only report when structured fields are absent", () => {
  const result = extractWorkflowResult({
    outputs: {
      result: ["当前灾害分析", "", "**关键发现**", "- 地震"].join("\n"),
    },
  });

  assert.equal(result, ["当前灾害分析", "", "**关键发现**", "- 地震"].join("\n"));
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

test("convertWorkflowSSEToChatCompletionsSSE preserves structured fields from the final result", () => {
  const converted = convertWorkflowSSEToChatCompletionsSSE(
    [
      "event: complete",
      `data: ${JSON.stringify({
        outputs: {
          result: "当前全球灾害态势如下：",
          summary: "全球总共有427个灾害事件。",
          recommendations: '[{"type":"通用建议","content":"优先关注高风险事件。"}]',
        },
      })}`,
      "",
    ].join("\n"),
  );

  assert.match(converted, /全球总共有427个灾害事件/);
  assert.match(converted, /优先关注高风险事件/);
  assert.match(converted, /data: \[DONE\]/);
});

test("convertWorkflowSSEToChatCompletionsSSE forwards workflow done markers", () => {
  assert.equal(convertWorkflowSSEToChatCompletionsSSE("data: [DONE]\n\n"), "data: [DONE]\n\n");
});
