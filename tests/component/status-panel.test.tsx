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
  { type_id: "UNSUPPORTED", type_name: "Unsupported" },
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

    const filter = screen.getByLabelText("Filter by Type");
    expect(filter).toBeDisabled();
    expect(screen.getByText("Loading hazard types...")).toBeInTheDocument();

    deferredHazardTypes.resolve(hazardTypes);

    expect(await screen.findByRole("option", { name: "Flood" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Earthquake" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Unsupported" })).not.toBeInTheDocument();
    await waitFor(() => expect(filter).toBeEnabled());
    expect(serviceMocks.checkHealth).toHaveBeenCalledTimes(1);
  });

  it("updates the shared filter when the selected hazard type changes", async () => {
    const user = userEvent.setup();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel />);

    await screen.findByRole("option", { name: "Flood" });
    await user.selectOptions(screen.getByLabelText("Filter by Type"), "FLOOD");

    expect(mapStateMocks.setFilter).toHaveBeenCalledWith("FLOOD");
  });

  it("refreshes the shared hazard data when Refresh Data is clicked", async () => {
    const user = userEvent.setup();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel />);

    await user.click(screen.getByRole("button", { name: "Refresh Data" }));

    expect(mapStateMocks.refresh).toHaveBeenCalledOnce();
  });
});
