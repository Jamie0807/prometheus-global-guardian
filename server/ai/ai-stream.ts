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
  if (!workflowResponse || typeof workflowResponse !== "object") return "";
  const response = workflowResponse as Record<string, unknown>;
  const data =
    response.data && typeof response.data === "object"
      ? (response.data as Record<string, unknown>)
      : undefined;
  const outputs =
    data?.outputs && typeof data.outputs === "object"
      ? (data.outputs as Record<string, unknown>)
      : response.outputs && typeof response.outputs === "object"
        ? (response.outputs as Record<string, unknown>)
        : undefined;
  const result = outputs?.result;
  return typeof result === "string" && result.trim().length > 0 ? result : "";
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
