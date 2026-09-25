/** 验证 AI 聊天助手的流式交互、状态展示和错误处理。 */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIStreamOutcome, StreamChatOptions } from "../../src/services/ai/aiAssistantService";
import AIChatAssistant from "../../src/components/AIChatAssistant";
import { useAIChatSession } from "../../src/hooks/useAIChatSession";
import { UIStateProvider, useUIState } from "../../src/state/UIStateContext";

const serviceMocks = vi.hoisted(() => ({
  streamChatMessage: vi.fn(),
}));

const conversationMocks = vi.hoisted(() => ({
  listAIConversations: vi.fn(async () => []),
  createAIConversation: vi.fn(async () => ({
    id: "conversation-1",
    title: "新对话",
    updatedAt: "2026-09-21T00:00:00.000Z",
    lastMessageAt: null,
  })),
  getAIConversation: vi.fn(),
  deleteAIConversation: vi.fn(async () => undefined),
}));

vi.mock("../../src/services/ai/aiAssistantService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/services/ai/aiAssistantService")>()),
  streamChatMessage: serviceMocks.streamChatMessage,
}));

vi.mock("../../src/services/ai/conversationService", () => conversationMocks);

vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => ({ hazards: [] }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function AIStateHarness() {
  const { openModal } = useUIState();

  return (
    <>
      <button type="button" onClick={() => openModal("ai")}>
        open-ai
      </button>
      <AIChatAssistant />
    </>
  );
}

function renderWithAppState() {
  return render(
    <UIStateProvider>
      <AIStateHarness />
    </UIStateProvider>,
  );
}

function SessionRaceHarness() {
  const session = useAIChatSession(true, () => undefined, undefined);

  return (
    <>
      <button type="button" onClick={() => void session.selectConversation("conversation-next")}>
        select-next
      </button>
      <button type="button" onClick={() => void session.newConversation()}>
        new-conversation
      </button>
      <button type="button" onClick={() => void session.send("待处理消息")}>
        send-message
      </button>
      <button type="button" onClick={() => void session.removeConversation("conversation-old")}>
        delete-current
      </button>
      <output data-testid="session-id">{session.currentConversationId ?? ""}</output>
      <output data-testid="session-loading">{String(session.isLoadingConversations)}</output>
      <output data-testid="conversation-list">
        {session.conversations.map((conversation) => conversation.id).join(",")}
      </output>
      {session.messages.map((message) => (
        <span key={message.id}>{message.content}</span>
      ))}
    </>
  );
}

describe("AIChatAssistant", () => {
  beforeEach(() => {
    serviceMocks.streamChatMessage.mockReset();
    conversationMocks.listAIConversations.mockReset().mockResolvedValue([]);
    conversationMocks.createAIConversation.mockReset().mockResolvedValue({
      id: "conversation-1",
      title: "新对话",
      updatedAt: "2026-09-21T00:00:00.000Z",
      lastMessageAt: null,
    });
    conversationMocks.getAIConversation.mockReset();
    conversationMocks.deleteAIConversation.mockReset().mockResolvedValue(undefined);
  });

  it("展示中文品牌、状态和键盘操作提示", async () => {
    const user = userEvent.setup();

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));

    expect(screen.getByText("全球灾害监控平台 AI 灾害分析助手")).toBeInTheDocument();
    expect(screen.getByText(/\u7531 LLM \u63d0\u4f9b\u652f\u6301/)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("输入灾害分析问题……（按 Enter 发送，按 Shift+Enter 换行）"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("按 Enter 发送 · 按 Shift+Enter 换行 · 按 ESC 关闭"),
    ).toBeInTheDocument();
  });

  it("does not render the legacy long-term memory control", async () => {
    const user = userEvent.setup();

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));

    expect(screen.queryByRole("button", { name: "长期记忆" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "长期记忆管理" })).not.toBeInTheDocument();
  });

  it("keeps ordered action numbering independent from unordered findings", async () => {
    const user = userEvent.setup();
    serviceMocks.streamChatMessage.mockImplementation(
      (_messages: unknown, _context: unknown, options: StreamChatOptions) => {
        options.onChunk(
          [
            "**关键发现**",
            "- 地震",
            "- 洪水",
            "",
            "**优先行动建议**",
            "1. 遵循当地疏散通知",
            "2. 准备应急物资",
          ].join("\n"),
        );
        return Promise.resolve({ kind: "completed" });
      },
    );

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析当前灾害");
    await user.click(screen.getByTitle("发送"));

    const assistant = await screen.findByText("遵循当地疏散通知");
    const bubble = assistant.closest(".ai-bubble");
    expect(bubble).not.toBeNull();
    expect(bubble?.querySelector("ul")?.textContent).toContain("地震");
    expect(bubble?.querySelector("ul")?.textContent).toContain("洪水");
    expect(bubble?.querySelector("ol")?.textContent).toContain("遵循当地疏散通知");
    expect(bubble?.querySelector("ol")?.textContent).toContain("准备应急物资");
  });

  it("stops the active request on close and ignores a late chunk", async () => {
    const user = userEvent.setup();
    const result = deferred<AIStreamOutcome>();
    let options: StreamChatOptions | undefined;
    serviceMocks.streamChatMessage.mockImplementation(
      (_messages: unknown, _context: unknown, requestOptions: StreamChatOptions) => {
        options = requestOptions;
        return result.promise;
      },
    );

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析洪水");
    await user.click(screen.getByTitle("发送"));
    await user.click(screen.getByRole("button", { name: "关闭 AI 助手" }));

    expect(options?.signal?.aborted).toBe(true);
    options?.onChunk("不应显示");
    result.resolve({ kind: "cancelled" });

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "AI 灾害分析助手" })).toBeNull(),
    );
    expect(screen.queryByText("不应显示")).not.toBeInTheDocument();
  });

  it("does not render an empty assistant bubble before the first response chunk", async () => {
    const user = userEvent.setup();
    const result = deferred<AIStreamOutcome>();
    let options: StreamChatOptions | undefined;
    serviceMocks.streamChatMessage.mockImplementation(
      (_messages: unknown, _context: unknown, requestOptions: StreamChatOptions) => {
        options = requestOptions;
        return result.promise;
      },
    );

    const { container } = renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析洪水");
    await user.click(screen.getByTitle("发送"));

    expect(screen.getByText("分析洪水")).toBeInTheDocument();
    expect(screen.getByText("🔄 AI 正在生成分析结果……")).toBeInTheDocument();
    expect(container.querySelector(".ai-bubble-ai")).toBeNull();
    expect(container.querySelector(".ai-cursor")).toBeNull();

    options?.onChunk("首段分析结果");

    expect(await screen.findByText("首段分析结果")).toBeInTheDocument();
    expect(container.querySelector(".ai-bubble-ai")).not.toBeNull();
    expect(container.querySelector(".ai-cursor")).not.toBeNull();
    result.resolve({ kind: "completed" });
  });

  it("shows automatic recovery status and continues the current assistant bubble", async () => {
    const user = userEvent.setup();
    const result = deferred<AIStreamOutcome>();
    let options: StreamChatOptions | undefined;
    serviceMocks.streamChatMessage.mockImplementation(
      (_messages: unknown, _context: unknown, requestOptions: StreamChatOptions) => {
        options = requestOptions;
        return result.promise;
      },
    );

    const { container } = renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析洪水");
    await user.click(screen.getByTitle("发送"));

    options?.onReconnect?.(1, 200);
    expect(await screen.findByText(/连接中断，正在自动恢复（第 1\/3 次）/)).toBeInTheDocument();
    options?.onReconnected?.();
    await waitFor(() =>
      expect(screen.queryByText(/连接中断，正在自动恢复/)).not.toBeInTheDocument(),
    );
    expect(screen.getByText("🔄 AI 正在生成分析结果……")).toBeInTheDocument();
    options?.onChunk("恢复后的分析");
    expect(await screen.findByText("恢复后的分析")).toBeInTheDocument();

    result.resolve({ kind: "completed" });
    await waitFor(() => expect(container.querySelector(".ai-cursor")).toBeNull());
    expect(screen.queryByText(/连接中断，正在自动恢复（第 1\/3 次）/)).not.toBeInTheDocument();
  });

  it("retries a failed request without adding another user message", async () => {
    const user = userEvent.setup();
    serviceMocks.streamChatMessage
      .mockResolvedValueOnce({ kind: "failed", message: "AI 响应异常，请重试。" })
      .mockResolvedValueOnce({ kind: "completed" });

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析洪水");
    await user.click(screen.getByTitle("发送"));
    await user.click(await screen.findByRole("button", { name: "重试" }));

    await waitFor(() => expect(serviceMocks.streamChatMessage).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText("分析洪水")).toHaveLength(1);
  });

  it("replaces a partial failed assistant reply when the user retries", async () => {
    const user = userEvent.setup();
    serviceMocks.streamChatMessage
      .mockImplementationOnce(
        (_messages: unknown, _context: unknown, options: StreamChatOptions) => {
          options.onChunk("未完成的片段");
          return Promise.resolve({ kind: "failed", message: "连接失败" });
        },
      )
      .mockImplementationOnce(
        (_messages: unknown, _context: unknown, options: StreamChatOptions) => {
          options.onChunk("重新生成的完整回复");
          return Promise.resolve({ kind: "completed" });
        },
      );

    const { container } = renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.type(screen.getByRole("textbox"), "分析洪水");
    await user.click(screen.getByTitle("发送"));
    await user.click(await screen.findByRole("button", { name: "重试" }));

    expect(await screen.findByText("重新生成的完整回复")).toBeInTheDocument();
    expect(screen.queryByText("未完成的片段")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".ai-bubble-ai")).toHaveLength(1);
    expect(screen.getAllByText("分析洪水")).toHaveLength(1);
  });

  it("keeps an unsent draft when the panel is closed and reopened", async () => {
    const user = userEvent.setup();

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    const input = screen.getByRole("textbox");
    await user.type(input, "保留的草稿");
    await user.click(screen.getByRole("button", { name: "关闭 AI 助手" }));
    await user.click(screen.getByRole("button", { name: "open-ai" }));

    expect(await screen.findByRole("textbox")).toHaveValue("保留的草稿");
  });

  it("disables switching controls and does not send a draft to the old conversation", async () => {
    const user = userEvent.setup();
    const pendingLoad = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
      messages: never[];
    }>();
    const oldConversation = {
      id: "conversation-old",
      title: "旧会话",
      updatedAt: "2026-09-21T00:00:00.000Z",
      lastMessageAt: "2026-09-21T00:00:00.000Z",
      messages: [],
    };
    conversationMocks.listAIConversations.mockResolvedValue([
      {
        id: oldConversation.id,
        title: oldConversation.title,
        updatedAt: oldConversation.updatedAt,
        lastMessageAt: oldConversation.lastMessageAt,
      },
      {
        id: "conversation-next",
        title: "目标会话",
        updatedAt: "2026-09-20T00:00:00.000Z",
        lastMessageAt: null,
      },
    ]);
    conversationMocks.getAIConversation
      .mockResolvedValueOnce(oldConversation)
      .mockReturnValueOnce(pendingLoad.promise);

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("conversation-old"));
    await user.type(screen.getByRole("textbox"), "不应发送到旧会话");
    await user.selectOptions(screen.getByRole("combobox"), "conversation-next");

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("button", { name: /新对话/ })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByTitle("发送")).toBeDisabled();

    const form = screen.getByRole("textbox").closest("form");
    if (!form) throw new Error("AI chat form is unavailable.");
    fireEvent.submit(form);
    expect(serviceMocks.streamChatMessage).not.toHaveBeenCalled();

    pendingLoad.resolve({
      id: "conversation-next",
      title: "目标会话",
      updatedAt: "2026-09-20T00:00:00.000Z",
      lastMessageAt: null,
      messages: [],
    });
  });

  it("ignores a pending send-created conversation after a new conversation takes over", async () => {
    const user = userEvent.setup();
    const pendingSendCreate = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
    }>();
    const pendingNewCreate = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
    }>();
    conversationMocks.createAIConversation
      .mockReset()
      .mockReturnValueOnce(pendingSendCreate.promise)
      .mockReturnValueOnce(pendingNewCreate.promise);
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "completed" });

    render(<SessionRaceHarness />);
    await waitFor(() => expect(screen.getByTestId("session-loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "send-message" }));
    expect(screen.getByTestId("session-loading")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "new-conversation" }));

    pendingNewCreate.resolve({
      id: "conversation-created",
      title: "新对话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
    });
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-created"),
    );
    expect(screen.getByTestId("session-loading")).toHaveTextContent("false");

    pendingSendCreate.resolve({
      id: "conversation-from-send",
      title: "旧发送会话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
    });
    await waitFor(() => expect(serviceMocks.streamChatMessage).not.toHaveBeenCalled());
    expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-created");
    expect(screen.getByTestId("session-loading")).toHaveTextContent("false");
  });

  it("ignores a pending send-created conversation after switching sessions", async () => {
    const user = userEvent.setup();
    const pendingSendCreate = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
    }>();
    const pendingSwitchLoad = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
      messages: never[];
    }>();
    conversationMocks.createAIConversation.mockReturnValueOnce(pendingSendCreate.promise);
    conversationMocks.getAIConversation.mockReturnValueOnce(pendingSwitchLoad.promise);
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "completed" });

    render(<SessionRaceHarness />);
    await waitFor(() => expect(screen.getByTestId("session-loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "send-message" }));
    expect(screen.getByTestId("session-loading")).toHaveTextContent("true");
    await user.click(screen.getByRole("button", { name: "select-next" }));

    pendingSwitchLoad.resolve({
      id: "conversation-next",
      title: "目标会话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
      messages: [],
    });
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-next"),
    );
    expect(screen.getByTestId("session-loading")).toHaveTextContent("false");

    pendingSendCreate.resolve({
      id: "conversation-from-send",
      title: "旧发送会话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
    });
    await waitFor(() => expect(serviceMocks.streamChatMessage).not.toHaveBeenCalled());
    expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-next");
    expect(screen.getByTestId("session-loading")).toHaveTextContent("false");
  });

  it("keeps the newest list when a completed stream refresh races with a new conversation", async () => {
    const user = userEvent.setup();
    const pendingRefresh = deferred<
      Array<{
        id: string;
        title: string;
        updatedAt: string;
        lastMessageAt: string | null;
      }>
    >();
    conversationMocks.listAIConversations
      .mockReset()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(pendingRefresh.promise);
    conversationMocks.createAIConversation
      .mockReset()
      .mockResolvedValueOnce({
        id: "conversation-created",
        title: "已发送会话",
        updatedAt: "2026-09-25T00:00:00.000Z",
        lastMessageAt: null,
      })
      .mockResolvedValueOnce({
        id: "conversation-new",
        title: "最新会话",
        updatedAt: "2026-09-25T00:01:00.000Z",
        lastMessageAt: null,
      });
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "completed" });

    render(<SessionRaceHarness />);
    await waitFor(() => expect(screen.getByTestId("session-loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "new-conversation" }));
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-created"),
    );
    await user.click(screen.getByRole("button", { name: "send-message" }));
    await waitFor(() => expect(conversationMocks.listAIConversations).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "new-conversation" }));
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-new"),
    );
    expect(screen.getByTestId("conversation-list")).toHaveTextContent(
      "conversation-new,conversation-created",
    );

    pendingRefresh.resolve([
      {
        id: "conversation-stale",
        title: "过期会话",
        updatedAt: "2026-09-24T00:00:00.000Z",
        lastMessageAt: null,
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("conversation-list")).toHaveTextContent(
        "conversation-new,conversation-created",
      ),
    );
    expect(screen.getByTestId("conversation-list")).not.toHaveTextContent("conversation-stale");
  });

  it("keeps the remaining list when a completed stream refresh races with deleting the current conversation", async () => {
    const user = userEvent.setup();
    const pendingRefresh = deferred<
      Array<{
        id: string;
        title: string;
        updatedAt: string;
        lastMessageAt: string | null;
      }>
    >();
    const oldConversation = {
      id: "conversation-old",
      title: "旧会话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: "2026-09-25T00:00:00.000Z",
      messages: [],
    };
    const nextConversation = {
      id: "conversation-next",
      title: "保留会话",
      updatedAt: "2026-09-24T00:00:00.000Z",
      lastMessageAt: null,
      messages: [],
    };
    conversationMocks.listAIConversations
      .mockReset()
      .mockResolvedValueOnce([
        {
          id: oldConversation.id,
          title: oldConversation.title,
          updatedAt: oldConversation.updatedAt,
          lastMessageAt: oldConversation.lastMessageAt,
        },
        {
          id: nextConversation.id,
          title: nextConversation.title,
          updatedAt: nextConversation.updatedAt,
          lastMessageAt: nextConversation.lastMessageAt,
        },
      ])
      .mockReturnValueOnce(pendingRefresh.promise);
    conversationMocks.getAIConversation
      .mockResolvedValueOnce(oldConversation)
      .mockResolvedValueOnce(nextConversation);
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "completed" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<SessionRaceHarness />);
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-old"),
    );
    await user.click(screen.getByRole("button", { name: "send-message" }));
    await waitFor(() => expect(conversationMocks.listAIConversations).toHaveBeenCalledTimes(2));

    await user.click(screen.getByRole("button", { name: "delete-current" }));
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-next"),
    );
    expect(screen.getByTestId("conversation-list")).toHaveTextContent("conversation-next");

    pendingRefresh.resolve([
      {
        id: "conversation-old",
        title: "已删除会话",
        updatedAt: "2026-09-25T00:00:00.000Z",
        lastMessageAt: null,
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("conversation-list")).toHaveTextContent("conversation-next"),
    );
    expect(screen.getByTestId("conversation-list")).not.toHaveTextContent("conversation-old");
    expect(screen.getByTestId("session-loading")).toHaveTextContent("false");
    confirmSpy.mockRestore();
  });

  it("keeps the second refresh result when the first refresh finishes late", async () => {
    const user = userEvent.setup();
    const firstRefresh = deferred<
      Array<{
        id: string;
        title: string;
        updatedAt: string;
        lastMessageAt: string | null;
      }>
    >();
    const secondRefresh = deferred<
      Array<{
        id: string;
        title: string;
        updatedAt: string;
        lastMessageAt: string | null;
      }>
    >();
    conversationMocks.listAIConversations
      .mockReset()
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(firstRefresh.promise)
      .mockReturnValueOnce(secondRefresh.promise);
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "completed" });

    render(<SessionRaceHarness />);
    await waitFor(() => expect(screen.getByTestId("session-loading")).toHaveTextContent("false"));
    await user.click(screen.getByRole("button", { name: "send-message" }));
    await waitFor(() => expect(conversationMocks.listAIConversations).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "send-message" }));
    await waitFor(() => expect(conversationMocks.listAIConversations).toHaveBeenCalledTimes(3));

    secondRefresh.resolve([
      {
        id: "conversation-latest",
        title: "最新列表",
        updatedAt: "2026-09-25T00:02:00.000Z",
        lastMessageAt: null,
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("conversation-list")).toHaveTextContent("conversation-latest"),
    );

    firstRefresh.resolve([
      {
        id: "conversation-stale",
        title: "迟到列表",
        updatedAt: "2026-09-25T00:01:00.000Z",
        lastMessageAt: null,
      },
    ]);
    await waitFor(() =>
      expect(screen.getByTestId("conversation-list")).toHaveTextContent("conversation-latest"),
    );
    expect(screen.getByTestId("conversation-list")).not.toHaveTextContent("conversation-stale");
  });

  it("invalidates the current session while deleting it and loads the next session", async () => {
    const user = userEvent.setup();
    const pendingDelete = deferred<void>();
    const pendingNextLoad = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
      messages: Array<{
        id: string;
        role: "assistant";
        content: string;
        timestamp: string;
      }>;
    }>();
    const oldConversation = {
      id: "conversation-old",
      title: "旧会话",
      updatedAt: "2026-09-21T00:00:00.000Z",
      lastMessageAt: "2026-09-21T00:00:00.000Z",
      messages: [],
    };
    conversationMocks.listAIConversations.mockResolvedValue([
      {
        id: oldConversation.id,
        title: oldConversation.title,
        updatedAt: oldConversation.updatedAt,
        lastMessageAt: oldConversation.lastMessageAt,
      },
      {
        id: "conversation-next",
        title: "目标会话",
        updatedAt: "2026-09-20T00:00:00.000Z",
        lastMessageAt: null,
      },
    ]);
    conversationMocks.getAIConversation
      .mockResolvedValueOnce(oldConversation)
      .mockReturnValueOnce(pendingNextLoad.promise);
    conversationMocks.deleteAIConversation.mockReturnValueOnce(pendingDelete.promise);
    serviceMocks.streamChatMessage.mockResolvedValue({ kind: "cancelled" });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("conversation-old"));
    await user.type(screen.getByRole("textbox"), "不应发送到已删除会话");
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByTitle("发送")).toBeDisabled();
    const form = screen.getByRole("textbox").closest("form");
    if (!form) throw new Error("AI chat form is unavailable.");
    fireEvent.submit(form);
    expect(serviceMocks.streamChatMessage).not.toHaveBeenCalled();

    pendingDelete.resolve();
    await waitFor(() =>
      expect(conversationMocks.getAIConversation).toHaveBeenCalledWith("conversation-next"),
    );
    expect(screen.getByRole("combobox")).toBeDisabled();

    pendingNextLoad.resolve({
      id: "conversation-next",
      title: "目标会话",
      updatedAt: "2026-09-20T00:00:00.000Z",
      lastMessageAt: null,
      messages: [
        {
          id: "next-message",
          role: "assistant",
          content: "目标会话已加载",
          timestamp: "2026-09-20T00:00:00.000Z",
        },
      ],
    });
    await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("conversation-next"));
    expect(screen.getByRole("combobox")).not.toBeDisabled();
    expect(screen.getByText("目标会话已加载")).toBeInTheDocument();
    expect(screen.queryByText("正在加载…")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("clears the old session before a failed history reload", async () => {
    const user = userEvent.setup();
    const oldConversation = {
      id: "conversation-old",
      title: "旧会话",
      updatedAt: "2026-09-21T00:00:00.000Z",
      lastMessageAt: "2026-09-21T00:00:00.000Z",
      messages: [
        {
          id: "old-message",
          role: "assistant" as const,
          content: "旧会话消息",
          timestamp: "2026-09-21T00:00:00.000Z",
          isComplete: true,
        },
      ],
    };
    conversationMocks.listAIConversations
      .mockResolvedValueOnce([
        {
          id: oldConversation.id,
          title: oldConversation.title,
          updatedAt: oldConversation.updatedAt,
          lastMessageAt: oldConversation.lastMessageAt,
        },
      ])
      .mockRejectedValueOnce(new Error("history unavailable"));
    conversationMocks.getAIConversation.mockResolvedValueOnce(oldConversation);
    conversationMocks.createAIConversation.mockResolvedValueOnce({
      id: "conversation-created-after-reload-failure",
      title: "新发送会话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
    });
    let sentConversationId: string | undefined;
    serviceMocks.streamChatMessage.mockImplementation((request: { conversationId: string }) => {
      sentConversationId = request.conversationId;
      return Promise.resolve({ kind: "failed", message: "测试失败" });
    });

    renderWithAppState();
    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await waitFor(() => expect(screen.getByText("旧会话消息")).toBeInTheDocument());
    await user.type(screen.getByRole("textbox"), "重新发送");
    await user.click(screen.getByRole("button", { name: "关闭 AI 助手" }));
    await user.click(screen.getByRole("button", { name: "open-ai" }));

    expect(await screen.findByText(/无法加载历史会话，请重试/)).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("");
    expect(screen.queryByText("旧会话消息")).not.toBeInTheDocument();
    expect(screen.getByRole("combobox")).not.toBeDisabled();

    await user.click(screen.getByTitle("发送"));
    await waitFor(() =>
      expect(sentConversationId).toBe("conversation-created-after-reload-failure"),
    );
  });

  it("does not let a pending load overwrite a newly created conversation", async () => {
    const user = userEvent.setup();
    const pendingLoad = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
      messages: Array<{
        id: string;
        role: "assistant";
        content: string;
        timestamp: string;
      }>;
    }>();
    const pendingCreate = deferred<{
      id: string;
      title: string;
      updatedAt: string;
      lastMessageAt: string | null;
    }>();
    const oldConversation = {
      id: "conversation-old",
      title: "旧会话",
      updatedAt: "2026-09-21T00:00:00.000Z",
      lastMessageAt: "2026-09-21T00:00:00.000Z",
      messages: [],
    };
    conversationMocks.listAIConversations.mockResolvedValue([
      {
        id: oldConversation.id,
        title: oldConversation.title,
        updatedAt: oldConversation.updatedAt,
        lastMessageAt: oldConversation.lastMessageAt,
      },
      {
        id: "conversation-next",
        title: "目标会话",
        updatedAt: "2026-09-20T00:00:00.000Z",
        lastMessageAt: null,
      },
    ]);
    conversationMocks.getAIConversation
      .mockResolvedValueOnce(oldConversation)
      .mockReturnValueOnce(pendingLoad.promise);
    conversationMocks.createAIConversation.mockReturnValueOnce(pendingCreate.promise);

    render(<SessionRaceHarness />);
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-old"),
    );
    await user.click(screen.getByRole("button", { name: "select-next" }));
    await user.click(screen.getByRole("button", { name: "new-conversation" }));

    pendingCreate.resolve({
      id: "conversation-created",
      title: "新对话",
      updatedAt: "2026-09-25T00:00:00.000Z",
      lastMessageAt: null,
    });
    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-created"),
    );

    pendingLoad.resolve({
      id: "conversation-next",
      title: "目标会话",
      updatedAt: "2026-09-20T00:00:00.000Z",
      lastMessageAt: null,
      messages: [
        {
          id: "stale-message",
          role: "assistant",
          content: "不应覆盖新会话",
          timestamp: "2026-09-20T00:00:00.000Z",
        },
      ],
    });

    await waitFor(() =>
      expect(screen.getByTestId("session-id")).toHaveTextContent("conversation-created"),
    );
    expect(screen.queryByText("不应覆盖新会话")).not.toBeInTheDocument();
  });
});
