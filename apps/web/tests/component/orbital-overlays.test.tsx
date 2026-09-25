/** 验证 Orbital 地图首页的浮层可折叠且保留原有监控与图例内容。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DISPLAYED_TYPES from "../../src/config/displayedTypes";
import { HAZARD_COLORS } from "../../src/config/hazardColors";
import LegendPanel from "../../src/components/LegendPanel";
import StatusPanel from "../../src/components/StatusPanel";

const mapStateMocks = vi.hoisted(() => ({
  hazards: [{ id: "hazard-1" }, { id: "hazard-2" }],
  filter: "ALL",
  refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  setFilter: vi.fn<(filter: string) => void>(),
}));

vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => mapStateMocks,
}));

describe("Orbital map overlays", () => {
  beforeEach(() => {
    mapStateMocks.refresh.mockReset();
    mapStateMocks.refresh.mockResolvedValue(undefined);
    mapStateMocks.setFilter.mockReset();
  });

  it("lets the status panel collapse without losing monitoring controls", async () => {
    const user = userEvent.setup();
    render(<StatusPanel />);

    const panel = screen.getByRole("group", { name: "实时监控面板" });
    const summary = panel.querySelector("summary");

    expect(panel).toHaveAttribute("open");
    expect(summary).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByLabelText("按类型筛选")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "刷新数据" })).toBeInTheDocument();

    await user.click(summary as HTMLElement);
    expect(panel).not.toHaveAttribute("open");

    await user.click(summary as HTMLElement);
    expect(panel).toHaveAttribute("open");
    await user.selectOptions(screen.getByLabelText("按类型筛选"), "FLOOD");
    await user.click(screen.getByRole("button", { name: "刷新数据" }));

    expect(mapStateMocks.setFilter).toHaveBeenCalledWith("FLOOD");
    expect(mapStateMocks.refresh).toHaveBeenCalledOnce();
  });

  it("lets the hazard legend collapse while retaining every displayed type", async () => {
    const user = userEvent.setup();
    render(<LegendPanel />);

    const panel = screen.getByRole("group", { name: "灾害类型图例" });
    const summary = panel.querySelector("summary");

    expect(panel).toHaveAttribute("open");
    expect(summary).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(Object.keys(HAZARD_COLORS).length);
    for (const type of DISPLAYED_TYPES) {
      expect(screen.getByText(type.type_name)).toBeInTheDocument();
    }

    await user.click(summary as HTMLElement);
    expect(panel).not.toHaveAttribute("open");
    await user.click(summary as HTMLElement);
    expect(panel).toHaveAttribute("open");
    expect(screen.getAllByRole("listitem")).toHaveLength(Object.keys(HAZARD_COLORS).length);
  });
});
