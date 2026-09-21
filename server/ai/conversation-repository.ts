import type { AIMessageStatus } from "../generated/prisma/enums.js";
import { prisma } from "../db/prisma.js";

const CONVERSATION_TITLE_LIMIT = 160;

export type StoredConversation = NonNullable<Awaited<ReturnType<typeof getForUser>>>;
export type StoredMessage = StoredConversation["messages"][number];

export async function recoverInterruptedAssistantMessages(): Promise<number> {
  // The BFF keeps active SSE sessions in process memory, so STREAMING rows left at startup are orphaned.
  const recovered = await prisma.aIMessage.updateMany({
    where: { role: "ASSISTANT", status: "STREAMING" },
    data: { status: "FAILED" },
  });
  return recovered.count;
}

export async function create(userId: string, title?: string) {
  return prisma.aIConversation.create({
    data: {
      userId,
      ...(title ? { title: title.slice(0, CONVERSATION_TITLE_LIMIT) } : {}),
    },
    select: { id: true, title: true, summary: true, updatedAt: true, lastMessageAt: true },
  });
}

export async function listForUser(userId: string) {
  return prisma.aIConversation.findMany({
    where: { userId },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: { id: true, title: true, updatedAt: true, lastMessageAt: true },
  });
}

export async function getForUser(userId: string, conversationId: string) {
  return prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      title: true,
      summary: true,
      summaryThroughMessageId: true,
      updatedAt: true,
      lastMessageAt: true,
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          clientMessageId: true,
          role: true,
          content: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function appendUserMessageOnce(
  userId: string,
  conversationId: string,
  clientMessageId: string,
  content: string,
): Promise<{ message: StoredMessage; created: boolean } | undefined> {
  const existing = await prisma.aIMessage.findFirst({
    where: {
      conversationId,
      clientMessageId,
      conversation: { is: { userId } },
    },
  });
  if (existing) return { message: existing, created: false };

  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, title: true },
  });
  if (!conversation) return undefined;

  try {
    const message = await prisma.$transaction(async (transaction) => {
      const created = await transaction.aIMessage.create({
        data: { conversationId, clientMessageId, role: "USER", content, status: "COMPLETE" },
      });
      await transaction.aIConversation.update({
        where: { id: conversationId, userId },
        data: {
          lastMessageAt: created.createdAt,
          updatedAt: created.createdAt,
          ...(conversation.title === "新对话"
            ? { title: content.slice(0, CONVERSATION_TITLE_LIMIT) }
            : {}),
        },
      });
      return created;
    });
    return { message, created: true };
  } catch (error: unknown) {
    const duplicate = await prisma.aIMessage.findFirst({
      where: {
        conversationId,
        clientMessageId,
        conversation: { is: { userId } },
      },
    });
    if (duplicate) return { message: duplicate, created: false };
    throw error;
  }
}

export type AssistantMessageClaim =
  | { kind: "claimed"; id: string }
  | { kind: "in_progress"; id: string }
  | { kind: "complete"; id: string; content: string };

function existingAssistantClaim(message: {
  id: string;
  content: string;
  status: AIMessageStatus;
}): AssistantMessageClaim | undefined {
  if (message.status === "STREAMING") return { kind: "in_progress", id: message.id };
  if (message.status === "COMPLETE") {
    return { kind: "complete", id: message.id, content: message.content };
  }
  return undefined;
}

export async function claimAssistantMessage(
  userId: string,
  conversationId: string,
  userMessageId: string,
): Promise<AssistantMessageClaim | undefined> {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!conversation) return undefined;

  const userMessage = await prisma.aIMessage.findFirst({
    where: {
      id: userMessageId,
      conversationId,
      role: "USER",
      conversation: { is: { userId } },
    },
    select: { id: true },
  });
  if (!userMessage) return undefined;

  const existing = await prisma.aIMessage.findUnique({
    where: { replyToMessageId: userMessageId },
    select: { id: true, content: true, status: true },
  });
  if (existing) {
    const result = existingAssistantClaim(existing);
    if (result) return result;

    const retried = await prisma.aIMessage.updateMany({
      where: {
        id: existing.id,
        conversationId,
        conversation: { is: { userId } },
        status: { in: ["FAILED", "CANCELLED"] },
      },
      data: { content: "", status: "STREAMING" },
    });
    if (retried.count === 1) return { kind: "claimed", id: existing.id };
    const latest = await prisma.aIMessage.findUnique({
      where: { replyToMessageId: userMessageId },
      select: { id: true, content: true, status: true },
    });
    return latest ? existingAssistantClaim(latest) : undefined;
  }

  try {
    const created = await prisma.aIMessage.create({
      data: {
        conversationId,
        replyToMessageId: userMessageId,
        role: "ASSISTANT",
        content: "",
        status: "STREAMING",
      },
      select: { id: true },
    });
    return { kind: "claimed", id: created.id };
  } catch (error: unknown) {
    const raced = await prisma.aIMessage.findUnique({
      where: { replyToMessageId: userMessageId },
      select: { id: true, content: true, status: true },
    });
    if (raced) return existingAssistantClaim(raced);
    throw error;
  }
}

export async function appendAssistantResult(
  userId: string,
  conversationId: string,
  messageId: string,
  content: string,
  status: AIMessageStatus,
): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (transaction) => {
    const updatedMessage = await transaction.aIMessage.updateMany({
      where: {
        id: messageId,
        conversationId,
        conversation: { is: { userId } },
      },
      data: { content, status },
    });
    if (updatedMessage.count !== 1) throw new Error("Assistant message is no longer available.");

    const updatedConversation = await transaction.aIConversation.updateMany({
      where: { id: conversationId, userId },
      data: { lastMessageAt: now, updatedAt: now },
    });
    if (updatedConversation.count !== 1) throw new Error("Conversation is no longer available.");
  });
}

export async function appendDemoAssistantResult(
  userId: string,
  conversationId: string,
  userClientMessageId: string,
  content: string,
): Promise<boolean> {
  const ownedUserMessage = await prisma.aIMessage.findFirst({
    where: {
      conversationId,
      clientMessageId: userClientMessageId,
      role: "USER",
      conversation: { is: { userId } },
    },
    select: { id: true },
  });
  if (!ownedUserMessage) return false;

  const assistantClientMessageId = `demo:${userClientMessageId}`;
  try {
    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.aIMessage.findFirst({
        where: { conversationId, clientMessageId: assistantClientMessageId },
        select: { id: true },
      });
      if (existing) return;

      const assistantMessage = await transaction.aIMessage.create({
        data: {
          conversationId,
          clientMessageId: assistantClientMessageId,
          role: "ASSISTANT",
          content,
          status: "COMPLETE",
        },
        select: { createdAt: true },
      });
      await transaction.aIConversation.updateMany({
        where: { id: conversationId, userId },
        data: { lastMessageAt: assistantMessage.createdAt, updatedAt: assistantMessage.createdAt },
      });
    });
    return true;
  } catch (error: unknown) {
    const duplicate = await prisma.aIMessage.findFirst({
      where: { conversationId, clientMessageId: assistantClientMessageId },
      select: { id: true },
    });
    if (duplicate) return true;
    throw error;
  }
}

export async function updateSummaryForUser(
  userId: string,
  conversationId: string,
  summary: string,
  throughMessageId: string,
): Promise<void> {
  await prisma.aIConversation.updateMany({
    where: { id: conversationId, userId },
    data: { summary, summaryThroughMessageId: throughMessageId },
  });
}

export async function deleteForUser(userId: string, conversationId: string): Promise<boolean> {
  const result = await prisma.aIConversation.deleteMany({ where: { id: conversationId, userId } });
  return result.count > 0;
}
