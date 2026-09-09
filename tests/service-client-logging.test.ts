import { describe, expect, it } from "vitest";
import { getClientLogLevel } from "../src/utils/logger";

describe("client logger configuration", () => {
  it("uses warn by default for production builds", () => {
    expect(getClientLogLevel(undefined, true)).toBe("warn");
  });

  it("uses debug by default for development builds", () => {
    expect(getClientLogLevel(undefined, false)).toBe("debug");
  });
});
