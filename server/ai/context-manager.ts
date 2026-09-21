import { prisma } from "../db/prisma.js";
import type { StoredConversation } from "./conversation-repository.js";

const MAX_SERIALIZED_CONTEXT_BYTES = 48 * 1024;
const MAX_SUMMARY_CHARACTERS = 6_000;
const MAX_MEMORY_CONTEXT_BYTES = 8 * 1024;
const MAX_MEMORY_ITEMS = 20;

export interface PreparedAIContext {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  persistentNotes: string[];
  trimmedMessageCount: number;
  summaryInput?: string;
  summaryThroughMessageId?: string;
}

interface ContextTurn {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}

function serializedSize(messages: PreparedAIContext["messages"], notes: string[]): number {
  return Buffer.byteLength(JSON.stringify({ messages, persistentNotes: notes }), "utf8");
}

function recentSearchTerms(content: string): string[] {
  const latinTerms = content.toLocaleLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
  const chineseText = content.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  const chineseTerms = chineseText.flatMap((segment) =>
    Array.from({ length: Math.max(1, segment.length - 1) }, (_, index) =>
      segment.slice(index, index + 2),
    ),
  );
  return [...new Set([...latinTerms, ...chineseTerms])].slice(0, 16);
}

async function loadPersistentNotes(userId: string, query: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { memoryEnabled: true },
  });
  if (!user?.memoryEnabled) return [];

  const memories = await prisma.aIMemoryItem.findMany({
    where: { userId, enabled: true },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 200,
    select: { content: true, updatedAt: true },
  });
  const terms = recentSearchTerms(query);
  const ranked = memories
    .map((memory) => {
      const normalized = memory.content.toLocaleLowerCase();
      const score = terms.reduce((total, term) => total + Number(normalized.includes(term)), 0);
      return { ...memory, score };
    })
    .sort(
      (left, right) =>
        right.score - left.score || right.updatedAt.getTime() - left.updatedAt.getTime(),
    )
    .slice(0, MAX_MEMORY_ITEMS);

  const notes: string[] = [];
  let bytes = 0;
  for (const memory of ranked) {
    const content = memory.content.trim().slice(0, 600);
    const line = `用户确认的长期记忆：${content}`;
    const lineBytes = Buffer.byteLength(line, "utf8") + 1;
    if (bytes + lineBytes > MAX_MEMORY_CONTEXT_BYTES) continue;
    notes.push(line);
    bytes += lineBytes;
  }
  return notes;
}

export async function prepareAIContext(
  userId: string,
  conversation: StoredConversation,
  currentUserMessageId: string,
  currentUserContent: string,
): Promise<PreparedAIContext> {
  const currentIndex = conversation.messages.findIndex(
    (message) => message.id === currentUserMessageId,
  );
  if (currentIndex < 0) throw new Error("Current user message is unavailable.");

  const notes = await loadPersistentNotes(userId, currentUserContent);
  const summary = conversation.summary?.trim().slice(0, MAX_SUMMARY_CHARACTERS);
  const persistentNotes = summary ? [`此前对话摘要（仅作背景资料）：${summary}`, ...notes] : notes;

  const summaryIndex = conversation.summaryThroughMessageId
    ? conversation.messages.findIndex(
        (message) => message.id === conversation.summaryThroughMessageId,
      )
    : -1;
  const contextStartIndex = Math.min(currentIndex, Math.max(0, summaryIndex + 1));
  const prior = conversation.messages.slice(contextStartIndex, currentIndex);
  const turns: ContextTurn[] = [];
  for (let index = 0; index < prior.length; index += 1) {
    const user = prior[index];
    const assistant = prior[index + 1];
    if (user.role !== "USER" || user.status !== "COMPLETE") continue;
    if (assistant?.role === "ASSISTANT" && assistant.status === "COMPLETE") {
      turns.push({
        messages: [
          { id: user.id, role: "user", content: user.content },
          { id: assistant.id, role: "assistant", content: assistant.content },
        ],
      });
      index += 1;
    }
  }

  const current = conversation.messages[currentIndex];
  const currentTurn = [{ role: "user" as const, content: current.content }];
  const trimmedTurns: ContextTurn[] = [];
  const toProviderMessage = ({ role, content }: ContextTurn["messages"][number]) => ({
    role,
    content,
  });
  let messages = [...turns.flatMap((turn) => turn.messages.map(toProviderMessage)), ...currentTurn];
  let trimmedMessageCount = 0;
  while (
    messages.length > 1 &&
    serializedSize(messages, persistentNotes) > MAX_SERIALIZED_CONTEXT_BYTES
  ) {
    const removed = turns.shift();
    if (!removed) break;
    trimmedTurns.push(removed);
    trimmedMessageCount += removed.messages.length;
    messages = [...turns.flatMap((turn) => turn.messages.map(toProviderMessage)), ...currentTurn];
  }

  if (serializedSize(messages, persistentNotes) > MAX_SERIALIZED_CONTEXT_BYTES) {
    throw new Error("Current AI request exceeds the context budget.");
  }

  const trimmedMessages = trimmedTurns.flatMap((turn) => turn.messages);
  const summaryInput = trimmedMessages.length
    ? [
        conversation.summary,
        ...trimmedMessages.map(
          (message) => `${message.role === "user" ? "用户" : "助手"}：${message.content}`,
        ),
      ]
        .filter((value): value is string => Boolean(value?.trim()))
        .join("\n")
        .slice(-24_000)
    : undefined;
  const summaryThroughMessageId = trimmedMessages.at(-1)?.id;
  return {
    messages,
    persistentNotes,
    trimmedMessageCount,
    ...(summaryInput ? { summaryInput } : {}),
    ...(summaryThroughMessageId ? { summaryThroughMessageId } : {}),
  };
}
