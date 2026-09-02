import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChatMessage, type ChatMessage } from "../src/services/ai/aiAssistantService";

const messages: ChatMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "请分析当前地震风险",
    timestamp: "2026-09-03T00:00:00.000Z",
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("AI 助手 Service", () => {
  it("发送统一请求并解析 SSE 增量", async () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"风险"}}]}\n',
      'data: {"choices":[{"delta":{"content":"分析"}}]}\n',
      "data: [DONE]\n",
    ].join("");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
        ),
    );

    const chunks: string[] = [];
    const onDone = vi.fn();
    const onError = vi.fn();
    await streamChatMessage(messages, undefined, (chunk) => chunks.push(chunk), onDone, onError);

    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ messages, disasterContext: null }),
      }),
    );
    expect(chunks).toEqual(["风险", "分析"]);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("跳过格式异常的 SSE 行并在无响应流时报告错误", async () => {
    const body = ["data: malformed\n", 'data: {"choices":[{"delta":{}}]}\n'].join("");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { status: 200 })));

    const onDone = vi.fn();
    const onError = vi.fn();
    await streamChatMessage(messages, undefined, vi.fn(), onDone, onError);

    expect(onDone).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    await streamChatMessage(messages, undefined, vi.fn(), onDone, onError);
    expect(onError).toHaveBeenCalledWith("无法读取响应流");
  });

  it("保留非 Demo 错误，不把普通服务失败静默降级", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "UPSTREAM_ERROR", message: "上游不可用" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const onError = vi.fn();
    await streamChatMessage(messages, undefined, vi.fn(), vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith("AI BFF 请求失败 (502): 上游不可用");
  });

  it("在 BFF 未配置模型时使用 Demo 响应", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "AI_MODEL_MISSING", message: "未配置模型" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const chunks: string[] = [];
    const onDone = vi.fn();
    const promise = streamChatMessage(
      messages,
      undefined,
      (chunk) => chunks.push(chunk),
      onDone,
      vi.fn(),
    );
    await vi.runAllTimersAsync();
    await promise;

    expect(chunks.join("")).toContain("地震风险分析报告");
    expect(onDone).toHaveBeenCalledOnce();
  });
});
