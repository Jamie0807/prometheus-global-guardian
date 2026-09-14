import { describe, expect, it } from "vitest";

import type { Hazard } from "../../src/types";
import { createHazardPopupContent } from "../../src/features/map/utils/hazardPopupContent";

const maliciousHazard: Hazard = {
  id: "hazard-1",
  title: "<script>window.__xss = true</script>",
  type: '<img src=x onerror="window.__xss = true">',
  severity: 'HIGH <a href="javascript:alert(1)">link</a>',
  description: '<img src=x onerror="window.__xss = true"> https://evil.example',
  geometry: { type: "Point", coordinates: [120, 30] },
  source: "test",
};

describe("hazard popup content", () => {
  it("renders external hazard fields as text without creating executable DOM", () => {
    const content = createHazardPopupContent(maliciousHazard);

    expect(content.className).toBe("popup-content");
    expect(content.querySelector(".popup-title")?.textContent).toBe(maliciousHazard.title);
    expect(content.querySelector(".popup-info")?.textContent).toContain(maliciousHazard.type);
    expect(content.querySelector(".popup-info")?.textContent).toContain(maliciousHazard.severity);
    expect(content.querySelector(".popup-info")?.textContent).toContain(
      maliciousHazard.description,
    );
    expect(content.querySelector(".popup-info")?.textContent).toContain("类型:");
    expect(content.querySelector(".popup-info")?.textContent).toContain("严重程度:");
    expect(content.querySelector(".popup-info")?.textContent).toContain("说明:");
    expect(content.querySelector(".popup-info")?.textContent).toContain("平台:");
    expect(content.querySelector(".popup-info")?.textContent).toContain("全球灾害监控平台");
    expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
    expect(content.querySelector("[onerror], [onclick], [href]")).toBeNull();
  });
});
