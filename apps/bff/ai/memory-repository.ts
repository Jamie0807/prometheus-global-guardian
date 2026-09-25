import { prisma } from "../db/prisma.js";

export interface MemorySuggestionInput {
  content: string;
  reason?: string;
}

export interface MemoryPatch {
  content?: string;
  enabled?: boolean;
}

export async function listForUser(userId: string) {
  const [user, memories] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { memoryEnabled: true } }),
    prisma.aIMemoryItem.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 200,
      select: {
        id: true,
        content: true,
        enabled: true,
        sourceConversationId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  if (!user) return undefined;
  return { memoryEnabled: user.memoryEnabled, memories };
}

export async function setMemoryEnabled(userId: string, enabled: boolean) {
  const result = await prisma.user.updateMany({
    where: { id: userId },
    data: { memoryEnabled: enabled },
  });
  if (result.count === 0) return undefined;
  return prisma.user.findUnique({ where: { id: userId }, select: { memoryEnabled: true } });
}

export async function createForUser(
  userId: string,
  content: string,
  sourceConversationId?: string,
) {
  if (sourceConversationId) {
    const conversation = await prisma.aIConversation.findFirst({
      where: { id: sourceConversationId, userId },
      select: { id: true },
    });
    if (!conversation) return undefined;
  }

  return prisma.aIMemoryItem.create({
    data: { userId, content, ...(sourceConversationId ? { sourceConversationId } : {}) },
    select: {
      id: true,
      content: true,
      enabled: true,
      sourceConversationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function updateForUser(userId: string, memoryId: string, patch: MemoryPatch) {
  const result = await prisma.aIMemoryItem.updateMany({
    where: { id: memoryId, userId },
    data: patch,
  });
  if (result.count === 0) return undefined;

  return prisma.aIMemoryItem.findFirst({
    where: { id: memoryId, userId },
    select: {
      id: true,
      content: true,
      enabled: true,
      sourceConversationId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function deleteForUser(userId: string, memoryId: string): Promise<boolean> {
  const result = await prisma.aIMemoryItem.deleteMany({ where: { id: memoryId, userId } });
  return result.count > 0;
}

export async function deleteAllForUser(userId: string): Promise<number> {
  const result = await prisma.aIMemoryItem.deleteMany({ where: { userId } });
  return result.count;
}

export async function createSuggestionsForUser(
  userId: string,
  conversationId: string,
  suggestions: MemorySuggestionInput[],
) {
  const conversation = await prisma.aIConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!conversation) return undefined;

  return prisma.$transaction((transaction) =>
    Promise.all(
      suggestions.map((suggestion) =>
        transaction.aIMemorySuggestion.create({
          data: {
            userId,
            sourceConversationId: conversationId,
            content: suggestion.content,
            ...(suggestion.reason ? { reason: suggestion.reason } : {}),
          },
          select: {
            id: true,
            sourceConversationId: true,
            content: true,
            reason: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ),
    ),
  );
}

export async function listSuggestionsForUser(userId: string) {
  return prisma.aIMemorySuggestion.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 200,
    select: {
      id: true,
      sourceConversationId: true,
      content: true,
      reason: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function acceptSuggestionForUser(
  userId: string,
  suggestionId: string,
  revisedContent?: string,
) {
  return prisma.$transaction(async (transaction) => {
    const suggestion = await transaction.aIMemorySuggestion.findFirst({
      where: { id: suggestionId, userId, status: "PENDING" },
      select: { id: true, sourceConversationId: true, content: true },
    });
    if (!suggestion) return undefined;
    const content = revisedContent ?? suggestion.content;

    const accepted = await transaction.aIMemorySuggestion.updateMany({
      where: { id: suggestionId, userId, status: "PENDING" },
      data: { status: "ACCEPTED", content },
    });
    if (accepted.count !== 1) return undefined;

    const existingMemory = await transaction.aIMemoryItem.findFirst({
      where: { userId, content },
      select: { id: true },
    });
    const memory = existingMemory
      ? await transaction.aIMemoryItem.update({
          where: { id: existingMemory.id, userId },
          data: {
            enabled: true,
            sourceConversationId: suggestion.sourceConversationId,
          },
          select: {
            id: true,
            content: true,
            enabled: true,
            sourceConversationId: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      : await transaction.aIMemoryItem.create({
          data: {
            userId,
            content,
            sourceConversationId: suggestion.sourceConversationId,
          },
          select: {
            id: true,
            content: true,
            enabled: true,
            sourceConversationId: true,
            createdAt: true,
            updatedAt: true,
          },
        });

    return { memory };
  });
}

export async function dismissSuggestionForUser(
  userId: string,
  suggestionId: string,
): Promise<boolean> {
  const result = await prisma.aIMemorySuggestion.updateMany({
    where: { id: suggestionId, userId, status: "PENDING" },
    data: { status: "DISMISSED" },
  });
  return result.count > 0;
}
