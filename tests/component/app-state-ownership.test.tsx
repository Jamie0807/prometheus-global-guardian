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
          关闭数据分析
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
    useUIState().activeModal === "settings" ? <div>地图设置</div> : null;

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

    await user.click(screen.getByRole("button", { name: "打开数据分析面板" }));
    expect(await screen.findByTestId("analytics-hazard-count")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: "关闭数据分析" }));
    expect(await screen.findByTestId("map-hazard-count")).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "打开保存报告弹窗" }));
    const reportName = await screen.findByPlaceholderText("例如：2026 年 9 月全球灾害评估");
    expect(screen.getByText(/HTML 文件/)).toBeInTheDocument();
    await user.type(reportName, "9 月灾害报告");
    await user.click(screen.getByRole("button", { name: "取消" }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText("例如：2026 年 9 月全球灾害评估")).toBeNull(),
    );

    await user.click(screen.getByRole("button", { name: "打开保存报告弹窗" }));
    expect(await screen.findByPlaceholderText("例如：2026 年 9 月全球灾害评估")).toHaveValue(
      "9 月灾害报告",
    );
    await user.click(screen.getByRole("button", { name: "下载报告" }));
    expect(download).toHaveBeenCalledOnce();
    expect(download.mock.instances[0]?.download).toMatch(/^9_月灾害报告_\d+\.html$/);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloadedParts?.join("")).toContain("<!doctype html>");
    expect(downloadedParts?.join("")).toContain("Test flood");

    await user.click(screen.getByRole("button", { name: "打开设置弹窗" }));
    expect(await screen.findByText("地图设置")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开 AI 灾害分析助手" }));
    expect(await screen.findByTestId("ai-hazard-count")).toHaveTextContent("1");
  });
});
