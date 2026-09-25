/** 验证错误边界捕获渲染异常并展示可恢复的中文界面。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "../../src/components/ErrorBoundary";
import { getErrorBoundaryDisplay } from "../../src/utils/errorBoundaryDisplay";

function BrokenView(): React.JSX.Element {
  throw new Error("render failed");
}

describe("ErrorBoundary", () => {
  it("显示中文错误恢复界面", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("heading", { name: "页面出现错误" })).toBeInTheDocument();
    expect(screen.getByText("错误详情")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });

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
