import type { Application, Request, Response } from 'express';
import fetch from 'node-fetch';
import { buildAIProviderRequest, resolveAIProviderMode, resolveServerAIProviderConfig, type DisasterContext, type ProviderName, type ServerAIProviderConfig } from './ai-provider.js';
import { routeAIRequest, type AIRouteDecision } from './ai-router.js';
import {
  createResponsesToChatCompletionsStream,
  createWorkflowToChatCompletionsStream,
  extractWorkflowResult,
  workflowResultToChatCompletionsSSE,
} from './ai-stream.js';

interface ProviderFailure {
  provider: ProviderName;
  code: 'missing_config' | 'timeout' | 'network' | 'upstream';
  status?: number;
}

const parseJsonBody = (req: Request): Record<string, unknown> => {
  if (!req.rawBody || req.rawBody.length === 0) {
    return {};
  }
  return JSON.parse(req.rawBody.toString('utf8'));
};

const getDisasterContext = (body: Record<string, unknown>): DisasterContext | undefined => (
  body.disasterContext && typeof body.disasterContext === 'object'
    ? body.disasterContext as DisasterContext
    : undefined
);

function forcedRouteDecision(provider: ProviderName): AIRouteDecision {
  return {
    target: provider,
    reason: 'general',
    matchedSignals: [],
  };
}

export function buildProviderOrder(mode: ReturnType<typeof resolveAIProviderMode>, decision: AIRouteDecision): ProviderName[] {
  if (mode !== 'router') {
    return [mode === 'workflow' ? 'workflow' : 'volcengine'];
  }

  return [decision.target, decision.target === 'workflow' ? 'volcengine' : 'workflow'];
}

function configurationError(config: ServerAIProviderConfig): { code: string; message: string } {
  if (config.reason === 'missing_model') {
    return {
      code: 'AI_MODEL_MISSING',
      message: 'AI provider model is not configured.',
    };
  }

  return {
    code: 'AI_PROVIDER_NOT_CONFIGURED',
    message: 'AI provider is not configured.',
  };
}

function setStreamHeaders(res: Response, contentType = 'text/event-stream; charset=utf-8'): void {
  res.status(200);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
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
  console.info('[AI Router]', JSON.stringify({
    mode,
    route: decision.target,
    reason: decision.reason,
    provider,
    fallbackUsed,
    attempts,
    status,
    success: status >= 200 && status < 300,
    durationMs: Date.now() - startedAt,
  }));
}

export function registerAIChatRoute(app: Application): void {
  app.post('/api/ai/chat', async (req, res) => {
    const startedAt = Date.now();
    const mode = resolveAIProviderMode();
    let decision = mode === 'router'
      ? routeAIRequest(undefined)
      : forcedRouteDecision(mode === 'workflow' ? 'workflow' : 'volcengine');
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

    res.once('finish', () => logOnce(res.statusCode));
    res.once('close', () => {
      if (!res.writableFinished) logOnce(res.statusCode || 499);
    });

    let body: Record<string, unknown>;
    try {
      body = parseJsonBody(req);
    } catch {
      res.status(400).json({
        success: false,
        code: 'INVALID_JSON',
        message: 'Request body must be valid JSON.',
      });
      return;
    }

    const disasterContext = getDisasterContext(body);
    if (mode === 'router') {
      decision = routeAIRequest(body.messages, disasterContext);
    }

    const providers = buildProviderOrder(mode, decision);
    const failures: ProviderFailure[] = [];
    let selectedConfig: ServerAIProviderConfig | undefined;
    let providerRequest: ReturnType<typeof buildAIProviderRequest> | undefined;
    let upstream: Awaited<ReturnType<typeof fetch>> | undefined;
    let selectedController: AbortController | undefined;

    for (const provider of providers) {
      const config = resolveServerAIProviderConfig(process.env, provider);
      selectedProvider = provider;

      if (!config.configured) {
        failures.push({ provider, code: 'missing_config' });
        continue;
      }

      const request = buildAIProviderRequest({
        config,
        messages: body.messages,
        disasterContext,
        location: body.location,
        language: body.language,
      });

      const hasUserInput = request.protocol === 'responses'
        ? request.payload.input.some(message => message.role === 'user' && message.content.trim().length > 0)
        : request.protocol === 'workflow'
          ? request.payload.inputs.user_input.trim().length > 0
          : request.payload.messages.some(message => message.role === 'user' && message.content.trim().length > 0);

      if (!hasUserInput) {
        res.status(400).json({
          success: false,
          code: 'AI_MESSAGE_REQUIRED',
          message: 'At least one user message is required.',
        });
        return;
      }

      attempts += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      let clientClosed = false;
      const abortOnClose = (): void => {
        clientClosed = true;
        controller.abort();
      };
      res.once('close', abortOnClose);

      try {
        const response = await fetch(request.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify(request.payload),
          signal: controller.signal,
        });

        if (!response.ok) {
          await response.text();
          failures.push({ provider, code: 'upstream', status: response.status });
          clearTimeout(timeout);
          res.off('close', abortOnClose);
          if (providers.length > 1) fallbackUsed = true;
          continue;
        }

        clearTimeout(timeout);
        selectedConfig = config;
        providerRequest = request;
        upstream = response;
        selectedController = controller;
        break;
      } catch (err: unknown) {
        clearTimeout(timeout);
        res.off('close', abortOnClose);

        if (clientClosed) return;

        const isTimeout = err instanceof Error && err.name === 'AbortError';
        failures.push({ provider, code: isTimeout ? 'timeout' : 'network' });
        if (providers.length > 1) fallbackUsed = true;
      }
    }

    if (!upstream || !selectedConfig || !providerRequest || !selectedController) {
      const primaryConfig = resolveServerAIProviderConfig(process.env, providers[0]);
      const allMissing = failures.length > 0 && failures.every(failure => failure.code === 'missing_config');

      if (allMissing) {
        const error = configurationError(primaryConfig);
        res.status(503).json({ success: false, ...error });
        return;
      }

      const lastFailure = failures.at(-1);
      const status = lastFailure?.code === 'timeout' ? 504 : 502;
      const code = lastFailure?.code === 'timeout' ? 'AI_PROVIDER_TIMEOUT' : 'AI_PROVIDER_ERROR';
      const message = lastFailure?.code === 'timeout'
        ? 'AI provider request timed out.'
        : 'AI provider request failed.';
      res.status(status).json({
        success: false,
        code,
        message,
        ...(lastFailure?.status ? { upstreamStatus: lastFailure.status } : {}),
      });
      return;
    }

    res.once('close', () => selectedController?.abort());

    if (providerRequest.protocol === 'workflow') {
      const contentType = upstream.headers.get('content-type') ?? '';
      if (contentType.includes('text/event-stream')) {
        if (!upstream.body) {
          res.status(502).json({
            success: false,
            code: 'AI_WORKFLOW_STREAM_MISSING',
            message: 'AI workflow returned an empty stream.',
          });
          return;
        }

        setStreamHeaders(res);
        upstream.body.on('error', () => {
          if (!res.writableEnded) res.end();
        });
        upstream.body.pipe(createWorkflowToChatCompletionsStream()).pipe(res);
        return;
      }

      let workflowResponse: unknown;
      try {
        workflowResponse = await upstream.json();
      } catch {
        res.status(502).json({
          success: false,
          code: 'AI_WORKFLOW_INVALID_RESPONSE',
          message: 'AI workflow returned an invalid response.',
        });
        return;
      }

      const workflowResult = extractWorkflowResult(workflowResponse);
      if (!workflowResult) {
        res.status(502).json({
          success: false,
          code: 'AI_WORKFLOW_RESULT_MISSING',
          message: 'AI workflow response did not include outputs.result.',
        });
        return;
      }

      setStreamHeaders(res);
      res.end(workflowResultToChatCompletionsSSE(workflowResult));
      return;
    }

    setStreamHeaders(res, upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8');
    if (!upstream.body) {
      res.end();
      return;
    }

    upstream.body.on('error', () => {
      if (!res.writableEnded) res.end();
    });

    if (providerRequest.protocol === 'responses') {
      upstream.body.pipe(createResponsesToChatCompletionsStream()).pipe(res);
    } else {
      upstream.body.pipe(res);
    }
  });
}
