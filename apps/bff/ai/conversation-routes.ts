import { Router, type Request } from "express";
import * as conversationRepository from "./conversation-repository.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validConversationId(request: Request): string | undefined {
  const id = request.params.conversationId;
  return typeof id === "string" && UUID_PATTERN.test(id) ? id : undefined;
}

export function createConversationRouter(): Router {
  const router = Router();

  router.get("/", async (request, response) => {
    if (!request.user) {
      response.status(401).json({ code: "AUTH_REQUIRED", message: "Sign in to continue." });
      return;
    }
    try {
      response
        .status(200)
        .json({ conversations: await conversationRepository.listForUser(request.user.userId) });
    } catch {
      response
        .status(503)
        .json({ code: "CONVERSATIONS_UNAVAILABLE", message: "Could not load conversations." });
    }
  });

  router.post("/", async (request, response) => {
    if (!request.user) {
      response.status(401).json({ code: "AUTH_REQUIRED", message: "Sign in to continue." });
      return;
    }
    let body: unknown;
    try {
      body = request.rawBody?.length ? JSON.parse(request.rawBody.toString("utf8")) : {};
    } catch {
      response.status(400).json({ code: "INVALID_REQUEST", message: "Request data is invalid." });
      return;
    }
    const title =
      isRecord(body) && typeof body.title === "string"
        ? body.title.trim().slice(0, 160)
        : undefined;
    try {
      response.status(201).json({
        conversation: await conversationRepository.create(request.user.userId, title || undefined),
      });
    } catch {
      response
        .status(503)
        .json({ code: "CONVERSATIONS_UNAVAILABLE", message: "Could not create a conversation." });
    }
  });

  router.get("/:conversationId", async (request, response) => {
    const conversationId = validConversationId(request);
    if (!conversationId || !request.user) {
      response.status(conversationId ? 401 : 404).json({
        code: conversationId ? "AUTH_REQUIRED" : "CONVERSATION_NOT_FOUND",
        message: conversationId ? "Sign in to continue." : "Conversation was not found.",
      });
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
      response.status(200).json({ conversation });
    } catch {
      response
        .status(503)
        .json({ code: "CONVERSATIONS_UNAVAILABLE", message: "Could not load conversation." });
    }
  });

  router.delete("/:conversationId", async (request, response) => {
    const conversationId = validConversationId(request);
    if (!conversationId || !request.user) {
      response.status(conversationId ? 401 : 404).json({
        code: conversationId ? "AUTH_REQUIRED" : "CONVERSATION_NOT_FOUND",
        message: conversationId ? "Sign in to continue." : "Conversation was not found.",
      });
      return;
    }
    try {
      if (!(await conversationRepository.deleteForUser(request.user.userId, conversationId))) {
        response
          .status(404)
          .json({ code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." });
        return;
      }
      response.status(204).end();
    } catch {
      response
        .status(503)
        .json({ code: "CONVERSATIONS_UNAVAILABLE", message: "Could not delete conversation." });
    }
  });

  router.post("/:conversationId/demo-reply", async (request, response) => {
    const conversationId = validConversationId(request);
    if (!conversationId || !request.user) {
      response.status(conversationId ? 401 : 404).json({
        code: conversationId ? "AUTH_REQUIRED" : "CONVERSATION_NOT_FOUND",
        message: conversationId ? "Sign in to continue." : "Conversation was not found.",
      });
      return;
    }

    let body: unknown;
    try {
      body = request.rawBody?.length ? JSON.parse(request.rawBody.toString("utf8")) : undefined;
    } catch {
      response.status(400).json({ code: "INVALID_REQUEST", message: "Request data is invalid." });
      return;
    }
    const userClientMessageId = isRecord(body) ? body.userClientMessageId : undefined;
    const content = isRecord(body) ? body.content : undefined;
    if (
      typeof userClientMessageId !== "string" ||
      !/^[A-Za-z0-9._:-]{1,128}$/.test(userClientMessageId) ||
      typeof content !== "string" ||
      content.trim().length === 0 ||
      content.length > 40_000
    ) {
      response.status(400).json({ code: "INVALID_REQUEST", message: "Request data is invalid." });
      return;
    }

    try {
      const saved = await conversationRepository.appendDemoAssistantResult(
        request.user.userId,
        conversationId,
        userClientMessageId,
        content,
      );
      if (!saved) {
        response
          .status(404)
          .json({ code: "CONVERSATION_NOT_FOUND", message: "Conversation was not found." });
        return;
      }
      response.status(204).end();
    } catch {
      response
        .status(503)
        .json({ code: "CONVERSATIONS_UNAVAILABLE", message: "Could not save demo reply." });
    }
  });

  return router;
}
