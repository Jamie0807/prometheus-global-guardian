import { useCallback, useEffect, useRef, useState } from "react";

import { config } from "../../../config";
import { fetchHazardFeed } from "../../../services/hazards/hazardService";
import type { Hazard, HazardFeedResponse } from "../../../types";
import { createClientLogger } from "../../../utils/logger";

const logger = createClientLogger("hazard-data");

type RefreshReason = "automatic" | "manual";

interface InFlightRequest {
  controller: AbortController;
  filter: string;
  promise: Promise<void>;
  reason: RefreshReason;
}

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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function useHazardData(filter: string, onDataUpdate: (hazards: Hazard[]) => void) {
  const workerRef = useRef<Worker | null>(null);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const previousFilterRef = useRef(filter);
  const inFlightRef = useRef<InFlightRequest | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [disasters, setDisasters] = useState<Hazard[]>([]);
  const [sourceMeta, setSourceMeta] = useState<HazardFeedResponse["meta"] | null>(null);

  const clearRefreshInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const isCurrentRequest = useCallback((requestId: number) => {
    return mountedRef.current && requestId === requestIdRef.current;
  }, []);

  const cancelInFlight = useCallback((reason?: RefreshReason) => {
    const inFlight = inFlightRef.current;
    if (!inFlight || (reason && inFlight.reason !== reason)) return;
    inFlightRef.current = null;
    requestIdRef.current += 1;
    inFlight.controller.abort();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    workerRef.current = new Worker(new URL("../../../workers/hazard-worker.ts", import.meta.url), {
      type: "module",
    });
    return () => {
      mountedRef.current = false;
      clearRefreshInterval();
      cancelInFlight();
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, [cancelInFlight, clearRefreshInterval]);

  const refresh = useCallback(
    (reason: RefreshReason = "manual"): Promise<void> => {
      const existing = inFlightRef.current;
      if (existing?.filter === filter) {
        if (reason === "manual") existing.reason = reason;
        return existing.promise;
      }

      cancelInFlight();
      const controller = new AbortController();
      const requestId = ++requestIdRef.current;
      const promise = (async () => {
        try {
          const response = await fetchHazardFeed(filter, controller.signal);
          if (!isCurrentRequest(requestId)) return;

          const cleaned = response.hazards.length
            ? workerRef.current
              ? await cleanWithWorker(workerRef.current, response.hazards)
              : response.hazards
            : [];
          if (!isCurrentRequest(requestId)) return;

          setSourceMeta(response.meta);
          setDisasters(cleaned);
          onDataUpdate(cleaned);
        } catch (error: unknown) {
          if (!isAbortError(error)) {
            logger.error("hazard_feed_refresh_failed");
          }
        }
      })();
      const inFlight: InFlightRequest = { controller, filter, promise, reason };
      inFlightRef.current = inFlight;
      void promise.finally(() => {
        if (inFlightRef.current === inFlight) inFlightRef.current = null;
      });
      return promise;
    },
    [cancelInFlight, filter, isCurrentRequest, onDataUpdate],
  );

  useEffect(() => {
    if (previousFilterRef.current === filter) return;
    previousFilterRef.current = filter;
    cancelInFlight();
  }, [cancelInFlight, filter]);

  useEffect(() => {
    const startRefreshInterval = () => {
      clearRefreshInterval();
      if (!document.hidden) {
        intervalRef.current = setInterval(() => {
          void refresh("automatic");
        }, config.ui.refreshInterval);
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearRefreshInterval();
        cancelInFlight("automatic");
        return;
      }
      void refresh("automatic").finally(startRefreshInterval);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (!document.hidden) {
      void refresh("automatic").finally(startRefreshInterval);
    }
    return () => {
      clearRefreshInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cancelInFlight, clearRefreshInterval, refresh]);

  return { disasters, refresh, sourceMeta };
}
