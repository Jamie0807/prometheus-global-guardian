export interface ChartEventData {
  name: string;
}

export function readChartEvent(value: unknown): ChartEventData | null {
  if (typeof value !== "object" || value === null || !("name" in value)) return null;
  return typeof value.name === "string" ? { name: value.name } : null;
}
