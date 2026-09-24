import { requestJson, requestRaw } from "../http/httpClient";
import type { ChatMessage } from "./aiAssistantService";

const CONVERSATIONS_ENDPOINT = "/api/ai/conversations";

export interface AIConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface AIConversation extends AIConversationSummary {
  messages: ChatMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readConversationSummary(value: unknown): AIConversationSummary | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.updatedAt !== "string" ||
    !(typeof value.lastMessageAt === "string" || value.lastMessageAt === null)
  ) {
    return undefined;
  }
  return {
    id: value.id,
    title: value.title,
    updatedAt: value.updatedAt,
    lastMessageAt: value.lastMessageAt,
  };
}

export async function listAIConversations(): Promise<AIConversationSummary[]> {
  const payload = await requestJson(CONVERSATIONS_ENDPOINT);
  if (!isRecord(payload) || !Array.isArray(payload.conversations)) {
    throw new Error("Conversation list response is invalid.");
  }
  return payload.conversations.flatMap((item) => {
    const summary = readConversationSummary(item);
    return summary ? [summary] : [];
  });
}

export async function createAIConversation(): Promise<AIConversationSummary> {
  const payload = await requestJson(CONVERSATIONS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const summary = isRecord(payload) ? readConversationSummary(payload.conversation) : undefined;
  if (!summary) throw new Error("Conversation response is invalid.");
  return summary;
}

export async function getAIConversation(id: string): Promise<AIConversation> {
  const payload = await requestJson(`${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}`);
  const conversation = isRecord(payload) ? payload.conversation : undefined;
  const summary = readConversationSummary(conversation);
  if (!summary || !isRecord(conversation) || !Array.isArray(conversation.messages)) {
    throw new Error("Conversation response is invalid.");
  }
  const messages = conversation.messages.flatMap((item): ChatMessage[] => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.content !== "string" ||
      typeof item.createdAt !== "string" ||
      (item.role !== "USER" && item.role !== "ASSISTANT")
    ) {
      return [];
    }
    const role = item.role === "USER" ? "user" : "assistant";
    const status = item.status;
    return [
      {
        id: item.id,
        role,
        content: item.content,
        timestamp: item.createdAt,
        ...(status === "COMPLETE" ? { isComplete: true } : {}),
        ...(status === "STREAMING" || status === "CANCELLED" ? { isCancelled: true } : {}),
      },
    ];
  });
  return { ...summary, messages };
}

export async function deleteAIConversation(id: string): Promise<void> {
  const response = await requestRaw(`${CONVERSATIONS_ENDPOINT}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Conversation could not be deleted.");
}
