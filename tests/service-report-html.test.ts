import { describe, expect, it } from "vitest";

import { buildReportHtml } from "../src/utils/reportHtml";

describe("HTML report", () => {
  it("renders a readable, printable and escaped report", () => {
    const html = buildReportHtml({
      reportName: "<script>unsafe</script> 灾害评估",
      organization: "A & B",
      email: "ops@example.test",
      notes: "<img src=x onerror=alert(1)>",
      filter: "FLOOD",
      timestamp: "2026-09-15T00:00:00.000Z",
      disasters: [
        {
          id: "hazard-1",
          title: "<b>洪水</b>",
          type: "FLOOD",
          severity: "HIGH",
          geometry: { type: "Point", coordinates: [120, 30] },
          description: "River & road",
          source: "Example source",
          timestamp: "2026-09-14T00:00:00.000Z",
        },
      ],
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("@media print");
    expect(html).toContain("灾害事件总数");
    expect(html).toContain("按灾害类型汇总");
    expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;");
    expect(html).toContain("A &amp; B");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;b&gt;洪水&lt;/b&gt;");
    expect(html).toContain("River &amp; road");
    expect(html).not.toContain("<script>unsafe</script>");
  });
});
