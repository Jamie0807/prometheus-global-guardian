import type { Application, Request } from 'express';
import fetch from 'node-fetch';
import { buildAIProviderRequest, resolveServerAIProviderConfig } from './ai-provider.js';
import {
  createResponsesToChatCompletionsStream,
  createWorkflowToChatCompletionsStream,
  extractWorkflowResult,
  workflowResultToChatCompletionsSSE,
} from './ai-stream.js';

const parseJsonBody = (req: Request): Record<string, unknown> => {
  if (!req.rawBody || req.rawBody.length === 0) {
    return {};
  }
  return JSON.parse(req.rawBody.toString('utf8'));
};

export function registerAIChatRoute(app: Application): void {
  app.post('/api/ai/chat', async (req, res) => {
    const config = resolveServerAIProviderConfig();

    if (!config.configured) {
      res.status(503).json({
        success: false,
        code: config.reason === 'missing_model' ? 'AI_MODEL_MISSING' : 'AI_PROVIDER_NOT_CONFIGURED',
        message:
          config.reason === 'missing_model'
            ? 'AI provider model is not configured.'
            : 'AI provider is not configured.',
      });
      return;
    }

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

    const providerRequest = buildAIProviderRequest({
      config,
      messages: body.messages,
      disasterContext:
        body.disasterContext && typeof body.disasterContext === 'object'
          ? body.disasterContext as Record<string, unknown>
          : undefined,
      location: body.location,
      language: body.language,
    });

    const hasUserInput =
      providerRequest.protocol === 'responses'
        ? providerRequest.payload.input.length > 0
        : providerRequest.protocol === 'workflow'
          ? providerRequest.payload.inputs.user_input.trim().length > 0
        : providerRequest.payload.messages.length > 1;

    if (!hasUserInput) {
      res.status(400).json({
        success: false,
        code: 'AI_MESSAGE_REQUIRED',
        message: 'At least one user or assistant message is required.',
      });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, config.requestTimeoutMs);

    res.on('close', () => {
      if (!res.writableEnded) {
        controller.abort();
      }
    });

    try {
      const upstream = await fetch(providerRequest.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify(providerRequest.payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!upstream.ok) {
        await upstream.text();
        res.status(502).json({
          success: false,
          code: 'AI_PROVIDER_ERROR',
          message: 'AI provider request failed.',
          upstreamStatus: upstream.status,
        });
        return;
      }

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

          res.status(200);
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders?.();

          upstream.body.on('error', () => {
            if (!res.writableEnded) {
              res.end();
            }
          });

          upstream.body
            .pipe(createWorkflowToChatCompletionsStream())
            .pipe(res);
          return;
        }

        let workflowResponse;
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

        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.end(workflowResultToChatCompletionsSSE(workflowResult));
        return;
      }

      res.status(200);
      res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      if (!upstream.body) {
        res.end();
        return;
      }

      upstream.body.on('error', () => {
        if (!res.writableEnded) {
          res.end();
        }
      });

      if (providerRequest.protocol === 'responses') {
        upstream.body
          .pipe(createResponsesToChatCompletionsStream())
          .pipe(res);
      } else {
        upstream.body.pipe(res);
      }
    } catch (err: unknown) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        if (!res.headersSent) {
          res.status(504).json({
            success: false,
            code: 'AI_PROVIDER_TIMEOUT',
            message: 'AI provider request timed out.',
          });
        }
        return;
      }

      res.status(502).json({
        success: false,
        code: 'AI_PROVIDER_NETWORK_ERROR',
        message: 'AI provider network request failed.',
      });
    }
  });
}
