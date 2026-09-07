import { useCallback, useEffect, useRef, useState } from "react";

import type { Hazard } from "../../../types";
import {
  fetchGDACS,
  fetchHazardsActive,
  fetchNASAEONET,
  fetchUSGSEarthquakes,
} from "../../../services/hazards/hazardService";

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

function mapActiveHazard(hazard: Awaited<ReturnType<typeof fetchHazardsActive>>[number]): Hazard {
  return {
    id: String(hazard.hazard_ID || `da-${Date.now()}`),
    title: hazard.hazard_Name || "Unknown Hazard",
    type: hazard.type_ID || "UNKNOWN",
    geometry:
      Number.isFinite(hazard.latitude) && Number.isFinite(hazard.longitude)
        ? { type: "Point", coordinates: [hazard.longitude, hazard.latitude] }
        : { type: "Point", coordinates: [0, 0] },
    description: hazard.description || hazard.hazard_Name || "No description available",
    source: hazard.creator || "DisasterAware",
    severity: hazard.severity_ID,
    timestamp: hazard.create_Date,
  };
}

export function useHazardData(filter: string, onDataUpdate: (hazards: Hazard[]) => void) {
  const workerRef = useRef<Worker | null>(null);
  const [disasters, setDisasters] = useState<Hazard[]>([]);

  useEffect(() => {
    workerRef.current = new Worker(new URL("../../../workers/hazard-worker.ts", import.meta.url), {
      type: "module",
    });
    return () => workerRef.current?.terminate();
  }, []);

  const refresh = useCallback(async () => {
    const active = await fetchHazardsActive(filter === "ALL" ? "EVENT" : filter);
    const raw =
      active.length > 0
        ? active.map(mapActiveHazard)
        : (
            await Promise.allSettled([fetchUSGSEarthquakes(), fetchNASAEONET(), fetchGDACS()])
          ).flatMap((result) => (result.status === "fulfilled" ? result.value : []));
    const cleaned = workerRef.current ? await cleanWithWorker(workerRef.current, raw) : raw;
    setDisasters(cleaned);
    onDataUpdate(cleaned);
  }, [filter, onDataUpdate]);

  return { disasters, refresh };
}
