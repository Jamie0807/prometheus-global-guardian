/**
 * Hazard Data Worker
 * 在 Worker 中过滤无效坐标并按 id 去重。
 */

export interface WorkerHazard {
  id: string;
  title: string;
  type: string;
  severity?: string;
  description?: string;
  geometry: { type: string; coordinates: number[] };
  magnitude?: number;
  time?: string;
  source?: string;
  url?: string;
}

export interface WorkerMessage {
  id: number;
  hazards: WorkerHazard[];
}

function isValidCoord(coords: number[]): boolean {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === "number" &&
    !isNaN(lng) &&
    lng >= -180 &&
    lng <= 180 &&
    typeof lat === "number" &&
    !isNaN(lat) &&
    lat >= -90 &&
    lat <= 90
  );
}

function dedup(hazards: WorkerHazard[]): WorkerHazard[] {
  const seen = new Map<string, WorkerHazard>();
  for (const h of hazards) {
    if (!seen.has(h.id)) seen.set(h.id, h);
  }
  return Array.from(seen.values());
}

function filterCoords(hazards: WorkerHazard[]): WorkerHazard[] {
  return hazards.filter((h) => isValidCoord(h.geometry?.coordinates));
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { id, hazards } = e.data;

  // 1. 坐标过滤
  const coordFiltered = filterCoords(hazards);

  // 2. 去重
  const cleaned = dedup(coordFiltered);

  // 3. 返回主线程
  self.postMessage({ id, result: cleaned });
};
