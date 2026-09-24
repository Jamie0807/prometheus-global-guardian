/** 验证客户端日志级别随环境配置变化的规则。 */
import { describe, expect, it } from "vitest";
import { getClientLogLevel } from "../apps/web/src/utils/logger";

describe("client logger configuration", () => {
  it("uses warn by default for production builds", () => {
    expect(getClientLogLevel(undefined, true)).toBe("warn");
  });

  it("uses debug by default for development builds", () => {
    expect(getClientLogLevel(undefined, false)).toBe("debug");
  });
});
