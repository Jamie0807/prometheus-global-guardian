import { describe, expect, it, vi } from "vitest";
import { createLogger, resolveLogLevel } from "../src/index.js";

describe("@pgg/logging", () => {
  it("normalizes log levels and falls back for unknown values", () => {
    expect(resolveLogLevel(" warning ", "debug")).toBe("warn");
    expect(resolveLogLevel("verbose", "warn")).toBe("warn");
  });

  it("filters sensitive and non-primitive context before sending a record to the sink", () => {
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

  it("injects a sink and stays silent at the silent threshold", () => {
    const sink = vi.fn();
    const logger = createLogger({ module: "test", level: "silent", sink });

    logger.debug("debug_event");
    logger.info("info_event");
    logger.warn("warning_event");
    logger.error("failure_event");

    expect(sink).not.toHaveBeenCalled();
  });
});
