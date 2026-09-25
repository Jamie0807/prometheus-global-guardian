/** 在工作流、Responses 和聊天补全 SSE 格式之间转换 AI 流式响应。 */
import { Transform } from "stream";
import { StringDecoder } from "node:string_decoder";

interface WorkflowStreamState {
  previousWorkflowResult?: string;
}

const MAX_SSE_FRAME_BYTES = 64 * 1024;

function splitBoundedSSEFrames(
  buffer: string,
): { frames: string[]; remainder: string } | undefined {
  const frames = buffer.split(/\r?\n\r?\n/);
  const remainder = frames.pop() ?? "";
  if (
    frames.some((frame) => Buffer.byteLength(frame, "utf8") > MAX_SSE_FRAME_BYTES) ||
    Buffer.byteLength(remainder, "utf8") > MAX_SSE_FRAME_BYTES
  ) {
    return undefined;
  }
  return { frames, remainder };
}

const toChatCompletionDelta = (delta: string): string =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: delta } }] })}\n\n`;

const RESPONSE_FAILURE_CODES = {
  "response.failed": "AI_PROVIDER_STREAM_FAILED",
  "response.incomplete": "AI_PROVIDER_STREAM_INCOMPLETE",
} as const;
const MAX_WORKFLOW_RESULT_CHARACTERS = 16_000;
const WORKFLOW_STRUCTURED_SECTION_PATTERN =
  /(?:^|\n)\s*(?:\*\*)?(摘要|风险等级|关键发现|优先行动建议|数据来源|数据限制)(?:\*\*)?\s*[:：]?\s*(?:\n|$)/g;

function toStreamError(code: string): string {
  return `event: error\ndata: ${JSON.stringify({
    code,
    message: "AI provider stream failed.",
  })}\n\n`;
}

export function convertResponsesSSEToChatCompletionsSSE(sseText: string): string {
  let output = "";

  for (const line of sseText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) {
      continue;
    }

    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") {
      if (data === "[DONE]") {
        output += "data: [DONE]\n\n";
      }
      continue;
    }

    try {
      const event = JSON.parse(data);
      const delta = typeof event.delta === "string" ? event.delta : "";

      if (delta) {
        output += toChatCompletionDelta(delta);
      } else if (event.type === "response.completed") {
        output += "data: [DONE]\n\n";
      } else if (event.type in RESPONSE_FAILURE_CODES) {
        output += toStreamError(
          RESPONSE_FAILURE_CODES[event.type as keyof typeof RESPONSE_FAILURE_CODES],
        );
      }
    } catch {
      // 忽略格式错误的提供商分块；下一分块仍可能是有效的 SSE。
    }
  }

  return output;
}

export function extractWorkflowResult(workflowResponse: unknown): string {
  const outputs = readWorkflowOutputs(workflowResponse);
  if (!outputs) return "";

  const resultText = readText(outputs.result);
  const sections = [
    formatTextSection("摘要", outputs.summary),
    formatRiskSection(outputs.risk_level),
    formatListSection("关键发现", outputs.key_findings, formatKeyFindingItem),
    formatListSection("优先行动建议", outputs.recommendations, formatRecommendationItem, true),
    formatListSection("数据来源", outputs.sources, formatSourceItem),
    formatListSection("数据限制", outputs.limitations, formatLimitationItem),
  ].filter((section): section is string => Boolean(section));

  const result = sections.length > 0 ? stripProviderRenderedSections(resultText) : resultText;
  if (sections.length === 0) return result;
  return [result, ...sections]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, MAX_WORKFLOW_RESULT_CHARACTERS);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readWorkflowOutputs(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  if (isRecord(value.data) && isRecord(value.data.outputs)) return value.data.outputs;
  if (isRecord(value.outputs)) return value.outputs;
  return undefined;
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseStructuredValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (!text) return "";
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readScalar(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function stripProviderRenderedSections(value: string): string {
  WORKFLOW_STRUCTURED_SECTION_PATTERN.lastIndex = 0;
  const match = WORKFLOW_STRUCTURED_SECTION_PATTERN.exec(value);
  WORKFLOW_STRUCTURED_SECTION_PATTERN.lastIndex = 0;
  return match?.index === undefined ? value : value.slice(0, match.index).trim();
}

function readFirstScalar(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = readScalar(record[key]);
    if (value) return value;
  }
  return "";
}

function formatTextSection(label: string, value: unknown): string {
  const text = readText(value);
  return text ? `**${label}**\n${text}` : "";
}

function formatRiskSection(value: unknown): string {
  const risk = readText(value);
  if (!risk) return "";
  const labels: Record<string, string> = {
    LOW: "低风险",
    MEDIUM: "中风险",
    HIGH: "高风险",
    CRITICAL: "极高风险",
  };
  const label = labels[risk.toUpperCase()];
  return `**风险等级**\n${label ? `${risk}（${label}）` : risk}`;
}

function stripListMarker(value: string): string {
  return value.replace(/^\s*(?:[-*•]\s+|\d+\s*[.)、]\s*)/, "").trim();
}

function formatRecommendationText(value: string): string {
  let text = stripListMarker(value);
  const labeledMessage = text.match(
    /^(?:type|类型)\s*[:：]\s*[^,，]+[,，]\s*(?:message|recommendation|content|建议)\s*[:：]\s*(.+)$/i,
  );
  if (labeledMessage?.[1]) return labeledMessage[1].trim();

  text = text.replace(/^(?:message|recommendation|content|建议)\s*[:：]\s*/i, "");
  return text.replace(/\s*[,，]\s*(?:type|类型)\s*[:：]\s*[^,，]+$/i, "").trim();
}

const HAZARD_TYPE_LABELS: Record<string, string> = {
  EARTHQUAKE: "地震",
  FLOOD: "洪水",
  STORM: "暴风雨",
  WILDFIRE: "野火",
  TROPICAL_CYCLONE: "热带气旋",
  DROUGHT: "干旱",
  LANDSLIDE: "滑坡",
  VOLCANO: "火山",
  TSUNAMI: "海啸",
};

const SEVERITY_LABELS: Record<string, string> = {
  ADVISORY: "提示级",
  WATCH: "关注级",
  WARNING: "警戒级",
  EMERGENCY: "紧急级",
};

function formatHazardType(value: string): string {
  return HAZARD_TYPE_LABELS[value.toUpperCase()] ?? "";
}

function formatSeverity(value: string): string {
  return SEVERITY_LABELS[value.toUpperCase()] ?? "";
}

function formatRecommendationItem(value: unknown): string {
  const parsed = parseStructuredValue(value);
  const scalar = readScalar(parsed);
  if (scalar) return formatRecommendationText(scalar);
  if (!isRecord(parsed)) return "";

  const message = readFirstScalar(parsed, [
    "content",
    "message",
    "recommendation",
    "action",
    "description",
    "text",
  ]);
  if (message) return formatRecommendationText(message);
  return "";
}

function formatKeyFindingItem(value: unknown): string {
  const parsed = parseStructuredValue(value);
  const scalar = readScalar(parsed);
  if (scalar) return stripListMarker(scalar);
  if (!isRecord(parsed)) return "";

  const title = readFirstScalar(parsed, ["title", "finding", "summary", "description", "text"]);
  const type = formatHazardType(readScalar(parsed.type));
  const severity = formatSeverity(readScalar(parsed.severity));
  if (title) {
    const qualifiers = [type, severity].filter(Boolean);
    return `${stripListMarker(title)}${qualifiers.length > 0 ? `（${qualifiers.join("，")}）` : ""}`;
  }

  const count = readScalar(parsed.count);
  if (type && count) return `${type}：${count}${typeof parsed.count === "number" ? " 起" : ""}`;
  return type;
}

function formatSourceItem(value: unknown): string {
  const parsed = parseStructuredValue(value);
  const scalar = readScalar(parsed);
  if (scalar) return stripListMarker(scalar);
  if (!isRecord(parsed)) return "";

  const name = readFirstScalar(parsed, ["name", "source", "title", "label"]);
  const url = readFirstScalar(parsed, ["url", "href"]);
  if (name && url) return `${name}（${url}）`;
  return name || url;
}

function formatLimitationItem(value: unknown): string {
  const parsed = parseStructuredValue(value);
  const scalar = readScalar(parsed);
  if (scalar) return stripListMarker(scalar);
  if (!isRecord(parsed)) return "";

  return readFirstScalar(parsed, [
    "content",
    "message",
    "limitation",
    "description",
    "reason",
    "text",
  ]);
}

function formatListSection(
  label: string,
  value: unknown,
  formatter: (value: unknown) => string,
  ordered = false,
): string {
  const parsed = parseStructuredValue(value);
  const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const seen = new Set<string>();
  const formatted = items.map(formatter).filter((item) => {
    if (!item) return false;
    const normalized = item.replace(/\s+/g, " ").trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
  if (formatted.length === 0) return "";
  const lines = formatted.map((item, index) => `${ordered ? `${index + 1}.` : "-"} ${item}`);
  return `**${label}**\n${lines.join("\n")}`;
}

export function workflowResultToChatCompletionsSSE(result: string): string {
  return `${toChatCompletionDelta(result)}data: [DONE]\n\n`;
}

export function convertWorkflowSSEToChatCompletionsSSE(
  sseText: string,
  state: WorkflowStreamState = {},
): string {
  let output = "";
  let eventType = "";

  for (const line of sseText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("event:")) {
      eventType = trimmed.slice(6).trim();
      continue;
    }

    if (!trimmed.startsWith("data:")) {
      continue;
    }

    const data = trimmed.slice(5).trim();
    if (!data) {
      continue;
    }

    if (data === "[DONE]") {
      output += "data: [DONE]\n\n";
      continue;
    }

    try {
      const event: unknown = JSON.parse(data);
      if (!event || typeof event !== "object") continue;
      const eventRecord = event as Record<string, unknown>;
      const directDelta = typeof eventRecord.delta === "string" ? eventRecord.delta : "";
      const directContent = typeof eventRecord.content === "string" ? eventRecord.content : "";
      const eventData =
        eventRecord.data && typeof eventRecord.data === "object" ? eventRecord.data : eventRecord;
      const result = extractWorkflowResult(eventRecord) || extractWorkflowResult(eventData);
      const resolvedEventType = typeof eventRecord.type === "string" ? eventRecord.type : eventType;

      if (directDelta) {
        output += toChatCompletionDelta(directDelta);
      } else if (directContent) {
        output += toChatCompletionDelta(directContent);
      } else if (result) {
        const previousResult = state.previousWorkflowResult ?? "";
        const delta = result.startsWith(previousResult)
          ? result.slice(previousResult.length)
          : result;
        state.previousWorkflowResult = result;

        if (delta) {
          output += toChatCompletionDelta(delta);
        }
      }

      if (resolvedEventType === "complete") {
        output += "data: [DONE]\n\n";
      }
    } catch {
      // 忽略格式错误的提供商分块；下一分块仍可能是有效的 SSE。
    }
  }

  return output;
}

export function createWorkflowToChatCompletionsStream(): Transform {
  let buffer = "";
  const state = {};
  const decoder = new StringDecoder("utf8");

  return new Transform({
    transform(chunk, _encoding, callback) {
      // 上游 TCP 分块可能截断 SSE 事件；只转换以空行结束的完整事件。
      buffer += typeof chunk === "string" ? decoder.end() + chunk : decoder.write(chunk);
      const split = splitBoundedSSEFrames(buffer);
      if (!split) {
        callback(new Error("SSE frame exceeds the allowed size."));
        return;
      }
      buffer = split.remainder;

      for (const part of split.frames) {
        this.push(convertWorkflowSSEToChatCompletionsSSE(`${part}\n\n`, state));
      }

      callback();
    },
    flush(callback) {
      buffer += decoder.end();
      if (Buffer.byteLength(buffer, "utf8") > MAX_SSE_FRAME_BYTES) {
        callback(new Error("SSE frame exceeds the allowed size."));
        return;
      }
      if (buffer.trim()) {
        this.push(convertWorkflowSSEToChatCompletionsSSE(buffer, state));
      }
      callback();
    },
  });
}

export function createResponsesToChatCompletionsStream(): Transform {
  let buffer = "";
  const decoder = new StringDecoder("utf8");

  return new Transform({
    transform(chunk, _encoding, callback) {
      // 保留未完成的 SSE 帧，直到收到下一块数据或 flush。
      buffer += typeof chunk === "string" ? decoder.end() + chunk : decoder.write(chunk);
      const split = splitBoundedSSEFrames(buffer);
      if (!split) {
        callback(new Error("SSE frame exceeds the allowed size."));
        return;
      }
      buffer = split.remainder;

      for (const part of split.frames) {
        this.push(convertResponsesSSEToChatCompletionsSSE(`${part}\n\n`));
      }

      callback();
    },
    flush(callback) {
      buffer += decoder.end();
      if (Buffer.byteLength(buffer, "utf8") > MAX_SSE_FRAME_BYTES) {
        callback(new Error("SSE frame exceeds the allowed size."));
        return;
      }
      if (buffer.trim()) {
        this.push(convertResponsesSSEToChatCompletionsSSE(buffer));
      }
      callback();
    },
  });
}
