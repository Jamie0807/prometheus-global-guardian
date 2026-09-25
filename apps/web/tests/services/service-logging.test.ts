/** 验证共享日志记录器的配置回退和级别过滤。 */
import { describe, expect, it, vi } from "vitest";
import { createLogger, resolveLogLevel } from "@pgg/logging";

describe("logging", () => {
  it("uses the fallback level for an invalid configuration", () => {
    expect(resolveLogLevel("verbose", "warn")).toBe("warn");
  });

  it("only emits messages at or above the configured threshold", () => {
    const sink = vi.fn();
    const logger = createLogger({ module: "test", level: "warn", sink });

    logger.debug("debug_event");
    logger.info("info_event");
    logger.warn("warning_event", { status: 429 });
    logger.error("failure_event", { code: "UPSTREAM_FAILED" });

    expect(sink).toHaveBeenCalledTimes(2);
    expect(sink).toHaveBeenNthCalledWith(1, {
      level: "warn",
      module: "test",
      event: "warning_event",
      context: { status: 429 },
    });
  });

  it("removes secrets, response bodies, and error details from context", () => {
    const sink = vi.fn();
    const logger = createLogger({ module: "test", level: "debug", sink });

    logger.error("request_failed", {
      requestId: "request-123",
      status: 502,
      authorization: "Bearer secret",
      responseBody: "private upstream response",
      error: new Error("private error"),
      nested: { token: "private" },
    });

    expect(sink).toHaveBeenCalledWith({
      level: "error",
      module: "test",
      event: "request_failed",
      context: { requestId: "request-123", status: 502 },
    });
  });
});
