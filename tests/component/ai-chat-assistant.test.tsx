/** 验证 AI 聊天助手的流式交互、状态展示和错误处理。 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AIStreamOutcome, StreamChatOptions } from "../../src/services/ai/aiAssistantService";
import AIChatAssistant from "../../src/components/AIChatAssistant";
import { UIStateProvider, useUIState } from "../../src/state/UIStateContext";

const serviceMocks = vi.hoisted(() => ({
  streamChatMessage: vi.fn(),
}));

vi.mock("../../src/services/ai/aiAssistantService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/services/ai/aiAssistantService")>()),
  streamChatMessage: serviceMocks.streamChatMessage,
}));

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

describe("AIChatAssistant", () => {
  beforeEach(() => {
    serviceMocks.streamChatMessage.mockReset();
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
});
