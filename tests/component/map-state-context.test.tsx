import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Hazard, HazardFeedResponse } from "../../src/types";

const mapStateMocks = vi.hoisted(() => ({
  refresh: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  hazards: [] as Hazard[],
  sourceMeta: null as HazardFeedResponse["meta"] | null,
  notifyInfo: vi.fn(),
}));

vi.mock("../../src/features/map/hooks/useHazardData", () => ({
  useHazardData: () => ({
    disasters: mapStateMocks.hazards,
    sourceMeta: mapStateMocks.sourceMeta,
    refresh: mapStateMocks.refresh,
  }),
}));

vi.mock("../../src/utils/notifications", () => ({
  notify: {
    info: mapStateMocks.notifyInfo,
  },
}));

import { MapStateProvider, useMapState } from "../../src/features/map/state/MapStateContext";

function MapStateProbe() {
  const { filter, setFilter } = useMapState();

  return (
    <>
      <p>{filter}</p>
      <button type="button" onClick={() => setFilter("FLOOD")}>
        filter-flood
      </button>
    </>
  );
}

describe("MapStateContext", () => {
  beforeEach(() => {
    mapStateMocks.hazards = [];
    mapStateMocks.sourceMeta = null;
    mapStateMocks.refresh.mockClear();
    mapStateMocks.notifyInfo.mockClear();
  });

  it("throws a clear error outside MapStateProvider", () => {
    expect(() => render(<MapStateProbe />)).toThrow(
      "useMapState must be used within MapStateProvider",
    );
  });

  it("updates the shared filter", async () => {
    const user = userEvent.setup();

    render(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );

    await user.click(screen.getByRole("button", { name: "filter-flood" }));

    expect(screen.getByText("FLOOD")).toBeInTheDocument();
  });

  it("uses the existing update notification for initial and later hazard growth", async () => {
    const view = render(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );

    mapStateMocks.hazards = [{ id: "hazard-1" } as Hazard];
    view.rerender(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );

    await waitFor(() =>
      expect(mapStateMocks.notifyInfo).toHaveBeenCalledWith("数据更新", "检测到 1 条新灾害记录"),
    );

    mapStateMocks.hazards = [{ id: "hazard-1" } as Hazard, { id: "hazard-2" } as Hazard];
    view.rerender(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );

    await waitFor(() =>
      expect(mapStateMocks.notifyInfo).toHaveBeenLastCalledWith(
        "数据更新",
        "检测到 1 条新灾害记录",
      ),
    );

    mapStateMocks.hazards = [];
    view.rerender(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );
    mapStateMocks.hazards = [{ id: "hazard-3" } as Hazard];
    view.rerender(
      <MapStateProvider>
        <MapStateProbe />
      </MapStateProvider>,
    );

    await waitFor(() =>
      expect(mapStateMocks.notifyInfo).toHaveBeenLastCalledWith(
        "数据更新",
        "检测到 1 条新灾害记录",
      ),
    );
    expect(mapStateMocks.notifyInfo).toHaveBeenCalledTimes(3);
  });
});
