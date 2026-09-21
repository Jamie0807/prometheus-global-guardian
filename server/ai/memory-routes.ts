import { Router, type Request, type Response } from "express";
import defaultFetch from "node-fetch";
import type { UpstreamFetch } from "../security/request-boundaries.js";
import * as memoryRepository from "./memory-repository.js";
import * as conversationRepository from "./conversation-repository.js";
import { generateMemorySuggestions } from "./memory-generation.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEMORY_CONTENT_LIMIT = 2_000;

interface MemoryRouteOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: UpstreamFetch;
}

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBody(request: Request): RecordValue | undefined {
  if (!request.rawBody?.length) return undefined;
  try {
    const value: unknown = JSON.parse(request.rawBody.toString("utf8"));
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function validParam(request: Request, name: string): string | undefined {
  const value = request.params[name];
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : undefined;
}

function boundedText(value: unknown, limit: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length > 0 && text.length <= limit ? text : undefined;
}

function sendInvalidRequest(response: Response): void {
  response.status(400).json({ code: "INVALID_REQUEST", message: "Request data is invalid." });
}

function sendUnauthorized(response: Response): void {
  response.status(401).json({ code: "AUTH_REQUIRED", message: "Sign in to continue." });
}

export function createMemoryRouter(options: MemoryRouteOptions = {}): Router {
  const router = Router();
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? (defaultFetch as unknown as UpstreamFetch);

  router.get("/memories", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    try {
      const result = await memoryRepository.listForUser(request.user.userId);
      if (!result) {
        sendUnauthorized(response);
        return;
      }
      response.status(200).json(result);
    } catch {
      response
        .status(503)
        .json({ code: "MEMORIES_UNAVAILABLE", message: "Could not load memories." });
    }
  });

  router.post("/memories", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const body = parseBody(request);
    const content = boundedText(body?.content, MEMORY_CONTENT_LIMIT);
    const sourceConversationId = body?.sourceConversationId;
    if (
      !content ||
      (sourceConversationId !== undefined &&
        (typeof sourceConversationId !== "string" || !UUID_PATTERN.test(sourceConversationId)))
    ) {
      sendInvalidRequest(response);
      return;
    }
    try {
      const memory = await memoryRepository.createForUser(
        request.user.userId,
        content,
        typeof sourceConversationId === "string" ? sourceConversationId : undefined,
      );
      if (!memory) {
        response
          .status(404)
          .json({ code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." });
        return;
      }
      response.status(201).json({ memory });
    } catch {
      response
        .status(503)
        .json({ code: "MEMORIES_UNAVAILABLE", message: "Could not create a memory." });
    }
  });

  router.patch("/memories/:memoryId", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const memoryId = validParam(request, "memoryId");
    const body = parseBody(request);
    if (!memoryId || !body) {
      response.status(memoryId ? 400 : 404).json({
        code: memoryId ? "INVALID_REQUEST" : "MEMORY_NOT_FOUND",
        message: memoryId ? "Request data is invalid." : "Memory was not found.",
      });
      return;
    }
    const keys = Object.keys(body);
    const patch: memoryRepository.MemoryPatch = {};
    if (Object.hasOwn(body, "content")) {
      const content = boundedText(body.content, MEMORY_CONTENT_LIMIT);
      if (!content) {
        sendInvalidRequest(response);
        return;
      }
      patch.content = content;
    }
    if (Object.hasOwn(body, "enabled")) {
      if (typeof body.enabled !== "boolean") {
        sendInvalidRequest(response);
        return;
      }
      patch.enabled = body.enabled;
    }
    if (keys.length === 0 || keys.some((key) => key !== "content" && key !== "enabled")) {
      sendInvalidRequest(response);
      return;
    }
    try {
      const memory = await memoryRepository.updateForUser(request.user.userId, memoryId, patch);
      if (!memory) {
        response.status(404).json({ code: "MEMORY_NOT_FOUND", message: "Memory was not found." });
        return;
      }
      response.status(200).json({ memory });
    } catch {
      response
        .status(503)
        .json({ code: "MEMORIES_UNAVAILABLE", message: "Could not update the memory." });
    }
  });

  router.delete("/memories", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    try {
      const deleted = await memoryRepository.deleteAllForUser(request.user.userId);
      response.status(200).json({ deleted });
    } catch {
      response
        .status(503)
        .json({ code: "MEMORIES_UNAVAILABLE", message: "Could not clear memories." });
    }
  });

  router.delete("/memories/:memoryId", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const memoryId = validParam(request, "memoryId");
    if (!memoryId) {
      response.status(404).json({ code: "MEMORY_NOT_FOUND", message: "Memory was not found." });
      return;
    }
    try {
      if (!(await memoryRepository.deleteForUser(request.user.userId, memoryId))) {
        response.status(404).json({ code: "MEMORY_NOT_FOUND", message: "Memory was not found." });
        return;
      }
      response.status(204).end();
    } catch {
      response
        .status(503)
        .json({ code: "MEMORIES_UNAVAILABLE", message: "Could not delete the memory." });
    }
  });

  router.post("/memory-suggestions", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const body = parseBody(request);
    const conversationId = body?.conversationId;
    if (
      typeof conversationId !== "string" ||
      !UUID_PATTERN.test(conversationId) ||
      Object.keys(body ?? {}).some((key) => key !== "conversationId")
    ) {
      sendInvalidRequest(response);
      return;
    }
    try {
      const conversation = await conversationRepository.getForUser(
        request.user.userId,
        conversationId,
      );
      if (!conversation) {
        response
          .status(404)
          .json({ code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." });
        return;
      }
      const suggestions = await generateMemorySuggestions(conversation, fetchImpl, env);
      if (suggestions.length === 0) {
        response.status(200).json({ suggestions: [] });
        return;
      }
      const created = await memoryRepository.createSuggestionsForUser(
        request.user.userId,
        conversationId,
        suggestions,
      );
      if (!created) {
        response
          .status(404)
          .json({ code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." });
        return;
      }
      response.status(201).json({ suggestions: created });
    } catch (error: unknown) {
      const code = isRecord(error) && typeof error.code === "string" ? error.code : "";
      response.status(503).json({
        code: "MEMORY_SUGGESTIONS_UNAVAILABLE",
        message:
          code === "NOT_CONFIGURED"
            ? "AI 分析服务未配置，无法生成记忆建议。"
            : "无法生成记忆建议，请稍后重试。",
      });
    }
  });

  router.get("/memory-suggestions", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    try {
      response
        .status(200)
        .json({ suggestions: await memoryRepository.listSuggestionsForUser(request.user.userId) });
    } catch {
      response
        .status(503)
        .json({ code: "MEMORY_SUGGESTIONS_UNAVAILABLE", message: "Could not load suggestions." });
    }
  });

  router.post("/memory-suggestions/:suggestionId/accept", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const suggestionId = validParam(request, "suggestionId");
    const body = parseBody(request);
    if (request.rawBody?.length && !body) {
      sendInvalidRequest(response);
      return;
    }
    const content =
      body && Object.hasOwn(body, "content")
        ? boundedText(body.content, MEMORY_CONTENT_LIMIT)
        : undefined;
    if (
      !suggestionId ||
      (body && Object.keys(body).some((key) => key !== "content")) ||
      (body && Object.hasOwn(body, "content") && !content)
    ) {
      response.status(suggestionId ? 400 : 404).json({
        code: suggestionId ? "INVALID_REQUEST" : "SUGGESTION_NOT_FOUND",
        message: suggestionId ? "Request data is invalid." : "Memory suggestion was not found.",
      });
      return;
    }
    try {
      const accepted = await memoryRepository.acceptSuggestionForUser(
        request.user.userId,
        suggestionId,
        content,
      );
      if (!accepted) {
        response
          .status(404)
          .json({ code: "SUGGESTION_NOT_FOUND", message: "Memory suggestion was not found." });
        return;
      }
      response.status(200).json(accepted);
    } catch {
      response.status(503).json({
        code: "MEMORY_SUGGESTIONS_UNAVAILABLE",
        message: "Could not accept the suggestion.",
      });
    }
  });

  router.delete("/memory-suggestions/:suggestionId", async (request, response) => {
    if (!request.user) {
      sendUnauthorized(response);
      return;
    }
    const suggestionId = validParam(request, "suggestionId");
    if (!suggestionId) {
      response
        .status(404)
        .json({ code: "SUGGESTION_NOT_FOUND", message: "Memory suggestion was not found." });
      return;
    }
    try {
      if (!(await memoryRepository.dismissSuggestionForUser(request.user.userId, suggestionId))) {
        response
          .status(404)
          .json({ code: "SUGGESTION_NOT_FOUND", message: "Memory suggestion was not found." });
        return;
      }
      response.status(204).end();
    } catch {
      response.status(503).json({
        code: "MEMORY_SUGGESTIONS_UNAVAILABLE",
        message: "Could not dismiss the suggestion.",
      });
    }
  });

  return router;
}
