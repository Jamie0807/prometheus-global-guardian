/**
 * Hazard Data Worker
 * 在 Worker 子线程中完成灾害数据清洗，彻底不阻塞主线程
 *
 * 职责：
 *  1. 格式标准化：将各数据源字段统一映射到 Hazard 接口
 *  2. 去重：以 id 为 key，多源并发时同一事件只保留一条
 *  3. 坐标过滤：剔除 NaN / 超出 [-180,180] x [-90,90] 的异常坐标
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
  hazards: WorkerHazard[];
}

function isValidCoord(coords: number[]): boolean {
  if (!Array.isArray(coords) || coords.length < 2) return false;
  const [lng, lat] = coords;
  return (
    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 &&
    typeof lat === 'number' && !isNaN(lat) && lat >= -90  && lat <= 90
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
  return hazards.filter(h => isValidCoord(h.geometry?.coordinates));
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const { hazards } = e.data;

  // 1. 坐标过滤
  const coordFiltered = filterCoords(hazards);

  // 2. 去重
  const cleaned = dedup(coordFiltered);

  // 3. 返回主线程
  self.postMessage(cleaned);
};
