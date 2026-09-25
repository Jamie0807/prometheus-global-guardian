/** 验证 UI 状态上下文和设置界面的共享状态交互。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UIStateProvider, useUIState } from "../../src/state/UIStateContext";
import SettingsModal from "../../src/components/SettingsModal";

vi.mock("../../src/state/AuthContext", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "test-user", email: "test@example.com" },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    deleteAccount: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

const mapStateMocks = {
  mapStyle: "dark-v11",
  setMapStyle: () => undefined,
};

vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => mapStateMocks,
}));

function UIStateProbe() {
  const { activeModal, activeView, closeEscapableModal, openModal, openView } = useUIState();

  return (
    <>
      <p>{activeView}</p>
      <p>{activeModal ?? "none"}</p>
      <button type="button" onClick={() => openView("analytics")}>
        open-analytics
      </button>
      <button type="button" onClick={() => openModal("ai")}>
        open-ai
      </button>
      <button type="button" onClick={() => openModal("settings")}>
        open-settings
      </button>
      <button type="button" onClick={closeEscapableModal}>
        escape
      </button>
    </>
  );
}

function SettingsHarness() {
  const { openModal } = useUIState();

  return (
    <>
      <button type="button" onClick={() => openModal("settings")}>
        open-settings-modal
      </button>
      <SettingsModal />
    </>
  );
}

describe("UIStateContext", () => {
  it("throws a clear error outside UIStateProvider", () => {
    expect(() => render(<UIStateProbe />)).toThrow(
      "useUIState must be used within UIStateProvider",
    );
  });

  it("keeps AI open while Escape only closes escapable modals", async () => {
    const user = userEvent.setup();

    render(
      <UIStateProvider>
        <UIStateProbe />
      </UIStateProvider>,
    );

    expect(screen.getByText("map")).toBeInTheDocument();
    expect(screen.getByText("none")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "open-analytics" }));
    expect(screen.getByText("analytics")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "open-ai" }));
    await user.click(screen.getByRole("button", { name: "escape" }));
    expect(screen.getByText("ai")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "open-settings" }));
    await user.click(screen.getByRole("button", { name: "escape" }));
    expect(screen.getByText("none")).toBeInTheDocument();
  });

  it("updates the map style through the map state domain", async () => {
    const user = userEvent.setup();
    const setMapStyle = vi.fn();
    mapStateMocks.mapStyle = "dark-v11";
    mapStateMocks.setMapStyle = setMapStyle;

    render(
      <UIStateProvider>
        <SettingsHarness />
      </UIStateProvider>,
    );

    await user.click(screen.getByRole("button", { name: "open-settings-modal" }));
    await user.selectOptions(screen.getByLabelText("地图样式"), "light-v11");

    expect(setMapStyle).toHaveBeenCalledWith("light-v11");
    expect(screen.getByRole("option", { name: "浅色" })).toHaveValue("light-v11");
  });
});
