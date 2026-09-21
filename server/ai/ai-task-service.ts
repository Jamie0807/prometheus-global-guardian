import type { UpstreamFetch } from "../security/request-boundaries.js";
import { fetchWithTimeout } from "../security/request-boundaries.js";
import {
  buildAIProviderRequest,
  resolveAIProviderMode,
  resolveServerAIProviderConfig,
} from "./ai-provider.js";
import { extractWorkflowResult } from "./ai-stream.js";

const MAX_TASK_INPUT_CHARACTERS = 24_000;
const MAX_TASK_OUTPUT_CHARACTERS = 16_000;

export class AITaskError extends Error {
  constructor(readonly code: "NOT_CONFIGURED" | "UPSTREAM_FAILED" | "INVALID_RESPONSE") {
    super(code);
    this.name = "AITaskError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromResponse(
  value: unknown,
  protocol: "workflow" | "responses" | "chat_completions",
): string {
  if (protocol === "workflow") return extractWorkflowResult(value);
  if (!isRecord(value)) return "";
  if (protocol === "responses") {
    if (typeof value.output_text === "string") return value.output_text;
    if (!Array.isArray(value.output)) return "";
    return value.output
      .flatMap((item): string[] => {
        if (!isRecord(item) || !Array.isArray(item.content)) return [];
        return item.content.flatMap((part): string[] =>
          isRecord(part) && typeof part.text === "string" ? [part.text] : [],
        );
      })
      .join("");
  }
  const choices = value.choices;
  const choice = Array.isArray(choices) ? choices[0] : undefined;
  if (!isRecord(choice) || !isRecord(choice.message)) return "";
  const content = choice.message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .flatMap((part): string[] =>
        isRecord(part) && typeof part.text === "string" ? [part.text] : [],
      )
      .join("");
  }
  return "";
}

export async function generateAITextTask(
  instructions: string,
  input: string,
  fetchImpl: UpstreamFetch,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  if (input.length > MAX_TASK_INPUT_CHARACTERS) throw new AITaskError("INVALID_RESPONSE");
  const mode = resolveAIProviderMode(env);
  const provider = mode === "workflow" ? "workflow" : "volcengine";
  let config = resolveServerAIProviderConfig(env, provider);
  if (!config.configured && mode === "router") {
    const workflowConfig = resolveServerAIProviderConfig(env, "workflow");
    if (workflowConfig.configured) config = workflowConfig;
  }
  if (!config.configured) throw new AITaskError("NOT_CONFIGURED");

  const request = buildAIProviderRequest({
    config,
    messages: [{ role: "user", content: input }],
  });
  const sourcePayload = request.payload as unknown as Record<string, unknown>;
  const payload: Record<string, unknown> = { ...sourcePayload, stream: false };
  if (request.protocol === "workflow") {
    const workflowInputs = isRecord(sourcePayload.inputs) ? sourcePayload.inputs : {};
    payload.inputs = {
      ...workflowInputs,
      user_input: `${instructions}\n\n${input}`,
    };
  } else if (request.protocol === "responses") {
    payload.instructions = instructions;
    payload.input = [{ role: "user", content: input }];
    payload.max_output_tokens = 1_200;
  } else {
    payload.messages = [
      { role: "system", content: instructions },
      { role: "user", content: input },
    ];
    payload.max_tokens = 1_200;
    payload.temperature = 0.2;
  }

  try {
    const response = await fetchWithTimeout(
      fetchImpl,
      request.apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      },
      config.requestTimeoutMs,
    );
    if (!response.ok) throw new AITaskError("UPSTREAM_FAILED");
    const raw = await response.text();
    if (raw.length > MAX_TASK_OUTPUT_CHARACTERS * 2) throw new AITaskError("INVALID_RESPONSE");
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new AITaskError("INVALID_RESPONSE");
    }
    const content = textFromResponse(parsed, request.protocol).trim();
    if (!content || content.length > MAX_TASK_OUTPUT_CHARACTERS) {
      throw new AITaskError("INVALID_RESPONSE");
    }
    return content;
  } catch (error: unknown) {
    if (error instanceof AITaskError) throw error;
    throw new AITaskError("UPSTREAM_FAILED");
  }
}
