import type { StoredConversation } from "./conversation-repository.js";

const MAX_SERIALIZED_CONTEXT_BYTES = 48 * 1024;
const MAX_SUMMARY_CHARACTERS = 6_000;

export interface PreparedAIContext {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  conversationSummary?: string;
  trimmedMessageCount: number;
  summaryInput?: string;
  summaryThroughMessageId?: string;
}

interface ContextTurn {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}

function serializedSize(
  messages: PreparedAIContext["messages"],
  conversationSummary: string | undefined,
): number {
  return Buffer.byteLength(JSON.stringify({ messages, conversationSummary }), "utf8");
}

export async function prepareAIContext(
  conversation: StoredConversation,
  currentUserMessageId: string,
): Promise<PreparedAIContext> {
  const currentIndex = conversation.messages.findIndex(
    (message) => message.id === currentUserMessageId,
  );
  if (currentIndex < 0) throw new Error("Current user message is unavailable.");

  const conversationSummary =
    conversation.summary?.trim().slice(0, MAX_SUMMARY_CHARACTERS) || undefined;

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
    serializedSize(messages, conversationSummary) > MAX_SERIALIZED_CONTEXT_BYTES
  ) {
    const removed = turns.shift();
    if (!removed) break;
    trimmedTurns.push(removed);
    trimmedMessageCount += removed.messages.length;
    messages = [...turns.flatMap((turn) => turn.messages.map(toProviderMessage)), ...currentTurn];
  }

  if (serializedSize(messages, conversationSummary) > MAX_SERIALIZED_CONTEXT_BYTES) {
    throw new Error("Current AI request exceeds the context budget.");
  }

  const trimmedMessages = trimmedTurns.flatMap((turn) => turn.messages);
  const summaryInput = trimmedMessages.length
    ? [
        conversationSummary,
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
    ...(conversationSummary ? { conversationSummary } : {}),
    trimmedMessageCount,
    ...(summaryInput ? { summaryInput } : {}),
    ...(summaryThroughMessageId ? { summaryThroughMessageId } : {}),
  };
}
