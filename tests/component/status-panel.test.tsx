import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HazardType } from "../../src/types";
import StatusPanel from "../../src/components/StatusPanel";

const serviceMocks = vi.hoisted(() => ({
  fetchHazardTypes: vi.fn<() => Promise<HazardType[]>>(),
  checkHealth: vi.fn<() => Promise<boolean>>(),
}));

const mapStateMocks = vi.hoisted(() => ({
  hazards: [{ id: "hazard-1" }],
  filter: "ALL",
  refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  setFilter: vi.fn<(filter: string) => void>(),
}));

vi.mock("../../src/services/hazards/hazardService", () => ({
  fetchHazardTypes: serviceMocks.fetchHazardTypes,
}));

vi.mock("../../src/services/analytics/analyticsService", () => ({
  checkHealth: serviceMocks.checkHealth,
}));

vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => mapStateMocks,
}));

const hazardTypes: HazardType[] = [
  { type_id: "FLOOD", type_name: "Flood" },
  { type_id: "EARTHQUAKE", type_name: "Earthquake" },
  { type_id: "UNSUPPORTED", type_name: "Unsupported type" },
];

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

describe("StatusPanel", () => {
  beforeEach(() => {
    serviceMocks.fetchHazardTypes.mockReset();
    serviceMocks.checkHealth.mockReset();
    serviceMocks.checkHealth.mockResolvedValue(true);
    mapStateMocks.refresh.mockReset();
    mapStateMocks.refresh.mockResolvedValue(undefined);
    mapStateMocks.setFilter.mockReset();
  });

  it("loads displayed hazard types and disables the filter while loading", async () => {
    const deferredHazardTypes = createDeferred<HazardType[]>();
    serviceMocks.fetchHazardTypes.mockReturnValueOnce(deferredHazardTypes.promise);

    render(<StatusPanel />);

    expect(screen.getByRole("heading", { name: "实时监控" })).toBeInTheDocument();
    expect(screen.getByText("实时环境灾害")).toBeInTheDocument();
    expect(screen.getByText("灾害总数")).toBeInTheDocument();
    const filter = screen.getByLabelText("按类型筛选");
    expect(filter).toBeDisabled();
    expect(screen.getByText("正在加载灾害类型...")).toBeInTheDocument();

    deferredHazardTypes.resolve(hazardTypes);

    expect(await screen.findByRole("option", { name: "洪水" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "地震" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "全部灾害" })).toHaveValue("ALL");
    expect(screen.getByRole("option", { name: "洪水" })).toHaveValue("FLOOD");
    expect(screen.queryByRole("option", { name: "Flood" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Unsupported type" })).not.toBeInTheDocument();
    await waitFor(() => expect(filter).toBeEnabled());
    expect(serviceMocks.checkHealth).toHaveBeenCalledTimes(1);
  });

  it("uses the stable English type ID when the localized type is selected", async () => {
    const user = userEvent.setup();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel />);

    await screen.findByRole("option", { name: "洪水" });
    await user.selectOptions(screen.getByLabelText("按类型筛选"), "FLOOD");

    expect(mapStateMocks.setFilter).toHaveBeenCalledWith("FLOOD");
  });

  it("refreshes the shared hazard data when 刷新数据 is clicked", async () => {
    const user = userEvent.setup();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel />);

    await user.click(screen.getByRole("button", { name: "刷新数据" }));

    expect(mapStateMocks.refresh).toHaveBeenCalledOnce();
  });
});
