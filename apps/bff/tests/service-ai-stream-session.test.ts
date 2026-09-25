/** 验证 AI SSE 会话的事件重放、边界和过期清理。 */
import { describe, expect, it, vi } from "vitest";
import { createAIStreamSessionRegistry, type AISessionSubscriber } from "../ai/ai-stream-session";

function subscriber() {
  const events: string[] = [];
  const ended = vi.fn();
  const value: AISessionSubscriber = {
    onEvent: (event) => events.push(event.payload),
    onEnd: ended,
  };
  return { value, events, ended };
}

describe("AI SSE 会话注册表", () => {
  it("为事件分配递增序号并只重放断点之后的事件", () => {
    const registry = createAIStreamSessionRegistry({ ttlMs: 10_000 });
    const session = registry.create("request-1", "fingerprint-1", vi.fn());
    const first = subscriber();

    expect(session.attach(0, first.value)).toMatchObject({ kind: "attached", terminal: false });
    session.publish("data: first\n\n");
    session.publish("data: second\n\n");
    expect(first.events).toEqual(["data: first\n\n", "data: second\n\n"]);

    const resumed = subscriber();
    const result = session.attach(1, resumed.value);
    expect(result).toMatchObject({ kind: "attached", terminal: false });
    expect(result.kind === "attached" ? result.replay.map((event) => event.payload) : []).toEqual([
      "data: second\n\n",
    ]);
  });

  it("完成后重放 DONE 并结束新的订阅者", () => {
    const registry = createAIStreamSessionRegistry();
    const session = registry.create("request-2", "fingerprint-2", vi.fn());
    session.publish("data: answer\n\n");
    session.publish("data: [DONE]\n\n");
    session.complete();

    const resumed = subscriber();
    const result = session.attach(0, resumed.value);
    expect(result).toMatchObject({ kind: "attached", terminal: true });
    expect(result.kind === "attached" ? result.replay.map((event) => event.payload) : []).toEqual([
      "data: answer\n\n",
      "data: [DONE]\n\n",
    ]);
    expect(resumed.ended).not.toHaveBeenCalled();
  });

  it("拒绝不同请求体指纹和超出缓存范围的续传", () => {
    const registry = createAIStreamSessionRegistry({ maxEvents: 2 });
    const session = registry.create("request-3", "fingerprint-3", vi.fn());
    session.publish("data: one\n\n");
    session.publish("data: two\n\n");
    session.publish("data: three\n\n");

    expect(registry.get("request-3", "different")).toEqual({
      kind: "fingerprint_mismatch",
    });
    expect(session.attach(0, subscriber().value)).toEqual({ kind: "resume_unavailable" });
  });

  it("即使单个事件超过字节上限并清空缓存，也拒绝续传到已淘汰的事件", () => {
    const registry = createAIStreamSessionRegistry({ maxBytes: 1 });
    const session = registry.create("request-oversized", "fingerprint", vi.fn());
    session.publish("data: event\n\n");

    expect(session.attach(0, subscriber().value)).toEqual({ kind: "resume_unavailable" });
  });

  it("拒绝超前于最新事件序号的续传游标", () => {
    const registry = createAIStreamSessionRegistry();
    const session = registry.create("request-future-cursor", "fingerprint", vi.fn());
    session.publish("data: current\n\n");

    expect(session.attach(2, subscriber().value)).toEqual({ kind: "resume_unavailable" });
  });

  it("活跃订阅期间不应用续传 TTL，最后一个订阅者离开后才过期", () => {
    vi.useFakeTimers();
    try {
      const abort = vi.fn();
      const registry = createAIStreamSessionRegistry({ ttlMs: 25 });
      const session = registry.create("request-active", "fingerprint", abort);
      const attached = session.attach(0, subscriber().value);
      expect(attached.kind).toBe("attached");

      vi.advanceTimersByTime(26);
      expect(abort).not.toHaveBeenCalled();
      expect(registry.get("request-active", "fingerprint").kind).toBe("found");

      if (attached.kind === "attached") attached.detach();
      vi.advanceTimersByTime(26);

      expect(abort).toHaveBeenCalledOnce();
      expect(registry.get("request-active", "fingerprint")).toEqual({ kind: "missing" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("终态会话从完成时开始保留续传窗口", () => {
    vi.useFakeTimers();
    try {
      const abort = vi.fn();
      const registry = createAIStreamSessionRegistry({ ttlMs: 25 });
      const session = registry.create("request-complete", "fingerprint", abort);

      vi.advanceTimersByTime(20);
      session.complete();
      vi.advanceTimersByTime(20);

      expect(abort).not.toHaveBeenCalled();
      expect(registry.get("request-complete", "fingerprint").kind).toBe("found");

      vi.advanceTimersByTime(6);
      expect(abort).toHaveBeenCalledOnce();
      expect(registry.get("request-complete", "fingerprint")).toEqual({ kind: "missing" });
    } finally {
      vi.useRealTimers();
    }
  });
});
