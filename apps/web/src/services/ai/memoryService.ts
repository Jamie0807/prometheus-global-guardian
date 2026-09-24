import { requestJson, requestRaw } from "../http/httpClient";

const API = "/api/ai";

export interface AIMemoryItem {
  id: string;
  content: string;
  enabled: boolean;
  sourceConversationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AIMemorySuggestion {
  id: string;
  sourceConversationId: string | null;
  content: string;
  reason: string | null;
  status: "PENDING" | "ACCEPTED" | "DISMISSED";
  createdAt: string;
  updatedAt: string;
}

export interface AIMemoryState {
  memoryEnabled: boolean;
  memories: AIMemoryItem[];
  suggestions: AIMemorySuggestion[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseItems<T>(value: unknown, key: string): T[] {
  if (!isRecord(value) || !Array.isArray(value[key])) return [];
  return value[key].filter((item): item is T => isRecord(item));
}

export async function getAIMemoryState(): Promise<AIMemoryState> {
  const [memoryPayload, suggestionPayload] = await Promise.all([
    requestJson(`${API}/memories`),
    requestJson(`${API}/memory-suggestions`),
  ]);
  return {
    memoryEnabled: isRecord(memoryPayload) && memoryPayload.memoryEnabled === true,
    memories: parseItems<AIMemoryItem>(memoryPayload, "memories"),
    suggestions: parseItems<AIMemorySuggestion>(suggestionPayload, "suggestions"),
  };
}

export async function setAIMemoryEnabled(enabled: boolean): Promise<void> {
  await requestJson("/api/auth/account", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memoryEnabled: enabled }),
  });
}

export async function generateAIMemorySuggestions(
  conversationId: string,
): Promise<AIMemorySuggestion[]> {
  const value = await requestJson(`${API}/memory-suggestions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId }),
  });
  return parseItems<AIMemorySuggestion>(value, "suggestions");
}

export async function createAIMemory(content: string): Promise<void> {
  await requestJson(`${API}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

export async function updateAIMemory(
  id: string,
  patch: { content?: string; enabled?: boolean },
): Promise<void> {
  await requestJson(`${API}/memories/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteAIMemory(id: string): Promise<void> {
  const response = await requestRaw(`${API}/memories/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Memory could not be deleted.");
}

export async function clearAIMemories(): Promise<void> {
  await requestRaw(`${API}/memories`, { method: "DELETE" });
}

export async function acceptAIMemorySuggestion(id: string, content?: string): Promise<void> {
  await requestJson(`${API}/memory-suggestions/${encodeURIComponent(id)}/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(content === undefined ? {} : { body: JSON.stringify({ content }) }),
  });
}

export async function dismissAIMemorySuggestion(id: string): Promise<void> {
  const response = await requestRaw(`${API}/memory-suggestions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Suggestion could not be dismissed.");
}
