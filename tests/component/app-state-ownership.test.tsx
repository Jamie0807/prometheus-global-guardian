import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const appMocks = vi.hoisted(() => ({
  authorize: vi.fn().mockResolvedValue(undefined),
  hazards: [
    {
      id: "hazard-1",
      title: "Test flood",
      type: "FLOOD",
      geometry: { type: "Point", coordinates: [120, 30] },
      description: "Test event",
      source: "test",
    },
  ],
}));

vi.mock("../../src/services/auth/authService", () => ({
  authorize: appMocks.authorize,
}));

vi.mock("../../src/features/map/hooks/useHazardData", () => ({
  useHazardData: () => ({
    disasters: appMocks.hazards,
    sourceMeta: null,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("../../src/utils/notifications", () => ({
  notify: {
    info: vi.fn(),
  },
}));

vi.mock("../../src/components/NotificationCenter", () => ({
  default: () => null,
}));

vi.mock("../../src/components/StatusPanel", () => ({
  default: () => <div>status-panel</div>,
}));

vi.mock("../../src/components/LegendPanel", () => ({
  default: () => <div>legend-panel</div>,
}));

vi.mock("../../src/features/map/MapView", async () => {
  const { useMapState } = await import("../../src/features/map/state/MapStateContext");
  const MapViewMock = () => (
    <div data-testid="map-hazard-count">{useMapState().hazards.length}</div>
  );

  return {
    default: MapViewMock,
  };
});

vi.mock("../../src/components/AnalyticsPage", async () => {
  const { useMapState } = await import("../../src/features/map/state/MapStateContext");
  const { useUIState } = await import("../../src/state/UIStateContext");
  const AnalyticsPageMock = () => {
    const { closeView } = useUIState();
    return (
      <section>
        <div data-testid="analytics-hazard-count">{useMapState().hazards.length}</div>
        <button type="button" onClick={closeView}>
          Close Analytics
        </button>
      </section>
    );
  };

  return {
    default: AnalyticsPageMock,
  };
});

vi.mock("../../src/components/SettingsModal", async () => {
  const { useUIState } = await import("../../src/state/UIStateContext");
  const SettingsModalMock = () =>
    useUIState().activeModal === "settings" ? <div>Map Settings</div> : null;

  return {
    default: SettingsModalMock,
  };
});

vi.mock("../../src/components/AIChatAssistant", async () => {
  const { useMapState } = await import("../../src/features/map/state/MapStateContext");
  const { useUIState } = await import("../../src/state/UIStateContext");
  const AIChatAssistantMock = () => {
    const { hazards } = useMapState();
    const { activeModal } = useUIState();
    return activeModal === "ai" ? <div data-testid="ai-hazard-count">{hazards.length}</div> : null;
  };

  return {
    default: AIChatAssistantMock,
  };
});

import App from "../../src/App";

describe("App state ownership", () => {
  it("provides one hazard domain to map, analytics, report, and AI consumers", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => "blob:report");
    let downloadedParts: BlobPart[] | undefined;
    class BlobStub {
      constructor(parts: BlobPart[]) {
        downloadedParts = parts;
      }
    }
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal("Blob", BlobStub);
    const download = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    render(<App />);

    expect(screen.getByTestId("map-hazard-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Open Analytics Dashboard" }));
    expect(await screen.findByTestId("analytics-hazard-count")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "Close Analytics" }));
    expect(await screen.findByTestId("map-hazard-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Open Save Report Modal" }));
    const reportName = await screen.findByPlaceholderText("e.g., October 2025 Global Assessment");
    await user.type(reportName, "September report");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("e.g., October 2025 Global Assessment")).toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "Open Save Report Modal" }));
    expect(await screen.findByPlaceholderText("e.g., October 2025 Global Assessment")).toHaveValue(
      "September report",
    );
    await user.click(screen.getByRole("button", { name: "Download Report" }));
    expect(download).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloadedParts?.join("")).toContain('"id": "hazard-1"');

    await user.click(screen.getByRole("button", { name: "Open Settings Modal" }));
    expect(await screen.findByText("Map Settings")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open AI Disaster Analysis Assistant" }));
    expect(await screen.findByTestId("ai-hazard-count")).toHaveTextContent("1");
  });
});
