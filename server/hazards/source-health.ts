import type { HazardSourceId } from "../../shared/hazards/hazard-event.js";

export type HazardSourceHealthErrorCode =
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR";

export interface HazardSourceHealth {
  windowMs: 300000;
  attempts: number;
  successes: number;
  failures: number;
  successRate?: number;
  averageLatencyMs?: number;
  lastLatencyMs?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  lastErrorCode?: HazardSourceHealthErrorCode;
}

export interface HazardSourceHealthRegistry {
  recordSuccess(source: HazardSourceId, latencyMs: number, at: Date): void;
  recordFailure(
    source: HazardSourceId,
    latencyMs: number,
    errorCode: HazardSourceHealthErrorCode,
    at: Date,
  ): void;
  snapshot(source: HazardSourceId, at: Date): HazardSourceHealth;
}

interface HealthEvent {
  at: Date;
  latencyMs: number;
  ok: boolean;
  errorCode?: HazardSourceHealthErrorCode;
}

const WINDOW_MS = 300000 as const;

function roundLatency(latencyMs: number): number {
  return Math.round(latencyMs);
}

function isValidLatency(latencyMs: number): boolean {
  return Number.isFinite(latencyMs) && latencyMs >= 0;
}

export function createHazardSourceHealthRegistry(_windowMs?: number): HazardSourceHealthRegistry {
  void _windowMs;
  const eventsBySource = new Map<HazardSourceId, HealthEvent[]>();

  function record(
    source: HazardSourceId,
    latencyMs: number,
    at: Date,
    ok: boolean,
    errorCode?: HazardSourceHealthErrorCode,
  ): void {
    if (!isValidLatency(latencyMs)) {
      return;
    }

    const events = eventsBySource.get(source) ?? [];
    events.push({ at, latencyMs: roundLatency(latencyMs), ok, errorCode });
    eventsBySource.set(source, events);
  }

  return {
    recordSuccess(source, latencyMs, at) {
      record(source, latencyMs, at, true);
    },

    recordFailure(source, latencyMs, errorCode, at) {
      record(source, latencyMs, at, false, errorCode);
    },

    snapshot(source, at) {
      const cutoff = at.getTime() - WINDOW_MS;
      const events = (eventsBySource.get(source) ?? []).filter(
        (event) => event.at.getTime() > cutoff,
      );
      eventsBySource.set(source, events);

      const attempts = events.length;
      const successes = events.filter((event) => event.ok).length;
      const failures = attempts - successes;
      const snapshot: HazardSourceHealth = {
        windowMs: WINDOW_MS,
        attempts,
        successes,
        failures,
        consecutiveFailures: 0,
      };

      if (attempts === 0) {
        return snapshot;
      }

      const chronologicalEvents = [...events].sort(
        (left, right) => left.at.getTime() - right.at.getTime(),
      );
      const lastEvent = chronologicalEvents[chronologicalEvents.length - 1];
      const lastSuccess = chronologicalEvents.filter((event) => event.ok).at(-1);
      const lastFailure = chronologicalEvents.filter((event) => !event.ok).at(-1);

      snapshot.successRate = successes / attempts;
      snapshot.averageLatencyMs = Math.round(
        events.reduce((total, event) => total + event.latencyMs, 0) / attempts,
      );
      snapshot.lastLatencyMs = lastEvent.latencyMs;
      snapshot.lastAttemptAt = lastEvent.at.toISOString();
      snapshot.lastSuccessAt = lastSuccess?.at.toISOString();
      snapshot.lastErrorCode = lastFailure?.errorCode;

      for (let index = chronologicalEvents.length - 1; index >= 0; index -= 1) {
        if (chronologicalEvents[index].ok) {
          break;
        }
        snapshot.consecutiveFailures += 1;
      }

      return snapshot;
    },
  };
}
