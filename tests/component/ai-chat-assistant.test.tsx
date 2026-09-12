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
