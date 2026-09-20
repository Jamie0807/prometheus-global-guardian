/** 验证数据可视化组件的图表渲染和横轴标签抽样。 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LineChart, ProgressBar } from "../../src/components/DataVisualization";
import { getXAxisLabelIndexes } from "../../src/utils/chartLabels";

describe("LineChart X-axis labels", () => {
  it("keeps all labels for small datasets and samples large datasets evenly", () => {
    expect(getXAxisLabelIndexes(4)).toEqual([0, 1, 2, 3]);
    expect(getXAxisLabelIndexes(846)).toEqual([0, 121, 241, 362, 483, 604, 724, 845]);
  });

  it("renders no more than eight labels for a large dataset", () => {
    render(
      <LineChart
        data={Array.from({ length: 846 }, (_, index) => ({ x: `#${index + 1}`, y: index }))}
        title="灾害强度趋势分析"
      />,
    );

    const labels = screen.getAllByText(/^#\d+$/);

    expect(labels).toHaveLength(8);
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#846")).toBeInTheDocument();
    expect(labels[0]).toHaveStyle({ left: "0%", transform: "translateX(0)" });
    expect(labels.at(-1)).toHaveStyle({ left: "100%", transform: "translateX(-100%)" });
  });
});

describe("ProgressBar", () => {
  it("renders a visible themed fill at the displayed percentage", () => {
    render(
      <ProgressBar
        label="EARTHQUAKE"
        value={498}
        max={1000}
        color="var(--analytics-accent, #67e8f9)"
      />,
    );

    const progress = screen.getByRole("progressbar", { name: "EARTHQUAKE" });
    const fill = progress.firstElementChild as HTMLDivElement;

    expect(screen.getByText("49.8%")).toBeInTheDocument();
    expect(progress).toHaveAttribute("aria-valuenow", "498");
    expect(fill.style.width).toBe("49.8%");
    expect(fill.style.backgroundColor).toBe("var(--analytics-accent, #67e8f9)");
  });
});
