/** 解析 AI 提供商配置，并构造不同协议的请求与灾害上下文提示。 */
const DEFAULT_ARK_API_URL = "https://ark.cn-beijing.volces.com/api/plan/v3";
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

export type ProviderName = "workflow" | "volcengine";
export type AIProviderMode = "router" | "workflow" | "ark";
type ProviderProtocol = "workflow" | "responses" | "chat_completions";
type ProviderConfigReason = "" | "missing_workflow_url" | "missing_key" | "missing_model";

export interface HazardSummary {
  title?: string;
  type?: string;
  severity?: string;
  magnitude?: number;
}

export interface DisasterContext {
  total?: number;
  byType?: Record<string, number>;
  recent?: HazardSummary[];
  [key: string]: unknown;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ServerEnvironment {
  [key: string]: string | undefined;
}

export interface ServerAIProviderConfig {
  configured: boolean;
  reason: ProviderConfigReason;
  providerName: ProviderName;
  apiKey: string;
  apiUrl: string;
  model: string;
  requestTimeoutMs: number;
}

interface ProviderConfigInput {
  providerName?: ProviderName;
  apiKey?: string;
  apiUrl: string;
  model?: string;
}

interface ChatCompletionPayload {
  model: string;
  stream: true;
  temperature: number;
  max_tokens: number;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
}

interface ResponsesPayload {
  model: string;
  stream: true;
  temperature: number;
  max_output_tokens: number;
  instructions: string;
  input: ChatMessage[];
}

interface WorkflowPayload {
  inputs: {
    user_input: string;
    hazard_context: DisasterContext;
    location: string;
    language: string;
  };
  stream?: true;
}

export type AIProviderRequest =
  | {
      apiUrl: string;
      protocol: "workflow";
      headers?: Record<string, string>;
      payload: WorkflowPayload & { stream: true };
    }
  | {
      apiUrl: string;
      protocol: "responses";
      headers?: Record<string, string>;
      payload: ResponsesPayload;
    }
  | {
      apiUrl: string;
      protocol: "chat_completions";
      headers?: Record<string, string>;
      payload: ChatCompletionPayload;
    };

const firstValue = (...values: unknown[]): string =>
  (() => {
    const value = values.find(
      (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
    );
    return typeof value === "string" ? value.trim() : "";
  })();

export function resolveAIProviderMode(env: ServerEnvironment = process.env): AIProviderMode {
  const configuredProvider = firstValue(env.AI_PROVIDER, env.VOLCENGINE_AI_PROVIDER).toLowerCase();

  if (configuredProvider === "workflow") return "workflow";
  if (configuredProvider === "ark" || configuredProvider === "volcengine") return "ark";
  return "router";
}

export function resolveServerAIProviderConfig(
  env: ServerEnvironment = process.env,
  requestedProvider?: ProviderName,
): ServerAIProviderConfig {
  const providerName: ProviderName =
    requestedProvider ?? (resolveAIProviderMode(env) === "workflow" ? "workflow" : "volcengine");

  if (providerName === "workflow") {
    const apiUrl = firstValue(env.VOLCENGINE_WORKFLOW_API_URL, env.AI_WORKFLOW_API_URL);

    if (!apiUrl) {
      return {
        configured: false,
        reason: "missing_workflow_url",
        providerName: "workflow",
        apiKey: "",
        apiUrl: "",
        model: "",
        requestTimeoutMs: resolveAIRequestTimeoutMs(env),
      };
    }

    return {
      configured: true,
      reason: "",
      providerName: "workflow",
      apiKey: firstValue(env.VOLCENGINE_WORKFLOW_API_KEY, env.AI_WORKFLOW_API_KEY),
      apiUrl,
      model: "",
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  const apiKey = firstValue(env.VOLCENGINE_ARK_API_KEY, env.ARK_API_KEY);

  if (!apiKey) {
    return {
      configured: false,
      reason: "missing_key",
      providerName: "volcengine",
      apiKey: "",
      apiUrl: "",
      model: "",
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  const model = firstValue(env.VOLCENGINE_ARK_MODEL, env.ARK_MODEL);

  if (!model) {
    return {
      configured: false,
      reason: "missing_model",
      providerName: "volcengine",
      apiKey,
      apiUrl: firstValue(env.VOLCENGINE_ARK_API_URL, env.ARK_API_URL) || DEFAULT_ARK_API_URL,
      model: "",
      requestTimeoutMs: resolveAIRequestTimeoutMs(env),
    };
  }

  return {
    configured: true,
    reason: "",
    providerName: "volcengine",
    apiKey,
    apiUrl: firstValue(env.VOLCENGINE_ARK_API_URL, env.ARK_API_URL) || DEFAULT_ARK_API_URL,
    model,
    requestTimeoutMs: resolveAIRequestTimeoutMs(env),
  };
}

export function normalizeAIProviderApiUrl(apiUrl = DEFAULT_ARK_API_URL): {
  apiUrl: string;
  protocol: Exclude<ProviderProtocol, "workflow">;
} {
  const trimmedUrl = firstValue(apiUrl) || DEFAULT_ARK_API_URL;
  const normalizedUrl = trimmedUrl.replace(/\/+$/, "");
  const lowerUrl = normalizedUrl.toLowerCase();

  if (lowerUrl.endsWith("/responses")) {
    return {
      apiUrl: normalizedUrl,
      protocol: "responses",
    };
  }

  if (lowerUrl.endsWith("/chat/completions")) {
    return {
      apiUrl: normalizedUrl,
      protocol: "chat_completions",
    };
  }

  if (lowerUrl.includes("/api/plan/v3")) {
    return {
      apiUrl: `${normalizedUrl}/responses`,
      protocol: "responses",
    };
  }

  return {
    apiUrl: normalizedUrl,
    protocol: "chat_completions",
  };
}

export function resolveAIRequestTimeoutMs(env: ServerEnvironment = process.env): number {
  const rawValue = firstValue(env.VOLCENGINE_ARK_TIMEOUT_MS, env.ARK_TIMEOUT_MS);
  const parsed = Number(rawValue);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }

  return Math.min(parsed, 120_000);
}

export function buildDisasterSystemPrompt(ctx?: DisasterContext | null): string {
  let prompt = `你是 Prometheus Global Guardian 平台的 AI 灾害分析助手（Powered by LLM）。
你的专业领域：全球灾害监控、风险评估、应急响应分析与减灾策略。

职责范围：
• 解读平台实时灾害监控数据，提供专业态势研判
• 对地震、火山、洪水、风暴、野火、干旱、海啸等灾害进行深度分析
• 基于历史数据与当前态势，研判灾害发展趋势
• 提供具体、可操作的应急响应建议与减灾策略
• 解答灾害科学相关专业问题

输出规范：使用结构化 Markdown 格式（标题、要点列表），语言简洁专业，关键数据加粗。`;

  if (ctx && Number(ctx.total) > 0) {
    const topTypes = Object.entries(ctx.byType ?? {})
      .sort(([, a], [, b]) => Number(b) - Number(a))
      .slice(0, 6)
      .map(([type, count]) => `${type}(${count})`)
      .join("、");

    const recentStr = Array.isArray(ctx.recent)
      ? ctx.recent
          .slice(0, 4)
          .map((hazard) => {
            const severity = hazard.severity ? ` ${hazard.severity}` : "";
            const magnitude = hazard.magnitude ? ` M${hazard.magnitude}` : "";
            return `「${hazard.title}」${hazard.type}${severity}${magnitude}`;
          })
          .join("；")
      : "";

    prompt += `

---
📡 **平台实时数据上下文（${new Date().toLocaleString("zh-CN")}）**
- 活跃监控事件总数：**${ctx.total} 条**
- 灾害类型分布：${topTypes}
- 近期代表事件：${recentStr || "暂无"}

请在分析时优先结合以上实时数据，提供具有针对性的研判。`;
  }

  return prompt;
}

const normalizeMessages = (messages: unknown): ChatMessage[] => {
  if (!Array.isArray(messages)) return [];

  return messages.filter((message): message is ChatMessage => {
    if (!message || typeof message !== "object") return false;
    const candidate = message as Record<string, unknown>;
    return (
      (candidate.role === "user" || candidate.role === "assistant") &&
      typeof candidate.content === "string"
    );
  });
};

export function buildChatCompletionPayload({
  messages,
  disasterContext,
  model,
}: {
  messages?: unknown;
  disasterContext?: DisasterContext | null;
  model?: string;
}): ChatCompletionPayload {
  const safeMessages = normalizeMessages(messages);

  return {
    model: model ?? "",
    stream: true,
    temperature: 0.7,
    max_tokens: 1500,
    messages: [
      { role: "system", content: buildDisasterSystemPrompt(disasterContext) },
      ...safeMessages,
    ],
  };
}

export function buildResponsesPayload({
  messages,
  disasterContext,
  model,
}: {
  messages?: unknown;
  disasterContext?: DisasterContext | null;
  model?: string;
}): ResponsesPayload {
  const safeMessages = normalizeMessages(messages);

  return {
    model: model ?? "",
    stream: true,
    temperature: 0.7,
    max_output_tokens: 1500,
    instructions: buildDisasterSystemPrompt(disasterContext),
    input: safeMessages,
  };
}

export function buildWorkflowPayload({
  messages,
  disasterContext,
  location,
  language,
}: {
  messages?: unknown;
  disasterContext?: DisasterContext | null;
  location?: unknown;
  language?: unknown;
}): WorkflowPayload {
  const safeMessages = normalizeMessages(messages);
  const latestInput =
    [...safeMessages].reverse().find((message) => message.role === "user") ?? safeMessages.at(-1);

  return {
    inputs: {
      user_input: latestInput
        ? `${latestInput.role === "assistant" ? "助手" : "用户"}：${latestInput.content}`
        : "",
      hazard_context:
        disasterContext && typeof disasterContext === "object"
          ? disasterContext
          : { total: 0, byType: {}, recent: [] },
      location: typeof location === "string" ? location.trim() : "",
      language: typeof language === "string" && language.trim() ? language.trim() : "zh",
    },
  };
}

export function buildAIProviderRequest({
  config,
  messages,
  disasterContext,
  location,
  language,
}: {
  config: ProviderConfigInput;
  messages?: unknown;
  disasterContext?: DisasterContext | null;
  location?: unknown;
  language?: unknown;
}): AIProviderRequest {
  if (config.providerName === "workflow") {
    const workflowPayload = buildWorkflowPayload({
      messages,
      disasterContext,
      location,
      language,
    });

    return {
      apiUrl: config.apiUrl.replace(/\/+$/, ""),
      protocol: "workflow",
      payload: {
        ...workflowPayload,
        stream: true,
      },
    };
  }

  const target = normalizeAIProviderApiUrl(config.apiUrl);

  if (target.protocol === "responses") {
    return {
      ...target,
      protocol: "responses",
      payload: buildResponsesPayload({ messages, disasterContext, model: config.model }),
    };
  }

  return {
    ...target,
    protocol: "chat_completions",
    payload: buildChatCompletionPayload({ messages, disasterContext, model: config.model }),
  };
}
