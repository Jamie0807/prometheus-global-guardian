import { describe, expect, it } from "vitest";
import type { StoredConversation } from "../ai/conversation-repository.js";
import { prepareAIContext } from "../ai/context-manager.js";

const message = (
  id: string,
  role: "USER" | "ASSISTANT",
  content: string,
  status: StoredConversation["messages"][number]["status"] = "COMPLETE",
): StoredConversation["messages"][number] => ({
  id,
  clientMessageId: null,
  role,
  content,
  status,
  createdAt: new Date("2026-09-25T00:00:00.000Z"),
});

const conversation = (messages: StoredConversation["messages"]): StoredConversation => ({
  id: "conversation-1",
  title: "测试会话",
  summary: "此前对话摘要",
  summaryThroughMessageId: "assistant-1",
  updatedAt: new Date("2026-09-25T00:00:00.000Z"),
  lastMessageAt: new Date("2026-09-25T00:00:00.000Z"),
  messages,
});

describe("prepareAIContext", () => {
  it("uses the conversation summary cursor without loading persistent memories", async () => {
    const result = await prepareAIContext(
      conversation([
        message("user-1", "USER", "已被摘要的用户消息"),
        message("assistant-1", "ASSISTANT", "已被摘要的助手消息"),
        message("user-2", "USER", "当前问题"),
      ]),
      "user-2",
    );

    expect(result.conversationSummary).toBe("此前对话摘要");
    expect(result.messages).toEqual([{ role: "user", content: "当前问题" }]);
    expect(result).not.toHaveProperty("persistentNotes");
  });

  it("returns an input for summarizing trimmed complete turns", async () => {
    const oldMessages = Array.from({ length: 14 }, (_, index) => [
      message("user-" + index, "USER", "用户内容 " + "x".repeat(4_000)),
      message("assistant-" + index, "ASSISTANT", "助手内容 " + "y".repeat(4_000)),
    ]).flat();
    const result = await prepareAIContext(
      conversation(oldMessages.concat([message("current", "USER", "当前问题")])),
      "current",
    );

    expect(result.trimmedMessageCount).toBeGreaterThan(0);
    expect(result.summaryInput).toContain("用户：");
    expect(result.summaryThroughMessageId).toBeDefined();
    expect(result.messages.at(-1)).toEqual({ role: "user", content: "当前问题" });
  });

  it("keeps the current message and complete turns within the 48 KiB boundary", async () => {
    const oldMessages = Array.from({ length: 8 }, (_, index) => [
      message("user-boundary-" + index, "USER", "用户内容 " + "u".repeat(4_500)),
      message("assistant-boundary-" + index, "ASSISTANT", "助手内容 " + "a".repeat(4_500)),
    ]).flat();
    const result = await prepareAIContext(
      conversation(
        oldMessages.concat([
          message("incomplete-user", "USER", "未完成的用户轮次"),
          message("incomplete-assistant", "ASSISTANT", "未完成的助手轮次", "STREAMING"),
          message("current-boundary", "USER", "当前问题"),
        ]),
      ),
      "current-boundary",
    );

    expect(result.trimmedMessageCount).toBeGreaterThan(0);
    expect(
      Buffer.byteLength(JSON.stringify({ messages: result.messages }), "utf8"),
    ).toBeLessThanOrEqual(48 * 1024);
    expect(result.messages.at(-1)).toEqual({ role: "user", content: "当前问题" });
    expect(result.messages).not.toContainEqual({ role: "user", content: "未完成的用户轮次" });
    for (let index = 0; index < result.messages.length - 1; index += 2) {
      expect(result.messages[index]).toMatchObject({ role: "user" });
      expect(result.messages[index + 1]).toMatchObject({ role: "assistant" });
    }
    expect(result.summaryInput).toHaveLength(24_000);
    expect(result.summaryInput).toContain("用户：");
    expect(result.summaryInput).toContain("助手：");
    expect(result.summaryThroughMessageId).toBeDefined();
  });

  it("counts the cleaned conversation summary against the 48 KiB boundary", async () => {
    const oldMessages = Array.from({ length: 5 }, (_, index) => [
      message("user-summary-boundary-" + index, "USER", "用户内容 " + "u".repeat(4_000)),
      message("assistant-summary-boundary-" + index, "ASSISTANT", "助手内容 " + "a".repeat(4_000)),
    ]).flat();
    const result = await prepareAIContext(
      {
        ...conversation(
          oldMessages.concat([message("current-summary-boundary", "USER", "当前问题")]),
        ),
        summary: "摘要".repeat(3_000),
      },
      "current-summary-boundary",
    );

    expect(
      Buffer.byteLength(
        JSON.stringify({
          messages: result.messages,
          conversationSummary: result.conversationSummary,
        }),
        "utf8",
      ),
    ).toBeLessThanOrEqual(48 * 1024);
    expect(result.trimmedMessageCount).toBeGreaterThan(0);
    expect(result.messages.at(-1)).toEqual({ role: "user", content: "当前问题" });
  });
});
