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

vi.mock("../../src/services/hazards/hazardService", () => ({
  fetchHazardTypes: serviceMocks.fetchHazardTypes,
}));

vi.mock("../../src/services/analytics/analyticsService", () => ({
  checkHealth: serviceMocks.checkHealth,
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
  });

  it("loads displayed hazard types and disables the filter while loading", async () => {
    const deferredHazardTypes = createDeferred<HazardType[]>();
    serviceMocks.fetchHazardTypes.mockReturnValueOnce(deferredHazardTypes.promise);

    render(
      <StatusPanel filter="ALL" onFilterChange={vi.fn()} onRefresh={vi.fn()} totalCount={3} />,
    );

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

  it("notifies the parent when the selected hazard type changes", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel filter="ALL" onFilterChange={onFilterChange} onRefresh={vi.fn()} />);

    await screen.findByRole("option", { name: "Flood" });
    await user.selectOptions(screen.getByLabelText("Filter by Type"), "FLOOD");

    expect(onFilterChange).toHaveBeenCalledWith("FLOOD");
  });

  it("notifies the parent when Refresh Data is clicked", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    serviceMocks.fetchHazardTypes.mockResolvedValue(hazardTypes);

    render(<StatusPanel filter="ALL" onFilterChange={vi.fn()} onRefresh={onRefresh} />);

    await user.click(screen.getByRole("button", { name: "Refresh Data" }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
