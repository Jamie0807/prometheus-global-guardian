/** 验证 AI 路由规则和提供商回退顺序。 */
import test from "node:test";
import assert from "node:assert/strict";

import { routeAIRequest } from "../apps/bff/ai/ai-router.js";
import { buildProviderOrder } from "../apps/bff/ai/ai-chat-route.js";

test("routes disaster knowledge and emergency-plan questions to workflow", () => {
  const decision = routeAIRequest([{ role: "user", content: "请根据历史案例给出地震应急预案" }]);

  assert.equal(decision.target, "workflow");
  assert.equal(decision.reason, "knowledge_base");
  assert.deepEqual(decision.matchedSignals, ["历史案例", "应急预案"]);
});

test("routes live dashboard analysis to workflow when hazard context exists", () => {
  const decision = routeAIRequest([{ role: "user", content: "请分析一下当前态势" }], {
    total: 12,
    byType: {},
    recent: [],
  });

  assert.equal(decision.target, "workflow");
  assert.equal(decision.reason, "live_context");
});

test("routes general conversation to Volcengine Ark", () => {
  const decision = routeAIRequest([{ role: "user", content: "你好，请帮我润色这段项目介绍" }]);

  assert.equal(decision.target, "volcengine");
  assert.equal(decision.reason, "general");
  assert.deepEqual(decision.matchedSignals, []);
});

test("routes using the latest user message instead of assistant content", () => {
  const decision = routeAIRequest([
    { role: "assistant", content: "上一轮提到了地震知识库" },
    { role: "user", content: "谢谢，帮我改写这句话" },
  ]);

  assert.equal(decision.target, "volcengine");
});

test("builds a fallback provider order only in router mode", () => {
  const workflowDecision = routeAIRequest([{ role: "user", content: "查询地震历史案例" }]);
  const arkDecision = routeAIRequest([{ role: "user", content: "帮我润色项目介绍" }]);

  assert.deepEqual(buildProviderOrder("router", workflowDecision), ["workflow", "volcengine"]);
  assert.deepEqual(buildProviderOrder("router", arkDecision), ["volcengine", "workflow"]);
  assert.deepEqual(buildProviderOrder("workflow", workflowDecision), ["workflow"]);
  assert.deepEqual(buildProviderOrder("ark", workflowDecision), ["volcengine"]);
});
