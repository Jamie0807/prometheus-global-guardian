/** 验证 HTTP 服务客户端的 JSON、文本和流式请求处理。 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { requestJson, requestStream, requestText } from "../src/services/http/httpClient";
import { ServiceError } from "../src/services/http/serviceError";

describe("HTTP service client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses successful JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );

    const payload: unknown = await requestJson("/api/test");

    expect(isOkPayload(payload) && payload.ok).toBe(true);
  });

  it("returns successful text and stream responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response("data: hello\n\n", {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          }),
        ),
      ),
    );

    await expect(requestText("/api/test")).resolves.toBe("data: hello\n\n");
    const streamResponse = await requestStream("/api/test");
    await expect(streamResponse.text()).resolves.toBe("data: hello\n\n");
  });

  it("converts non-2xx responses to ServiceError with status and body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("upstream failed", { status: 503, statusText: "Unavailable" }),
        ),
    );

    await expect(requestText("/api/test")).rejects.toMatchObject<ServiceError>({
      code: "http",
      status: 503,
      responseBody: "upstream failed",
    });
  });

  it("converts malformed JSON responses to invalid_json", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 200 })));

    await expect(requestJson("/api/test")).rejects.toMatchObject<ServiceError>({
      code: "invalid_json",
    });
  });

  it("converts aborts into timeout errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_input, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            });
          }),
      ),
    );

    await expect(
      requestText("/api/test", undefined, { timeoutMs: 1 }),
    ).rejects.toMatchObject<ServiceError>({
      code: "timeout",
    });
  });

  it("passes caller aborts through without retrying or classifying them as timeouts", async () => {
    const fetchMock = vi.fn().mockImplementation(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new DOMException("Request aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const request = requestText("/api/test", { signal: controller.signal }, { retries: 2 });

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops a scheduled retry when the caller aborts", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const request = requestText("/api/test", { signal: controller.signal }, { retries: 2 });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries retryable failures up to the configured total attempts", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const payload: unknown = await requestJson("/api/test", undefined, { retries: 2 });

    expect(isOkPayload(payload) && payload.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable client errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      requestText("/api/test", undefined, { retries: 3 }),
    ).rejects.toMatchObject<ServiceError>({
      status: 400,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

function isOkPayload(value: unknown): value is { ok: true } {
  return typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === true;
}
