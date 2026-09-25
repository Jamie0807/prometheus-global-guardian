/** 将已认证用户的分析请求安全代理至内部 FastAPI 服务。 */
import type { Application, Request, RequestHandler, Response } from "express";
import defaultFetch, { type Response as FetchResponse } from "node-fetch";
import {
  fetchWithTimeout,
  RequestBoundaryError,
  type UpstreamFetch,
  validateQuery,
} from "../security/request-boundaries.js";

const DEFAULT_UPSTREAM_TIMEOUT_MS = 30_000;
const MAX_UPSTREAM_TIMEOUT_MS = 60_000;

const ANALYTICS_ROUTES = {
  "/": ["GET"],
  "/health": ["GET"],
  "/api/v1/analyze": ["POST"],
  "/api/v1/statistics": ["POST"],
  "/api/v1/predictions": ["POST"],
  "/api/v1/etl/process": ["POST"],
  "/api/v1/risk-assessment": ["POST"],
  "/api/v1/quality/assess": ["POST"],
  "/api/v1/unified-model/transform": ["POST"],
  "/api/v1/unified-model/merge": ["POST"],
  "/api/v1/quality/thresholds": ["GET"],
  "/api/v1/quality/history": ["GET"],
  "/api/v1/pivot/create": ["POST"],
  "/api/v1/pivot/query": ["POST"],
  "/api/v1/pivot/trend-analysis": ["POST"],
  "/api/v1/pivot/risk-score": ["POST"],
  "/api/v1/pivot/summary": ["POST"],
} as const satisfies Record<string, readonly string[]>;

export type AnalyticsRouteMatch =
  | { readonly kind: "allowed" }
  | { readonly kind: "method_not_allowed" }
  | { readonly kind: "not_found" };

export interface AnalyticsRouteOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly fetchImpl?: UpstreamFetch;
  readonly timeoutMs?: number;
}

function sendApiError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ code, message });
}

function readBoundedPositiveInteger(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || value === undefined || value <= 0) {
    return DEFAULT_UPSTREAM_TIMEOUT_MS;
  }

  return Math.min(value, MAX_UPSTREAM_TIMEOUT_MS);
}

function analyticsPath(request: Request): string {
  const pathname = new URL(request.originalUrl, "http://bff.local").pathname;
  const prefix = "/api/analytics";
  if (pathname === prefix) return "/";
  return pathname.startsWith(`${prefix}/`) ? pathname.slice(prefix.length) : pathname;
}

function createUpstreamHeaders(request: Request, serviceToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    "x-analytics-service-token": serviceToken,
  };
  const forwardedHeaders = ["accept", "accept-language", "content-type"] as const;

  for (const name of forwardedHeaders) {
    const value = request.headers[name];
    if (typeof value === "string") headers[name] = value;
  }

  return headers;
}

function resolveUpstreamBaseUrl(env: NodeJS.ProcessEnv): string | undefined {
  const configuredUrl = env.ANALYTICS_SERVICE_URL?.trim();
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString().replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

async function copyResponse(response: Response, upstream: FetchResponse): Promise<void> {
  const contentType = upstream.headers.get("content-type");
  if (contentType) response.setHeader("content-type", contentType);
  response.status(upstream.status).send(await upstream.buffer());
}

export function matchAnalyticsRoute(method: string, pathname: string): AnalyticsRouteMatch {
  const allowedMethods: readonly string[] | undefined =
    ANALYTICS_ROUTES[pathname as keyof typeof ANALYTICS_ROUTES];
  if (!allowedMethods) return { kind: "not_found" };
  return allowedMethods.includes(method) ? { kind: "allowed" } : { kind: "method_not_allowed" };
}

/**
 * 注册同源分析代理。调用方须先挂载 `createRawBodyMiddleware()`，以在读取请求体前实施 64 KiB 限制。
 */
export function registerAnalyticsRoute(
  app: Application,
  middleware: readonly RequestHandler[] = [],
  options: AnalyticsRouteOptions = {},
): void {
  const env = options.env ?? process.env;
  const upstreamFetch = options.fetchImpl ?? (defaultFetch as unknown as UpstreamFetch);
  const upstreamTimeoutMs = readBoundedPositiveInteger(
    options.timeoutMs ?? Number(env.ANALYTICS_REQUEST_TIMEOUT_MS),
  );

  app.use(
    "/api/analytics",
    ...middleware,
    validateQuery,
    async (request: Request, response: Response) => {
      const pathname = analyticsPath(request);
      const route = matchAnalyticsRoute(request.method, pathname);
      if (route.kind === "method_not_allowed") {
        sendApiError(
          response,
          405,
          "API_METHOD_NOT_ALLOWED",
          "HTTP method is not allowed for this API route.",
        );
        return;
      }
      if (route.kind === "not_found") {
        sendApiError(response, 404, "API_ROUTE_NOT_FOUND", "API route is not available.");
        return;
      }

      const baseUrl = resolveUpstreamBaseUrl(env);
      const serviceToken = env.ANALYTICS_SERVICE_TOKEN?.trim();
      if (!baseUrl || !serviceToken) {
        sendApiError(
          response,
          502,
          "ANALYTICS_UPSTREAM_UNAVAILABLE",
          "Analytics service is unavailable.",
        );
        return;
      }

      const search = new URL(request.originalUrl, "http://bff.local").search;
      try {
        const upstream = await fetchWithTimeout(
          upstreamFetch,
          `${baseUrl}${pathname}${search}`,
          {
            method: request.method,
            headers: createUpstreamHeaders(request, serviceToken),
            ...(request.rawBody?.length ? { body: request.rawBody } : {}),
          },
          upstreamTimeoutMs,
        );

        if (!upstream.ok) {
          sendApiError(
            response,
            502,
            "ANALYTICS_UPSTREAM_UNAVAILABLE",
            "Analytics service is unavailable.",
          );
          return;
        }
        await copyResponse(response, upstream);
      } catch (error: unknown) {
        if (error instanceof RequestBoundaryError && error.code === "UPSTREAM_TIMEOUT") {
          sendApiError(response, 504, error.code, error.message);
          return;
        }
        sendApiError(
          response,
          502,
          "ANALYTICS_UPSTREAM_UNAVAILABLE",
          "Analytics service is unavailable.",
        );
      }
    },
  );
}
