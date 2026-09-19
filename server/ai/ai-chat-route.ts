/** 注册 AI 聊天接口，并协调提供商选择、流式转发和错误响应。 */
import type { Application, Request, RequestHandler, Response } from "express";
import defaultFetch from "node-fetch";
import { createHash, randomUUID } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import type { UpstreamFetch } from "../security/request-boundaries.js";
import { isValidAIRequest } from "../security/ai-request.js";
import {
  buildAIProviderRequest,
  resolveAIProviderMode,
  resolveServerAIProviderConfig,
  type DisasterContext,
  type ProviderName,
  type ServerAIProviderConfig,
} from "./ai-provider.js";
import { routeAIRequest, type AIRouteDecision } from "./ai-router.js";
import {
  createResponsesToChatCompletionsStream,
  createWorkflowToChatCompletionsStream,
  extractWorkflowResult,
  workflowResultToChatCompletionsSSE,
} from "./ai-stream.js";
import {
  createAIStreamSessionRegistry,
  type AIStreamEvent,
  type AIStreamSession,
} from "./ai-stream-session.js";
import { createServerLogger } from "../logging.js";

interface ProviderFailure {
  provider: ProviderName;
  code: "missing_config" | "timeout" | "network" | "upstream";
  status?: number;
}

export interface AIChatRouteOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: UpstreamFetch;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const DEFAULT_RESUME_TTL_MS = 30_000;
const DEFAULT_RESUME_MAX_EVENTS = 256;
const DEFAULT_RESUME_MAX_BYTES = 512 * 1024;
const DEFAULT_RESUME_MAX_SESSIONS = 100;
const MAX_SSE_FRAME_BYTES = 64 * 1024;

function readBoundedPositiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  maximum: number,
): number {
  const value = Number(env[key]);
  if (!Number.isSafeInteger(value) || value <= 0) return fallback;
  return Math.min(value, maximum);
}

function readRequestId(req: Request): { requestId: string; generated: boolean } | undefined {
  const header = req.header("x-ai-request-id");
  if (header === undefined) return { requestId: randomUUID(), generated: true };
  if (!REQUEST_ID_PATTERN.test(header)) return undefined;
  return { requestId: header, generated: false };
}

function readLastEventId(req: Request): number | undefined | null {
  const header = req.header("last-event-id");
  if (header === undefined || header.trim() === "") return undefined;
  if (!/^\d+$/.test(header)) return null;
  const parsed = Number(header);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function destroyStream(stream: unknown): void {
  if (!stream || typeof stream !== "object") return;
  const destroy = (stream as { destroy?: unknown }).destroy;
  if (typeof destroy === "function") destroy.call(stream);
}

function requestFingerprint(req: Request, body: Record<string, unknown>): string {
  return createHash("sha256")
    .update(req.rawBody ?? Buffer.from(JSON.stringify(body)))
    .digest("hex");
}

function isDoneEvent(payload: string): boolean {
  return /(?:^|\n)data:\s*\[DONE\]\s*(?:\n|$)/.test(payload);
}

function isErrorEvent(payload: string): boolean {
  return /(?:^|\n)event:\s*error\s*(?:\n|$)/.test(payload);
}

function safeStreamFailureEvent(): string {
  return `event: error\ndata: ${JSON.stringify({
    code: "AI_PROVIDER_STREAM_FAILED",
    message: "AI provider stream failed.",
  })}\n\n`;
}

function writeSessionEvent(res: Response, event: AIStreamEvent): void {
  if (res.writableEnded) return;
  res.write(`id: ${event.id}\n${event.payload}`);
}

function attachSessionResponse(
  res: Response,
  session: AIStreamSession,
  requestId: string,
  lastEventId: number,
): boolean {
  const subscriber = {
    onEvent: (event: AIStreamEvent) => writeSessionEvent(res, event),
    onEnd: () => {
      if (!res.writableEnded) res.end();
    },
  };
  const result = session.attach(lastEventId, subscriber);
  if (result.kind === "resume_unavailable") {
    if (!res.headersSent) {
      res.status(409).json({
        success: false,
        code: "AI_STREAM_RESUME_UNAVAILABLE",
        message: "AI stream resume data is no longer available.",
      });
    }
    return false;
  }
  if (result.kind === "session_disposed") {
    if (!res.headersSent) {
      res.status(410).json({
        success: false,
        code: "AI_STREAM_SESSION_EXPIRED",
        message: "AI stream session has expired.",
      });
    }
    return false;
  }

  setStreamHeaders(res, "text/event-stream; charset=utf-8", requestId);
  result.replay.forEach((event) => writeSessionEvent(res, event));
  if (result.terminal) {
    res.end();
    return true;
  }
  res.once("close", result.detach);
  return true;
}

function createSessionEventPump(session: AIStreamSession): {
  push: (chunk: string | Buffer) => boolean;
  flush: () => void;
  terminal: () => boolean;
} {
  let buffer = "";
  let isTerminal = false;
  const decoder = new StringDecoder("utf8");

  const publish = (event: string): void => {
    if (!event.trim() || isTerminal) return;
    const payload = `${event}\n\n`;
    if (isErrorEvent(payload)) {
      session.fail(payload);
      isTerminal = true;
      return;
    }
    session.publish(payload);
    if (isDoneEvent(payload)) {
      session.complete();
      isTerminal = true;
    }
  };

  const failForOversizedFrame = (): void => {
    buffer = "";
    session.fail(safeStreamFailureEvent());
    isTerminal = true;
  };

  return {
    push(chunk) {
      if (isTerminal) return true;
      buffer += typeof chunk === "string" ? decoder.end() + chunk : decoder.write(chunk);
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        if (Buffer.byteLength(part, "utf8") > MAX_SSE_FRAME_BYTES) {
          failForOversizedFrame();
          return false;
        }
        publish(part);
        if (isTerminal) return true;
      }
      if (Buffer.byteLength(buffer, "utf8") > MAX_SSE_FRAME_BYTES) {
        failForOversizedFrame();
        return false;
      }
      return true;
    },
    flush() {
      buffer += decoder.end();
      if (Buffer.byteLength(buffer, "utf8") > MAX_SSE_FRAME_BYTES) {
        failForOversizedFrame();
        return;
      }
      if (buffer.trim()) publish(buffer);
      buffer = "";
    },
    terminal: () => isTerminal,
  };
}

const parseJsonBody = (req: Request): Record<string, unknown> => {
  if (!req.rawBody || req.rawBody.length === 0) {
    return {};
  }
  return JSON.parse(req.rawBody.toString("utf8"));
};

const getDisasterContext = (body: Record<string, unknown>): DisasterContext | undefined =>
  body.disasterContext && typeof body.disasterContext === "object"
    ? (body.disasterContext as DisasterContext)
    : undefined;

function forcedRouteDecision(provider: ProviderName): AIRouteDecision {
  return {
    target: provider,
    reason: "general",
    matchedSignals: [],
  };
}

export function buildProviderOrder(
  mode: ReturnType<typeof resolveAIProviderMode>,
  decision: AIRouteDecision,
): ProviderName[] {
  if (mode !== "router") {
    return [mode === "workflow" ? "workflow" : "volcengine"];
  }

  // 路由模式先尝试命中的提供商，再尝试另一提供商。
  return [decision.target, decision.target === "workflow" ? "volcengine" : "workflow"];
}

function configurationError(config: ServerAIProviderConfig): { code: string; message: string } {
  if (config.reason === "missing_model") {
    return {
      code: "AI_MODEL_MISSING",
      message: "AI provider model is not configured.",
    };
  }

  return {
    code: "AI_PROVIDER_NOT_CONFIGURED",
    message: "AI provider is not configured.",
  };
}

function setStreamHeaders(
  res: Response,
  contentType = "text/event-stream; charset=utf-8",
  requestId?: string,
): void {
  // 对流式响应禁用缓存和转换，并立即发送响应头以建立 SSE 连接。
  res.status(200);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (requestId) res.setHeader("X-AI-Request-Id", requestId);
  res.flushHeaders?.();
}

function logRouteResult({
  mode,
  decision,
  provider,
  fallbackUsed,
  attempts,
  status,
  startedAt,
}: {
  mode: ReturnType<typeof resolveAIProviderMode>;
  decision: AIRouteDecision;
  provider: ProviderName;
  fallbackUsed: boolean;
  attempts: number;
  status: number;
  startedAt: number;
}): void {
  const logger = createServerLogger("ai_router");
  const context = {
    mode,
    route: decision.target,
    reason: decision.reason,
    provider,
    fallbackUsed,
    attempts,
    status,
    success: status >= 200 && status < 300,
    durationMs: Date.now() - startedAt,
  };
  if (status >= 500) {
    logger.error("ai_request_finished", context);
  } else if (status >= 400) {
    logger.warn("ai_request_finished", context);
  } else {
    logger.info("ai_request_finished", context);
  }
}

export function registerAIChatRoute(
  app: Application,
  middlewares: RequestHandler[] = [],
  options: AIChatRouteOptions = {},
): void {
  const serverEnv = options.env ?? process.env;
  const upstreamFetch = options.fetchImpl ?? (defaultFetch as unknown as UpstreamFetch);
  const streamSessions = createAIStreamSessionRegistry({
    ttlMs: readBoundedPositiveInteger(
      serverEnv,
      "BFF_AI_STREAM_RESUME_TTL_MS",
      DEFAULT_RESUME_TTL_MS,
      120_000,
    ),
    maxEvents: readBoundedPositiveInteger(
      serverEnv,
      "BFF_AI_STREAM_RESUME_MAX_EVENTS",
      DEFAULT_RESUME_MAX_EVENTS,
      2_048,
    ),
    maxBytes: readBoundedPositiveInteger(
      serverEnv,
      "BFF_AI_STREAM_RESUME_MAX_BYTES",
      DEFAULT_RESUME_MAX_BYTES,
      4 * 1024 * 1024,
    ),
    maxSessions: readBoundedPositiveInteger(
      serverEnv,
      "BFF_AI_STREAM_RESUME_MAX_SESSIONS",
      DEFAULT_RESUME_MAX_SESSIONS,
      1_000,
    ),
  });

  app.post("/api/ai/chat", ...middlewares, async (req, res) => {
    const startedAt = Date.now();
    const mode = resolveAIProviderMode(serverEnv);
    let decision =
      mode === "router"
        ? routeAIRequest(undefined)
        : forcedRouteDecision(mode === "workflow" ? "workflow" : "volcengine");
    let logged = false;
    let selectedProvider: ProviderName = decision.target;
    let attempts = 0;
    let fallbackUsed = false;

    const logOnce = (status: number): void => {
      if (logged) return;
      logged = true;
      logRouteResult({
        mode,
        decision,
        provider: selectedProvider,
        fallbackUsed,
        attempts,
        status,
        startedAt,
      });
    };

    res.once("finish", () => logOnce(res.statusCode));
    res.once("close", () => {
      if (!res.writableFinished) logOnce(res.statusCode || 499);
    });

    let body: Record<string, unknown>;
    try {
      body = parseJsonBody(req);
    } catch {
      res.status(400).json({
        success: false,
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
      });
      return;
    }

    if (!isValidAIRequest(body)) {
      res.status(400).json({
        success: false,
        code: "INVALID_AI_REQUEST",
        message: "Request body exceeds the allowed limits.",
      });
      return;
    }

    const requestInfo = readRequestId(req);
    const lastEventId = readLastEventId(req);
    if (!requestInfo || lastEventId === null) {
      res.status(400).json({
        success: false,
        code: "INVALID_AI_STREAM_SESSION",
        message: "AI stream session headers are invalid.",
      });
      return;
    }

    const requestId = requestInfo.requestId;
    const fingerprint = requestFingerprint(req, body);
    const existing = streamSessions.get(requestId, fingerprint);
    if (existing.kind === "fingerprint_mismatch") {
      res.status(409).json({
        success: false,
        code: "AI_STREAM_SESSION_CONFLICT",
        message: "AI stream session does not match this request.",
      });
      return;
    }
    if (existing.kind === "missing" && lastEventId !== undefined) {
      res.status(410).json({
        success: false,
        code: "AI_STREAM_SESSION_EXPIRED",
        message: "AI stream session has expired.",
      });
      return;
    }
    if (existing.kind === "found") {
      if (lastEventId === undefined) {
        res.status(409).json({
          success: false,
          code: "AI_STREAM_SESSION_CONFLICT",
          message: "AI stream session is already active.",
        });
        return;
      }
      attachSessionResponse(res, existing.session, requestId, lastEventId);
      return;
    }

    let selectedController: AbortController | undefined;
    let sessionDisposed = false;
    const session = streamSessions.create(requestId, fingerprint, () => {
      sessionDisposed = true;
      selectedController?.abort();
    });

    const disasterContext = getDisasterContext(body);
    if (mode === "router") {
      decision = routeAIRequest(body.messages, disasterContext);
    }

    const providers = buildProviderOrder(mode, decision);
    const failures: ProviderFailure[] = [];
    let selectedConfig: ServerAIProviderConfig | undefined;
    let providerRequest: ReturnType<typeof buildAIProviderRequest> | undefined;
    let upstream: Awaited<ReturnType<UpstreamFetch>> | undefined;
    let selectedCleanup: (() => void) | undefined;
    let selectedClientCloseAbort: (() => void) | undefined;

    for (const provider of providers) {
      const config = resolveServerAIProviderConfig(serverEnv, provider);
      selectedProvider = provider;

      if (!config.configured) {
        failures.push({ provider, code: "missing_config" });
        continue;
      }

      const request = buildAIProviderRequest({
        config,
        messages: body.messages,
        disasterContext,
        location: body.location,
        language: body.language,
      });

      const hasUserInput =
        request.protocol === "responses"
          ? request.payload.input.some(
              (message) => message.role === "user" && message.content.trim().length > 0,
            )
          : request.protocol === "workflow"
            ? request.payload.inputs.user_input.trim().length > 0
            : request.payload.messages.some(
                (message) => message.role === "user" && message.content.trim().length > 0,
              );

      if (!hasUserInput) {
        session.dispose();
        res.status(400).json({
          success: false,
          code: "AI_MESSAGE_REQUIRED",
          message: "At least one user message is required.",
        });
        return;
      }

      attempts += 1;
      const controller = new AbortController();
      // 请求超时或浏览器断开时停止对应提供商请求。
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, config.requestTimeoutMs);
      let clientClosed = false;
      const abortOnClose = (): void => {
        clientClosed = true;
        controller.abort();
      };
      const cleanupAttempt = (): void => {
        clearTimeout(timeout);
        res.off("close", abortOnClose);
      };
      selectedController = controller;
      res.once("close", abortOnClose);

      try {
        const response = await upstreamFetch(request.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify(request.payload),
          signal: controller.signal,
        });

        if (clientClosed || sessionDisposed) {
          cleanupAttempt();
          selectedController = undefined;
          destroyStream(response.body);
          if (clientClosed) session.dispose();
          if (sessionDisposed && !clientClosed && !res.headersSent) {
            res.status(410).json({
              success: false,
              code: "AI_STREAM_SESSION_EXPIRED",
              message: "AI stream session has expired.",
            });
          }
          return;
        }

        if (timedOut) {
          cleanupAttempt();
          selectedController = undefined;
          destroyStream(response.body);
          failures.push({ provider, code: "timeout" });
          if (providers.length > 1) fallbackUsed = true;
          continue;
        }

        if (!response.ok) {
          await response.text();
          if (clientClosed || sessionDisposed) {
            cleanupAttempt();
            selectedController = undefined;
            if (clientClosed) session.dispose();
            if (sessionDisposed && !clientClosed && !res.headersSent) {
              res.status(410).json({
                success: false,
                code: "AI_STREAM_SESSION_EXPIRED",
                message: "AI stream session has expired.",
              });
            }
            return;
          }
          if (timedOut) {
            cleanupAttempt();
            selectedController = undefined;
            failures.push({ provider, code: "timeout" });
            if (providers.length > 1) fallbackUsed = true;
            continue;
          }
          failures.push({ provider, code: "upstream", status: response.status });
          cleanupAttempt();
          selectedController = undefined;
          if (providers.length > 1) fallbackUsed = true;
          continue;
        }

        selectedConfig = config;
        providerRequest = request;
        upstream = response;
        selectedCleanup = cleanupAttempt;
        selectedClientCloseAbort = abortOnClose;
        break;
      } catch (err: unknown) {
        cleanupAttempt();

        if (clientClosed) {
          session.dispose();
          selectedController = undefined;
          return;
        }

        if (sessionDisposed) {
          selectedController = undefined;
          if (!res.headersSent) {
            res.status(410).json({
              success: false,
              code: "AI_STREAM_SESSION_EXPIRED",
              message: "AI stream session has expired.",
            });
          }
          return;
        }

        selectedController = undefined;
        const isTimeout = timedOut || (err instanceof Error && err.name === "AbortError");
        failures.push({ provider, code: isTimeout ? "timeout" : "network" });
        if (providers.length > 1) fallbackUsed = true;
      }
    }

    if (!upstream || !selectedConfig || !providerRequest || !selectedController) {
      session.dispose();
      // 所有候选提供商都不可用时，按最终失败类型向客户端返回配置、超时或上游错误。
      const primaryConfig = resolveServerAIProviderConfig(serverEnv, providers[0]);
      const allMissing =
        failures.length > 0 && failures.every((failure) => failure.code === "missing_config");

      if (allMissing) {
        const error = configurationError(primaryConfig);
        res.status(503).json({ success: false, ...error });
        return;
      }

      const lastFailure = failures.at(-1);
      const status = lastFailure?.code === "timeout" ? 504 : 502;
      const code = lastFailure?.code === "timeout" ? "AI_PROVIDER_TIMEOUT" : "AI_PROVIDER_ERROR";
      const message =
        lastFailure?.code === "timeout"
          ? "AI provider request timed out."
          : "AI provider request failed.";
      res.status(status).json({
        success: false,
        code,
        message,
        ...(lastFailure?.status ? { upstreamStatus: lastFailure.status } : {}),
      });
      return;
    }

    const finishSelectedRequest = (): void => {
      selectedCleanup?.();
      selectedCleanup = undefined;
      selectedClientCloseAbort = undefined;
      selectedController = undefined;
    };

    const attachNewSessionResponse = (lastEventId: number): boolean => {
      const attached = attachSessionResponse(res, session, requestId, lastEventId);
      if (attached && selectedClientCloseAbort) {
        // 响应已交给会话订阅者；浏览器断开只移除订阅，不再中止可恢复的上游流。
        res.off("close", selectedClientCloseAbort);
        selectedClientCloseAbort = undefined;
      }
      return attached;
    };

    const stopUpstream = (): void => {
      selectedController?.abort();
      destroyStream(upstream?.body);
      finishSelectedRequest();
    };

    const finishSessionStream = (
      pump: ReturnType<typeof createSessionEventPump>,
      finalized: { value: boolean },
    ): void => {
      if (finalized.value) return;
      finalized.value = true;
      pump.flush();
      if (!pump.terminal() && session.status === "active") {
        session.fail(safeStreamFailureEvent());
      }
      finishSelectedRequest();
    };

    if (providerRequest.protocol === "workflow") {
      const contentType = upstream.headers.get("content-type") ?? "";
      if (contentType.includes("text/event-stream")) {
        if (!upstream.body) {
          session.dispose();
          finishSelectedRequest();
          res.status(502).json({
            success: false,
            code: "AI_WORKFLOW_STREAM_MISSING",
            message: "AI workflow returned an empty stream.",
          });
          return;
        }

        if (!attachNewSessionResponse(0)) {
          session.dispose();
          return;
        }
        const pump = createSessionEventPump(session);
        const finalized = { value: false };
        const transformed = createWorkflowToChatCompletionsStream();
        transformed.on("data", (chunk: Buffer | string) => {
          if (pump.push(chunk)) return;
          finalized.value = true;
          stopUpstream();
          transformed.destroy();
        });
        transformed.on("error", () => {
          if (finalized.value) return;
          stopUpstream();
          finishSessionStream(pump, finalized);
        });
        transformed.on("end", () => finishSessionStream(pump, finalized));
        upstream.body.on("error", () => {
          if (finalized.value) return;
          stopUpstream();
          transformed.destroy();
          finishSessionStream(pump, finalized);
        });
        upstream.body.pipe(transformed);
        return;
      }

      let workflowResponse: unknown;
      try {
        workflowResponse = await upstream.json();
      } catch {
        if (sessionDisposed) {
          finishSelectedRequest();
          if (!res.headersSent) {
            res.status(410).json({
              success: false,
              code: "AI_STREAM_SESSION_EXPIRED",
              message: "AI stream session has expired.",
            });
          }
          return;
        }
        session.dispose();
        finishSelectedRequest();
        res.status(502).json({
          success: false,
          code: "AI_WORKFLOW_INVALID_RESPONSE",
          message: "AI workflow returned an invalid response.",
        });
        return;
      }

      const workflowResult = extractWorkflowResult(workflowResponse);
      if (!workflowResult) {
        session.dispose();
        finishSelectedRequest();
        res.status(502).json({
          success: false,
          code: "AI_WORKFLOW_RESULT_MISSING",
          message: "AI workflow response did not include outputs.result.",
        });
        return;
      }

      if (!attachNewSessionResponse(0)) {
        session.dispose();
        finishSelectedRequest();
        return;
      }
      session.publish(workflowResultToChatCompletionsSSE(workflowResult));
      session.complete();
      finishSelectedRequest();
      return;
    }

    if (!upstream.body) {
      session.fail(safeStreamFailureEvent());
      finishSelectedRequest();
      return;
    }

    if (!attachNewSessionResponse(0)) {
      session.dispose();
      return;
    }
    const pump = createSessionEventPump(session);
    const finalized = { value: false };
    const transformed =
      providerRequest.protocol === "responses"
        ? createResponsesToChatCompletionsStream()
        : undefined;
    const source = transformed ? upstream.body.pipe(transformed) : upstream.body;
    source.on("data", (chunk: Buffer | string) => {
      if (pump.push(chunk)) return;
      finalized.value = true;
      stopUpstream();
      transformed?.destroy();
    });
    source.on("error", () => {
      if (finalized.value) return;
      stopUpstream();
      transformed?.destroy();
      finishSessionStream(pump, finalized);
    });
    source.on("end", () => finishSessionStream(pump, finalized));
    if (transformed) {
      upstream.body.on("error", () => {
        if (finalized.value) return;
        stopUpstream();
        transformed.destroy();
        finishSessionStream(pump, finalized);
      });
    }

    if (providerRequest.protocol === "responses") return;
  });
}
