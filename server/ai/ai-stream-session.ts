/** 管理 AI SSE 的短时会话、事件序号、断点重放和资源上限。 */

export type AIStreamSessionStatus = "active" | "completed" | "failed";

export interface AIStreamEvent {
  id: number;
  payload: string;
}

export interface AISessionSubscriber {
  onEvent: (event: AIStreamEvent) => void;
  onEnd: () => void;
}

export type AISessionAttachResult =
  | { kind: "attached"; replay: AIStreamEvent[]; terminal: boolean; detach: () => void }
  | { kind: "resume_unavailable" }
  | { kind: "session_disposed" };

export type AISessionLookupResult =
  | { kind: "found"; session: AIStreamSession }
  | { kind: "missing" }
  | { kind: "fingerprint_mismatch" };

export interface AIStreamSession {
  readonly requestId: string;
  readonly fingerprint: string;
  readonly ownerId?: string;
  readonly status: AIStreamSessionStatus;
  readonly wasCancelled: boolean;
  readonly nextEventId: number;
  attach(lastEventId: number, subscriber: AISessionSubscriber): AISessionAttachResult;
  publish(payload: string): void;
  complete(): void;
  fail(payload: string): void;
  cancel(): boolean;
  dispose(): void;
}

export interface AIStreamSessionRegistryOptions {
  ttlMs?: number;
  maxEvents?: number;
  maxBytes?: number;
  maxSessions?: number;
}

export interface AIStreamSessionRegistry {
  create(
    requestId: string,
    fingerprint: string,
    onExpire: () => void,
    ownerId?: string,
  ): AIStreamSession;
  get(requestId: string, fingerprint: string): AISessionLookupResult;
  cancel(requestId: string, ownerId: string): boolean;
}

const DEFAULT_TTL_MS = 30_000;
const MAX_TTL_MS = 120_000;
const DEFAULT_MAX_EVENTS = 256;
const MAX_EVENT_LIMIT = 2_048;
const DEFAULT_MAX_BYTES = 512 * 1024;
const MAX_BYTES_LIMIT = 4 * 1024 * 1024;
const DEFAULT_MAX_SESSIONS = 100;
const MAX_SESSION_LIMIT = 1_000;

function boundedPositiveInteger(
  value: number | undefined,
  fallback: number,
  maximum: number,
): number {
  return Number.isSafeInteger(value) && value !== undefined && value > 0
    ? Math.min(value, maximum)
    : fallback;
}

function normalizePayload(payload: string): string {
  const withoutIds = payload
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("id:"))
    .join("\n")
    .trimEnd();
  return `${withoutIds}\n\n`;
}

function createSession(
  requestId: string,
  fingerprint: string,
  options: Required<AIStreamSessionRegistryOptions>,
  onExpire: () => void,
  ownerId?: string,
): AIStreamSession {
  let currentStatus: AIStreamSessionStatus = "active";
  let nextEventId = 1;
  const events: AIStreamEvent[] = [];
  let eventBytes = 0;
  let lastEvictedEventId = 0;
  let disposed = false;
  let wasCancelled = false;
  const subscribers = new Set<AISessionSubscriber>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const clearExpiry = (): void => {
    if (!timer) return;
    clearTimeout(timer);
    timer = undefined;
  };

  const scheduleExpiry = (): void => {
    clearExpiry();
    timer = setTimeout(() => {
      timer = undefined;
      if (disposed || (currentStatus === "active" && subscribers.size > 0)) return;
      disposed = true;
      currentStatus = "failed";
      subscribers.forEach((subscriber) => subscriber.onEnd());
      subscribers.clear();
      onExpire();
    }, options.ttlMs);
    timer.unref?.();
  };

  const detach = (subscriber: AISessionSubscriber): void => {
    if (!subscribers.delete(subscriber)) return;
    if (currentStatus === "active" && subscribers.size === 0) scheduleExpiry();
  };

  const session: AIStreamSession = {
    requestId,
    fingerprint,
    ...(ownerId ? { ownerId } : {}),
    get status() {
      return currentStatus;
    },
    get wasCancelled() {
      return wasCancelled;
    },
    get nextEventId() {
      return nextEventId;
    },
    attach(lastEventId, subscriber) {
      if (disposed) return { kind: "session_disposed" };
      if (lastEventId < lastEvictedEventId || lastEventId >= nextEventId) {
        return { kind: "resume_unavailable" };
      }

      const replay = events.filter((event) => event.id > lastEventId);
      if (currentStatus === "active") {
        subscribers.add(subscriber);
        clearExpiry();
      }
      return {
        kind: "attached",
        replay,
        terminal: currentStatus !== "active",
        detach: () => detach(subscriber),
      };
    },
    publish(payload) {
      if (disposed || currentStatus !== "active") return;
      const event = { id: nextEventId, payload: normalizePayload(payload) } satisfies AIStreamEvent;
      nextEventId += 1;
      events.push(event);
      eventBytes += Buffer.byteLength(event.payload, "utf8");
      while (events.length > options.maxEvents || eventBytes > options.maxBytes) {
        const removed = events.shift();
        if (!removed) break;
        eventBytes -= Buffer.byteLength(removed.payload, "utf8");
        lastEvictedEventId = Math.max(lastEvictedEventId, removed.id);
      }
      subscribers.forEach((activeSubscriber) => activeSubscriber.onEvent(event));
    },
    complete() {
      if (disposed || currentStatus !== "active") return;
      currentStatus = "completed";
      subscribers.forEach((subscriber) => subscriber.onEnd());
      subscribers.clear();
      scheduleExpiry();
    },
    fail(payload) {
      if (disposed || currentStatus !== "active") return;
      session.publish(payload);
      currentStatus = "failed";
      subscribers.forEach((subscriber) => subscriber.onEnd());
      subscribers.clear();
      scheduleExpiry();
    },
    cancel() {
      if (disposed || currentStatus !== "active") return false;
      wasCancelled = true;
      session.fail(
        `event: error\ndata: ${JSON.stringify({
          code: "AI_GENERATION_CANCELLED",
          message: "AI generation was cancelled.",
        })}\n\n`,
      );
      session.dispose();
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      currentStatus = "failed";
      clearExpiry();
      subscribers.forEach((subscriber) => subscriber.onEnd());
      subscribers.clear();
      onExpire();
    },
  };

  return session;
}

export function createAIStreamSessionRegistry(
  input: AIStreamSessionRegistryOptions = {},
): AIStreamSessionRegistry {
  const options: Required<AIStreamSessionRegistryOptions> = {
    ttlMs: boundedPositiveInteger(input.ttlMs, DEFAULT_TTL_MS, MAX_TTL_MS),
    maxEvents: boundedPositiveInteger(input.maxEvents, DEFAULT_MAX_EVENTS, MAX_EVENT_LIMIT),
    maxBytes: boundedPositiveInteger(input.maxBytes, DEFAULT_MAX_BYTES, MAX_BYTES_LIMIT),
    maxSessions: boundedPositiveInteger(input.maxSessions, DEFAULT_MAX_SESSIONS, MAX_SESSION_LIMIT),
  };
  const sessions = new Map<string, AIStreamSession>();
  const pendingCancellations = new Map<string, { ownerId: string; expiresAt: number }>();

  const prunePendingCancellations = (now: number): void => {
    for (const [requestId, cancellation] of pendingCancellations) {
      if (cancellation.expiresAt <= now) pendingCancellations.delete(requestId);
    }
  };

  return {
    create(requestId, fingerprint, onExpire, ownerId) {
      while (sessions.size >= options.maxSessions) {
        const oldest = sessions.entries().next().value as [string, AIStreamSession] | undefined;
        if (!oldest) break;
        oldest[1].dispose();
      }
      const session = createSession(
        requestId,
        fingerprint,
        options,
        () => {
          sessions.delete(requestId);
          onExpire();
        },
        ownerId,
      );
      sessions.set(requestId, session);
      const pending = pendingCancellations.get(requestId);
      if (pending) {
        pendingCancellations.delete(requestId);
        if (pending.ownerId === ownerId && pending.expiresAt > Date.now()) session.cancel();
      }
      return session;
    },
    get(requestId, fingerprint) {
      const session = sessions.get(requestId);
      if (!session) return { kind: "missing" };
      if (session.fingerprint !== fingerprint) return { kind: "fingerprint_mismatch" };
      return { kind: "found", session };
    },
    cancel(requestId, ownerId) {
      const session = sessions.get(requestId);
      if (session) return session.ownerId === ownerId ? session.cancel() : false;

      const now = Date.now();
      prunePendingCancellations(now);
      while (pendingCancellations.size >= options.maxSessions) {
        const oldest = pendingCancellations.keys().next().value as string | undefined;
        if (!oldest) break;
        pendingCancellations.delete(oldest);
      }
      pendingCancellations.set(requestId, {
        ownerId,
        expiresAt: now + Math.max(options.ttlMs, DEFAULT_TTL_MS),
      });
      return true;
    },
  };
}
