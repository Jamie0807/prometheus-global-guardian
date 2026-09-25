/** 验证灾害强度指标从兼容数据字段中的提取规则。 */
import { describe, expect, it } from "vitest";

import { getHazardIntensity } from "../../src/utils/hazardMetrics";

describe("hazard intensity metrics", () => {
  it("prefers the normalized magnitude and preserves zero", () => {
    expect(
      getHazardIntensity({
        magnitude: 6.2,
        geometry: { magnitude: 4.1 },
        properties: { mag: 3.5 },
      }),
    ).toBe(6.2);
    expect(getHazardIntensity({ magnitude: 0, properties: { mag: 3.5 } })).toBe(0);
  });

  it("supports compatible numeric magnitude fields", () => {
    expect(getHazardIntensity({ geometry: { magnitudeValue: "4.5" } })).toBe(4.5);
    expect(getHazardIntensity({ properties: { magnitude: "7" } })).toBe(7);
    expect(getHazardIntensity({ properties: { severity: "WARNING" } })).toBeNull();
  });

  it("returns null when a record has no numeric intensity", () => {
    expect(getHazardIntensity({ properties: { magnitude: " " } })).toBeNull();
    expect(getHazardIntensity({})).toBeNull();
  });
});
