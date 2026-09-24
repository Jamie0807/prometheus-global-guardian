/** 验证状态面板的灾害概览、筛选和刷新交互。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StatusPanel from "../../apps/web/src/components/StatusPanel";
import DISPLAYED_TYPES from "../../apps/web/src/config/displayedTypes";

const mapStateMocks = vi.hoisted(() => ({
  hazards: [{ id: "hazard-1" }],
  filter: "ALL",
  refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  setFilter: vi.fn<(filter: string) => void>(),
}));

vi.mock("../../apps/web/src/features/map/state/MapStateContext", () => ({
  useMapState: () => mapStateMocks,
}));

describe("StatusPanel", () => {
  beforeEach(() => {
    mapStateMocks.refresh.mockReset();
    mapStateMocks.refresh.mockResolvedValue(undefined);
    mapStateMocks.setFilter.mockReset();
  });

  it("immediately provides every supported localized hazard type", () => {
    render(<StatusPanel />);

    expect(screen.getByRole("heading", { name: "实时监控" })).toBeInTheDocument();
    expect(screen.getByText("实时监测全球环境灾害动态")).toBeInTheDocument();
    expect(screen.getByText("灾害总数")).toBeInTheDocument();
    const filter = screen.getByLabelText("按类型筛选");
    expect(filter).toBeEnabled();
    expect(filter).toHaveClass("form-input");
    expect(filter.parentElement).toHaveClass("status-filter-control");
    expect(filter.parentElement?.querySelector(".status-filter-chevron")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getAllByRole("option")).toHaveLength(DISPLAYED_TYPES.length + 1);
    expect(screen.getByRole("option", { name: "洪水" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "地震" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "全部灾害" })).toHaveValue("ALL");
    expect(screen.getByRole("option", { name: "洪水" })).toHaveValue("FLOOD");
    expect(screen.queryByText("正在加载灾害类型...")).not.toBeInTheDocument();
  });

  it("uses the stable English type ID when the localized type is selected", async () => {
    const user = userEvent.setup();
    render(<StatusPanel />);

    await user.selectOptions(screen.getByLabelText("按类型筛选"), "FLOOD");

    expect(mapStateMocks.setFilter).toHaveBeenCalledWith("FLOOD");
  });

  it("refreshes the shared hazard data when 刷新数据 is clicked", async () => {
    const user = userEvent.setup();
    render(<StatusPanel />);

    await user.click(screen.getByRole("button", { name: "刷新数据" }));

    expect(mapStateMocks.refresh).toHaveBeenCalledOnce();
  });
});
