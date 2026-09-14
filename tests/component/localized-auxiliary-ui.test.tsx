import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChartCustomizationModal, {
  type ChartSettings,
} from "../../src/components/ChartCustomizationModal";
import ChartDrilldownModal from "../../src/components/ChartDrilldownModal";
import CustomChartTooltip from "../../src/components/CustomChartTooltip";
import MapError from "../../src/components/MapError";
import NotificationCenter from "../../src/components/NotificationCenter";
import type { Hazard } from "../../src/types";
import { exportToCSV } from "../../src/utils/dataExport";
import { notificationManager } from "../../src/utils/notifications";

const chartSettings: ChartSettings = {
  colorScheme: "default",
  customColors: {
    earthquake: "#ef4444",
    volcano: "#f97316",
    storm: "#3b82f6",
    flood: "#06b6d4",
    wildfire: "#dc2626",
  },
  chartStyle: "smooth",
  gridLines: true,
  animations: true,
  fontSize: "medium",
};

const hazard: Hazard = {
  id: "hazard-1",
  title: "示例洪水",
  type: "FLOOD",
  geometry: { type: "Point", coordinates: [120, 30] },
  description: "示例描述",
  source: "",
  timestamp: "invalid-date",
};

afterEach(() => {
  notificationManager.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("辅助界面的中文可见文案", () => {
  it("在图表定制弹窗中显示中文展示名称，同时保留内部设置值", () => {
    render(
      <ChartCustomizationModal
        isOpen
        onClose={vi.fn()}
        onSave={vi.fn()}
        currentSettings={chartSettings}
      />,
    );

    expect(screen.getByRole("heading", { name: "图表定制" })).toBeInTheDocument();
    expect(screen.getByText("个性化配置数据分析面板")).toBeInTheDocument();
    expect(screen.getByText("配色方案")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "默认" })).toBeInTheDocument();
    expect(screen.getByText("图表样式")).toBeInTheDocument();
    expect(screen.getByText("显示选项")).toBeInTheDocument();
    expect(screen.getByText("字体大小")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存设置" })).toBeInTheDocument();
  });

  it("在图表下钻和提示中显示中文回退与辅助文案", () => {
    render(
      <>
        <ChartDrilldownModal
          isOpen
          onClose={vi.fn()}
          title="洪水详情"
          filteredHazards={[hazard]}
          drilldownType="type"
          drilldownValue="FLOOD"
        />
        <CustomChartTooltip
          active
          payload={
            [
              {
                payload: {
                  type: "FLOOD",
                  severity: "Moderate",
                  source: "USGS",
                  count: 3,
                  percentage: 40,
                  color: "#60a5fa",
                },
                value: 3,
              },
            ] as never
          }
          chartType="type"
          totalHazards={8}
        />
      </>,
    );

    expect(screen.getAllByText("未知")).toHaveLength(3);
    expect(screen.getByText("占比：")).toBeInTheDocument();
    expect(screen.getByText("灾害总数：")).toBeInTheDocument();
    expect(screen.getByText("相对影响：")).toBeInTheDocument();
    expect(screen.getByText(/点击查看详情/)).toBeInTheDocument();
  });

  it("用中文说明地图配置修复步骤", () => {
    render(<MapError error="Mapbox token missing" />);

    expect(screen.getByRole("heading", { name: "地图配置错误" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "快速修复" })).toBeInTheDocument();
    expect(screen.getByText(/应用会继续从公开数据源加载灾害数据/)).toBeInTheDocument();
  });
});

describe("中文下载与通知输出", () => {
  it("导出 CSV 时使用中文默认文件名、列头和未知值回退", () => {
    let blobParts: BlobPart[] = [];
    class BlobStub {
      constructor(parts: BlobPart[]) {
        blobParts = parts;
      }
    }
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    vi.stubGlobal("Blob", BlobStub);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:csv") });

    exportToCSV([{ ...hazard, severity: undefined }]);

    expect(blobParts.join("")).toContain(
      "编号,类型,标题,严重程度,暴露人口,来源,日期,纬度,经度,说明",
    );
    expect(blobParts.join("")).toContain("未知");
    expect(click).toHaveBeenCalledOnce();
    expect(click.mock.instances[0]?.download).toBe("灾害数据.csv");
  });

  it("浏览器通知不再使用旧 Logo", () => {
    const notification = vi.fn();
    class NotificationStub {
      static permission = "granted";

      constructor(title: string, options: NotificationOptions) {
        notification(title, options);
      }
    }
    vi.stubGlobal("Notification", NotificationStub);

    notificationManager.add("info", "数据已更新", "已获取最新灾害数据");

    expect(notification).toHaveBeenCalledWith("数据已更新", { body: "已获取最新灾害数据" });
  });

  it("为通知删除操作提供中文无障碍名称", async () => {
    const user = userEvent.setup();
    render(<NotificationCenter />);
    notificationManager.add("info", "数据已更新", "已获取最新灾害数据");

    await user.click(screen.getByRole("button", { name: /通知/ }));

    expect(screen.getByRole("button", { name: "删除通知" })).toBeInTheDocument();
  });
});
