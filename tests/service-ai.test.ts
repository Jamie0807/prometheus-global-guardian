import { afterEach, describe, expect, it, vi } from "vitest";
import { streamChatMessage, type ChatMessage } from "../src/services/ai/aiAssistantService";

const messages: readonly ChatMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "请分析当前地震风险",
    timestamp: "2026-09-03T00:00:00.000Z",
  },
];

function sseResponse(body: string | Uint8Array[]) {
  const chunks = typeof body === "string" ? [new TextEncoder().encode(body)] : body;
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    }),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

function mockResponse(response: Response) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
}

function demoResponse(code: string) {
  return new Response(JSON.stringify({ code, message: "未配置模型" }), { status: 503 });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("AI 助手 Service", () => {
  it("发送统一请求并解析 SSE 增量", async () => {
    const response = sseResponse(
      'data: {"choices":[{"delta":{"content":"风险"}}]}\n\n' +
        'data: {"choices":[{"delta":{"content":"分析"}}]}\n\ndata: [DONE]\n\n',
    );
    mockResponse(response);
    const controller = new AbortController();
    const chunks: string[] = [];
    await expect(
      streamChatMessage(messages, undefined, {
        signal: controller.signal,
        onChunk: (chunk) => chunks.push(chunk),
      }),
    ).resolves.toEqual({ kind: "completed" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/ai/chat",
      expect.objectContaining({
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ messages, disasterContext: null }),
      }),
    );
    expect(chunks).toEqual(["风险", "分析"]);
    expect(response.body?.locked).toBe(false);
  });

  it("取消正在等待的读取并释放 reader", async () => {
    const controller = new AbortController();
    const cancel = vi.fn();
    const response = new Response(new ReadableStream<Uint8Array>({ cancel }));
    mockResponse(response);
    const onChunk = vi.fn();
    const pending = streamChatMessage(messages, undefined, { signal: controller.signal, onChunk });
    await Promise.resolve();
    expect(response.body?.locked).toBe(true);
    controller.abort();
    await expect(pending).resolves.toEqual({ kind: "cancelled" });
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("EOF 缺少 DONE 标记时失败并保留已有增量", async () => {
    const response = sseResponse('data: {"choices":[{"delta":{"content":"半段"}}]}\n');
    mockResponse(response);
    const onChunk = vi.fn();
    await expect(streamChatMessage(messages, undefined, { onChunk })).resolves.toEqual({
      kind: "failed",
      message: "AI 响应流意外中断，请重试。",
    });
    expect(onChunk).toHaveBeenCalledWith("半段");
    expect(response.body?.locked).toBe(false);
  });

  it.each([
    [
      "CRLF、注释心跳与多行 data",
      ': heartbeat\r\n\r\ndata: {"choices":\r\ndata: [{"delta":{"content":"中文"}}]}\r\n\r\ndata:[DONE]\r\n\r\n',
    ],
    ["末尾无换行的 DONE", 'data: {"choices":[{"delta":{"content":"中文"}}]}\n\ndata: [DONE]'],
    [
      "DONE 后忽略附加数据",
      'data: {"choices":[{"delta":{"content":"中文"}}]}\n\ndata: [DONE]\n\ndata: malformed\n\ndata: {"choices":[{"delta":{"content":"忽略"}}]}\n\n',
    ],
  ])("解析 %s", async (_name, body) => {
    mockResponse(sseResponse(body));
    const onChunk = vi.fn();
    await expect(streamChatMessage(messages, undefined, { onChunk })).resolves.toEqual({
      kind: "completed",
    });
    expect(onChunk).toHaveBeenCalledExactlyOnceWith("中文");
  });

  it("跨任意字节分割解码 UTF-8 中文、JSON 与 CRLF", async () => {
    const bytes = new TextEncoder().encode(
      'data: {"choices":[{"delta":{"content":"风险中文"}}]}\r\n\r\ndata: [DONE]\r\n\r\n',
    );
    mockResponse(sseResponse(Array.from(bytes, (byte) => new Uint8Array([byte]))));
    const onChunk = vi.fn();
    await expect(streamChatMessage(messages, undefined, { onChunk })).resolves.toEqual({
      kind: "completed",
    });
    expect(onChunk).toHaveBeenCalledExactlyOnceWith("风险中文");
  });

  it.each([
    ["损坏的 JSON", "data: provider-secret-malformed\n\n"],
    ["error 事件", 'event: error\ndata: {"message":"provider-secret"}\n\n'],
    ["JSON error 对象", 'data: {"error":{"message":"provider-secret"}}\n\n'],
  ])("将 %s 转换成安全错误并取消未完成流", async (_name, body) => {
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body + "data: [DONE]\n\n"));
        },
        cancel,
      }),
    );
    mockResponse(response);
    const onChunk = vi.fn();
    const outcome = await streamChatMessage(messages, undefined, { onChunk });
    expect(outcome).toEqual({ kind: "failed", message: expect.any(String) });
    expect(JSON.stringify(outcome)).not.toContain("provider-secret");
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("无响应流时返回失败", async () => {
    mockResponse(new Response(null));
    await expect(streamChatMessage(messages, undefined, { onChunk: vi.fn() })).resolves.toEqual({
      kind: "failed",
      message: expect.any(String),
    });
  });

  it.each([
    [502, JSON.stringify({ code: "UPSTREAM_ERROR", message: "provider-secret" })],
    [500, "provider-secret"],
    [503, JSON.stringify({ code: "OTHER_ERROR", message: "provider-secret" })],
  ])("HTTP %s 失败不泄露正文、不静默降级", async (status, body) => {
    mockResponse(new Response(body, { status }));
    const onChunk = vi.fn();
    const outcome = await streamChatMessage(messages, undefined, { onChunk });
    expect(outcome).toEqual({ kind: "failed", message: expect.any(String) });
    expect(JSON.stringify(outcome)).not.toContain("provider-secret");
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("网络异常不泄露原始错误", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("provider-secret")));
    const outcome = await streamChatMessage(messages, undefined, { onChunk: vi.fn() });
    expect(outcome).toEqual({ kind: "failed", message: expect.any(String) });
    expect(JSON.stringify(outcome)).not.toContain("provider-secret");
  });

  it("预取消时不发送请求", async () => {
    const controller = new AbortController();
    controller.abort();
    vi.stubGlobal("fetch", vi.fn());
    const onChunk = vi.fn();
    await expect(
      streamChatMessage(messages, undefined, { signal: controller.signal, onChunk }),
    ).resolves.toEqual({ kind: "cancelled" });
    expect(fetch).not.toHaveBeenCalled();
    expect(onChunk).not.toHaveBeenCalled();
  });

  it("fetch 收到 AbortError 时返回取消", async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        controller.abort();
        return Promise.reject(new DOMException("provider-secret", "AbortError"));
      }),
    );
    await expect(
      streamChatMessage(messages, undefined, { signal: controller.signal, onChunk: vi.fn() }),
    ).resolves.toEqual({ kind: "cancelled" });
  });

  it.each(["AI_MODEL_MISSING", "AI_PROVIDER_NOT_CONFIGURED"])(
    "配置缺失 %s 时保留 Demo 响应",
    async (code) => {
      vi.useFakeTimers();
      mockResponse(demoResponse(code));
      const chunks: string[] = [];
      const pending = streamChatMessage(messages, undefined, {
        onChunk: (chunk) => chunks.push(chunk),
      });
      await vi.runAllTimersAsync();
      await expect(pending).resolves.toEqual({ kind: "completed" });
      expect(chunks.join("")).toContain("地震风险分析报告");
    },
  );

  it("Demo 默认欢迎语使用平台中文标题", async () => {
    vi.useFakeTimers();
    mockResponse(demoResponse("AI_MODEL_MISSING"));
    const chunks: string[] = [];
    const pending = streamChatMessage([{ ...messages[0], content: "你好" }], undefined, {
      onChunk: (chunk) => chunks.push(chunk),
    });

    await vi.runAllTimersAsync();
    await expect(pending).resolves.toEqual({ kind: "completed" });
    expect(chunks.join("")).toContain("全球灾害监控平台 AI 灾害分析助手");
    expect(chunks.join("")).not.toContain("Prometheus");
  });

  it("Demo 等待期间取消会停止输出并清理定时器", async () => {
    vi.useFakeTimers();
    mockResponse(demoResponse("AI_MODEL_MISSING"));
    const controller = new AbortController();
    const onChunk = vi.fn();
    const pending = streamChatMessage(messages, undefined, { signal: controller.signal, onChunk });
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    const emitted = onChunk.mock.calls.length;
    controller.abort();
    await expect(pending).resolves.toEqual({ kind: "cancelled" });
    await vi.runAllTimersAsync();
    expect(onChunk).toHaveBeenCalledTimes(emitted);
    expect(vi.getTimerCount()).toBe(0);
  });
});
