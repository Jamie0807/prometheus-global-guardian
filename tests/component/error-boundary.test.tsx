import { describe, expect, it } from "vitest";
import { getErrorBoundaryDisplay } from "../../src/utils/errorBoundaryDisplay";

describe("ErrorBoundary", () => {
  it("does not expose an original exception or component stack in production", () => {
    const display = getErrorBoundaryDisplay(
      new Error("database password leaked"),
      "at InternalDashboard (/private/app.tsx:1:1)",
      true,
    );

    expect(display.message).not.toContain("database password leaked");
    expect(display.details).toBeNull();
  });
});
