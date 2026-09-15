import type { RequestHandler } from "express";
import { Readable } from "node:stream";
import getRawBody from "raw-body";
import { Response as FetchResponse, type RequestInit } from "node-fetch";

export const REQUEST_BODY_LIMIT_BYTES = 64 * 1024;
export const QUERY_PARAMETER_LIMIT = 20;
export const QUERY_PART_LENGTH_LIMIT = 256;

const FORWARDED_HEADER_NAMES = ["accept", "accept-language"] as const;
const HAZARD_CATEGORY_ROUTE_PATTERN = /^\/hazards\/active\/category\/[A-Za-z0-9_-]{1,64}$/;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 60;
const DEFAULT_UPSTREAM_TIMEOUT_MS = 10_000;

export type UpstreamFetch = (url: string, init?: RequestInit) => Promise<FetchResponse>;

export type RequestBoundaryErrorCode =
  | "API_METHOD_NOT_ALLOWED"
  | "API_ROUTE_NOT_FOUND"
  | "INVALID_QUERY"
  | "RATE_LIMITED"
  | "REQUEST_BODY_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "UPSTREAM_TIMEOUT";

export class RequestBoundaryError extends Error {
  constructor(
    readonly code: RequestBoundaryErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "RequestBoundaryError";
  }
}

export type DisasterAwareRouteMatch =
  | { readonly kind: "allowed" }
  | { readonly kind: "method_not_allowed" }
  | { readonly kind: "not_found" };

export type RateLimitOptions = {
  readonly maxRequests?: number;
  readonly now?: () => number;
  readonly windowMs?: number;
};

type RateLimitBucket = {
  readonly window: number;
  readonly requests: number;
};

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendBoundaryError(
  response: Parameters<RequestHandler>[1],
  error: RequestBoundaryError,
): void {
  response.status(error.status).json({ code: error.code, message: error.message });
}

function toPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined || value <= 0) {
    return fallback;
  }

  return Math.floor(value);
}

function isBodyLimitError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error.type === "entity.too.large" || error.status === 413 || error.statusCode === 413;
}

export function matchDisasterAwareRoute(method: string, pathname: string): DisasterAwareRouteMatch {
  // BFF 代理只允许三个只读灾害接口，避免将任意路径转发到上游。
  if (
    pathname === "/hazards/types" ||
    pathname === "/hazards/active" ||
    HAZARD_CATEGORY_ROUTE_PATTERN.test(pathname)
  ) {
    return { kind: method === "GET" ? "allowed" : "method_not_allowed" };
  }

  return { kind: "not_found" };
}

export function createRawBodyMiddleware(limitBytes = REQUEST_BODY_LIMIT_BYTES): RequestHandler {
  // 先读取受大小限制的原始请求体，后续路由自行解析 JSON。
  const limit = toPositiveInteger(limitBytes, REQUEST_BODY_LIMIT_BYTES);

  return async (request, response, next) => {
    if (request.method === "GET" || request.method === "HEAD") {
      next();
      return;
    }

    const contentLength = request.headers["content-length"];
    const hasBody =
      (contentLength !== undefined && Number(contentLength) > 0) ||
      request.headers["transfer-encoding"] !== undefined;
    const contentType = request.headers["content-type"];
    if (
      hasBody &&
      (typeof contentType !== "string" || !contentType.toLowerCase().startsWith("application/json"))
    ) {
      sendBoundaryError(
        response,
        new RequestBoundaryError(
          "UNSUPPORTED_MEDIA_TYPE",
          415,
          "Request body must use application/json.",
        ),
      );
      return;
    }

    try {
      request.rawBody = await getRawBody(request, { limit });
      next();
    } catch (error: unknown) {
      if (isBodyLimitError(error)) {
        sendBoundaryError(
          response,
          new RequestBoundaryError(
            "REQUEST_BODY_TOO_LARGE",
            413,
            "Request body exceeds the allowed size.",
          ),
        );
        return;
      }

      next(error);
    }
  };
}

export const validateQuery: RequestHandler = (request, response, next) => {
  const entries = Object.entries(request.query);
  const invalid =
    entries.length > QUERY_PARAMETER_LIMIT ||
    entries.some(
      ([key, value]) =>
        key.length > QUERY_PART_LENGTH_LIMIT ||
        key.includes("[") ||
        key.includes("]") ||
        typeof value !== "string" ||
        value.length > QUERY_PART_LENGTH_LIMIT,
    );

  if (invalid) {
    sendBoundaryError(
      response,
      new RequestBoundaryError("INVALID_QUERY", 400, "Query parameters exceed the allowed limits."),
    );
    return;
  }

  next();
};

export function createForwardHeaders(
  request: Pick<Parameters<RequestHandler>[0], "headers">,
  accessToken: string,
): Record<string, string> {
  // 仅转发白名单中的协商请求头，并由 BFF 注入服务端访问令牌。
  const headers: Record<string, string> = {};

  for (const name of FORWARDED_HEADER_NAMES) {
    const value = request.headers[name];
    if (typeof value === "string") {
      headers[name] = value;
    }
  }

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

export async function fetchWithTimeout(
  upstreamFetch: UpstreamFetch,
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
): Promise<FetchResponse> {
  if (init.signal?.aborted) {
    throw new Error("Request aborted.");
  }
  const controller = new AbortController();
  // 调用方取消和超时都终止同一个上游请求。
  let response: FetchResponse | undefined;
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort();
  upstreamSignal?.addEventListener("abort", abortFromUpstream);
  const destroyBody = () => {
    if (response?.body instanceof Readable) response.body.destroy();
  };
  const failure = new Promise<never>((_resolve, reject) => {
    controller.signal.addEventListener(
      "abort",
      () => {
        destroyBody();
        reject(
          upstreamSignal?.aborted
            ? new Error("Request aborted.")
            : new RequestBoundaryError("UPSTREAM_TIMEOUT", 504, "Upstream request timed out."),
        );
      },
      { once: true },
    );
  });
  const timeout = setTimeout(
    () => controller.abort(),
    toPositiveInteger(timeoutMs, DEFAULT_UPSTREAM_TIMEOUT_MS),
  );

  const operation = (async () => {
    response = await upstreamFetch(url, {
      ...init,
      redirect: "error",
      signal: controller.signal,
    });
    if (controller.signal.aborted) {
      destroyBody();
      throw new Error("Request aborted.");
    }
    // 在截止时间内将响应缓冲到内存；超过 8 MiB 立即销毁上游流。
    const chunks: Buffer[] = [];
    let size = 0;
    if (response.body) {
      for await (const chunk of response.body) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 8 * 1024 * 1024) {
          destroyBody();
          throw new Error("Upstream response exceeds the allowed size.");
        }
        chunks.push(buffer);
      }
    }
    return new FetchResponse(Buffer.concat(chunks), {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  })();
  // 上游可能忽略 abort；消费迟到的拒绝，避免超时响应后出现未处理的 Promise 拒绝。
  void operation.catch(() => undefined);

  try {
    return await Promise.race([failure, operation]);
  } finally {
    clearTimeout(timeout);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

export function createRateLimitMiddleware(options: RateLimitOptions = {}): RequestHandler {
  const maxRequests = toPositiveInteger(options.maxRequests, DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const windowMs = toPositiveInteger(options.windowMs, DEFAULT_RATE_LIMIT_WINDOW_MS);
  const now = options.now ?? Date.now;
  const buckets = new Map<string, RateLimitBucket>();
  let activeWindow = -1;

  return (request, response, next) => {
    const window = Math.floor(now() / windowMs);
    if (window !== activeWindow) {
      buckets.clear();
      activeWindow = window;
    }
    const key = request.ip || request.socket.remoteAddress || "unknown";
    const existing = buckets.get(key);
    if (!existing && buckets.size >= 10_000) {
      sendBoundaryError(
        response,
        new RequestBoundaryError("RATE_LIMITED", 429, "Too many requests. Please try again later."),
      );
      return;
    }
    const requests = existing?.window === window ? existing.requests + 1 : 1;

    buckets.set(key, { window, requests });

    if (requests > maxRequests) {
      sendBoundaryError(
        response,
        new RequestBoundaryError("RATE_LIMITED", 429, "Too many requests. Please try again later."),
      );
      return;
    }

    next();
  };
}
