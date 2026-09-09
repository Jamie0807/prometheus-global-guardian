import { useCallback, useEffect, useRef, useState } from "react";

import type { Hazard, HazardFeedResponse } from "../../../types";
import { fetchHazardFeed } from "../../../services/hazards/hazardService";

let workerMessageId = 0;

function cleanWithWorker(worker: Worker, hazards: Hazard[]): Promise<Hazard[]> {
  const id = ++workerMessageId;
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent<{ id: number; result: Hazard[] }>) => {
      if (event.data.id !== id) return;
      worker.removeEventListener("message", onMessage);
      resolve(event.data.result);
    };
    worker.addEventListener("message", onMessage);
    worker.postMessage({ id, hazards });
  });
}

export function useHazardData(filter: string, onDataUpdate: (hazards: Hazard[]) => void) {
  const workerRef = useRef<Worker | null>(null);
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const [sourceMeta, setSourceMeta] = useState<HazardFeedResponse["meta"] | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../../../workers/hazard-worker.ts", import.meta.url), {
      type: "module",
    });
    return () => workerRef.current?.terminate();
  }, []);

  const refresh = useCallback(async () => {
    const response = await fetchHazardFeed(filter);
    setSourceMeta(response.meta);
    if (response.hazards.length === 0) return;

    const cleaned = workerRef.current
      ? await cleanWithWorker(workerRef.current, response.hazards)
      : response.hazards;
    setDisasters(cleaned);
    onDataUpdate(cleaned);
  }, [filter, onDataUpdate]);

  return { disasters, refresh, sourceMeta };
}
