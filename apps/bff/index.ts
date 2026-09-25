/** 提供 Express BFF 应用、灾害数据代理、认证和健康检查路由。 */
import express, { type Application, type NextFunction, type Request, type Response } from "express";
import fetch, { type Response as FetchResponse } from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import {
  fetchAllHazards,
  type CachedHazardSource,
  type HazardSourceId,
  type HazardSourceLoadResult,
  type HazardSourceStatus,
  type ServerHazard,
} from "./hazards/hazard-source.js";
import {
  createHazardSourceHealthRegistry,
  type HazardSourceHealth,
  type HazardSourceHealthErrorCode,
} from "./hazards/source-health.js";
import { loadLocalEnv } from "./env.js";
import { createServerLogger } from "./logging.js";
import { registerAIChatRoute } from "./ai/ai-chat-route.js";
import { createAuthRouter } from "./auth/auth-routes.js";
import { createRequireUser } from "./auth/require-user.js";
import { recoverInterruptedAssistantMessages } from "./ai/conversation-repository.js";
import { createConversationRouter } from "./ai/conversation-routes.js";
import { createMemoryRouter } from "./ai/memory-routes.js";
import { registerAnalyticsRoute } from "./analytics/analytics-route.js";
import {
  createForwardHeaders,
  createRateLimitMiddleware,
  createRawBodyMiddleware,
  fetchWithTimeout,
  matchDisasterAwareRoute,
  RequestBoundaryError,
  type UpstreamFetch,
  validateQuery,
} from "./security/request-boundaries.js";
import { adaptDisasterAwareHazards } from "./hazards/disasteraware-adapter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repositoryRoot = path.resolve(__dirname, "../../..");
const clientDistPath = path.join(repositoryRoot, "dist");
const disasterAwareBaseUrl = "https://api.disasteraware.com";

export type { UpstreamFetch } from "./security/request-boundaries.js";
export { adaptDisasterAwareHazards } from "./hazards/disasteraware-adapter.js";

interface CreateAppOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: UpstreamFetch;
  fetchHazards?: typeof fetchAllHazards;
  now?: () => Date;
}

const HAZARD_SOURCE_CACHE_TTL_MS = 300_000;

interface DisasterAwareTokenResponse {
  accessToken?: string;
}

const fallbackSourceIds = ["usgs", "nasa-eonet", "gdacs"] as const;

function completeFallbackSourceStatuses(
  sources: readonly HazardSourceStatus[],
  defaultStatus: HazardSourceStatus["status"],
  healthForSource: (source: HazardSourceId) => HazardSourceHealth,
): HazardSourceStatus[] {
  return fallbackSourceIds.map((id) => ({
    ...(sources.find((source) => source.id === id) ?? { id, status: defaultStatus, count: 0 }),
    health: healthForSource(id),
  }));
}

function toHazardSourceHealthErrorCode(error: unknown): HazardSourceHealthErrorCode {
  if (error instanceof RequestBoundaryError && error.code === "UPSTREAM_TIMEOUT") {
    return "TIMEOUT";
  }

  if (error instanceof SyntaxError) {
    return "INVALID_RESPONSE";
  }

  if (error instanceof Error && /(?:response|request) was unavailable$/i.test(error.message)) {
    return "HTTP_ERROR";
  }

  return "UPSTREAM_ERROR";
}

function readToken(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const accessToken = (payload as DisasterAwareTokenResponse).accessToken;
  return typeof accessToken === "string" ? accessToken : "";
}

async function readJsonResponse(response: FetchResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

async function readHazardArrayResponse(response: FetchResponse): Promise<unknown[]> {
  const payload = JSON.parse(await response.text()) as unknown;
  if (!Array.isArray(payload)) {
    throw new SyntaxError("DisasterAware active hazards response must be an array.");
  }

  return payload;
}

function apiPath(request: Request): string {
  return new URL(request.originalUrl, "http://bff.local").pathname.replace(/^\/api/, "");
}

function sendApiError(response: Response, status: number, code: string, message: string): void {
  response.status(status).json({ code, message });
}

function readBoundedPositiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: number,
  maximum: number,
): number {
  const value = Number(env[key]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return fallback;
  }

  return Math.min(value, maximum);
}

export function createApp(options: CreateAppOptions = {}): Application {
  const app = express();
  const serverEnv = options.env ?? process.env;
  const requireAuthenticatedUser = createRequireUser(serverEnv);
  const logger = createServerLogger("bff", serverEnv);
  const upstreamFetch = options.fetchImpl ?? (fetch as unknown as UpstreamFetch);
  const fetchHazards = options.fetchHazards ?? fetchAllHazards;
  const now = options.now ?? (() => new Date());
  // 两类上游请求分别限时：认证和代理使用较长限制，灾害源拉取使用较短限制。
  const upstreamTimeoutMs = readBoundedPositiveInteger(
    serverEnv,
    "DISASTERAWARE_REQUEST_TIMEOUT_MS",
    10_000,
    60_000,
  );
  const sourceTimeoutMs = readBoundedPositiveInteger(
    serverEnv,
    "HAZARD_SOURCE_TIMEOUT_MS",
    8_000,
    30_000,
  );
  const authorizeRateLimit = createRateLimitMiddleware({
    maxRequests: readBoundedPositiveInteger(serverEnv, "BFF_AUTHORIZE_RATE_LIMIT_MAX", 10, 1_000),
  });
  const aiRateLimit = createRateLimitMiddleware({
    maxRequests: readBoundedPositiveInteger(serverEnv, "BFF_AI_RATE_LIMIT_MAX", 30, 1_000),
  });
  const hazardRateLimit = createRateLimitMiddleware({
    maxRequests: readBoundedPositiveInteger(serverEnv, "BFF_HAZARD_RATE_LIMIT_MAX", 120, 10_000),
  });
  let accessToken = "";
  // 同一时间缺少令牌时复用同一个认证请求，认证结束后清除该 Promise。
  let authorizationRequest: Promise<string> | undefined;
  // 每个灾害源单独缓存最近一次成功结果，供短暂上游故障时回退。
  const sourceCache = new Map<HazardSourceId, CachedHazardSource>();
  const sourceHealth = createHazardSourceHealthRegistry();

  const loadSource = async (
    source: HazardSourceId,
    load: () => Promise<ServerHazard[]>,
  ): Promise<HazardSourceLoadResult> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const startedAt = now();
      try {
        const hazards = await load();
        const completedAt = now();
        sourceHealth.recordSuccess(
          source,
          completedAt.getTime() - startedAt.getTime(),
          completedAt,
        );
        const fetchedAt = completedAt.toISOString();
        sourceCache.set(source, { hazards, fetchedAt });
        return {
          hazards,
          status: {
            id: source,
            status: hazards.length > 0 ? "success" : "empty",
            count: hazards.length,
            fetchedAt,
            health: sourceHealth.snapshot(source, completedAt),
          },
        };
      } catch (error: unknown) {
        const completedAt = now();
        sourceHealth.recordFailure(
          source,
          completedAt.getTime() - startedAt.getTime(),
          toHazardSourceHealthErrorCode(error),
          completedAt,
        );
        // 下方会在不暴露上游细节的情况下处理第二次尝试和缓存响应。
      }
    }

    const cached = sourceCache.get(source);
    const fetchedAtMs = cached ? Date.parse(cached.fetchedAt) : Number.NaN;
    if (
      cached &&
      Number.isFinite(fetchedAtMs) &&
      now().getTime() - fetchedAtMs <= HAZARD_SOURCE_CACHE_TTL_MS
    ) {
      // 只在五分钟有效期内返回旧结果，并通过 stale 状态告知调用方。
      return {
        hazards: cached.hazards,
        status: {
          id: source,
          status: "stale",
          count: cached.hazards.length,
          fetchedAt: cached.fetchedAt,
          health: sourceHealth.snapshot(source, now()),
        },
      };
    }

    return {
      hazards: [],
      status: {
        id: source,
        status: "unavailable",
        count: 0,
        health: sourceHealth.snapshot(source, now()),
      },
    };
  };

  app.disable("x-powered-by");
  // 禁用 trust proxy，因此客户端 IP 来自直接套接字连接。
  app.set("trust proxy", false);

  const authorizeUpstream = async (): Promise<string> => {
    const username = serverEnv.DISASTERAWARE_USERNAME;
    const password = serverEnv.DISASTERAWARE_PASSWORD;

    if (!username || !password) {
      throw new Error("DisasterAware server credentials are not configured");
    }

    const response = await fetchWithTimeout(
      upstreamFetch,
      `${disasterAwareBaseUrl}/authorize`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
      upstreamTimeoutMs,
    );

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
    }

    const nextToken = readToken(payload);
    if (!nextToken) {
      throw new Error("Authentication response did not contain an access token");
    }

    accessToken = nextToken;
    return nextToken;
  };

  const getAccessToken = async (forceRefresh = false): Promise<string> => {
    if (forceRefresh) {
      accessToken = "";
    }

    if (accessToken) {
      return accessToken;
    }

    authorizationRequest ??= authorizeUpstream().finally(() => {
      authorizationRequest = undefined;
    });

    return authorizationRequest;
  };

  const fetchDisasterAwareActive = async (request: Request): Promise<ServerHazard[]> => {
    const requestUpstream = async (token: string): Promise<FetchResponse> =>
      fetchWithTimeout(
        upstreamFetch,
        `${disasterAwareBaseUrl}/hazards/active`,
        { method: "GET", headers: createForwardHeaders(request, token) },
        sourceTimeoutMs,
      );

    let response = await requestUpstream(await getAccessToken());
    if (response.status === 401 || response.status === 403) {
      response = await requestUpstream(await getAccessToken(true));
    }
    if (!response.ok) {
      throw new Error("DisasterAware active hazards request was unavailable");
    }

    return adaptDisasterAwareHazards(await readHazardArrayResponse(response));
  };

  app.use(createRawBodyMiddleware());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(serverEnv));
  app.use("/api", requireAuthenticatedUser);

  registerAnalyticsRoute(app, [], { env: serverEnv, fetchImpl: upstreamFetch });
  app.use("/api/ai", createMemoryRouter({ env: serverEnv, fetchImpl: upstreamFetch }));
  app.use("/api/ai/conversations", createConversationRouter());
  registerAIChatRoute(app, [aiRateLimit], { env: serverEnv, fetchImpl: upstreamFetch });

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    // 本地 API 各自限定一种 HTTP 方法；未列出的路径继续交给后续路由判断。
    const pathname = apiPath(req);
    const localMethods: Record<string, string> = {
      "/ai/conversations": "GET",
      "/authorize": "POST",
      "/hazards": "GET",
    };
    const isAIMessageRoute =
      /^\/ai\/conversations\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/messages$/i.test(
        pathname,
      );
    const allowedMethod = isAIMessageRoute ? "POST" : localMethods[pathname];

    if (allowedMethod && req.method !== allowedMethod) {
      sendApiError(
        res,
        405,
        "API_METHOD_NOT_ALLOWED",
        "HTTP method is not allowed for this API route.",
      );
      return;
    }

    next();
  });

  app.get("/api/hazards", hazardRateLimit, validateQuery, async (req: Request, res: Response) => {
    const sourcesParam = req.query.source ?? req.query.sources;
    const sources =
      typeof sourcesParam === "string" && sourcesParam.trim().length > 0
        ? sourcesParam
            .split(",")
            .map((source) => source.trim())
            .filter(Boolean)
        : undefined;
    const typeParam = req.query.type;
    const typeFilter =
      typeof typeParam === "string" && typeParam.trim().length > 0
        ? new Set(typeParam.split(",").map((type) => type.trim().toUpperCase()))
        : null;

    let hazards: ServerHazard[];
    let fallbackSources: HazardSourceStatus[];
    let fallbackUsed = false;

    const primary = await loadSource("disasteraware", () => fetchDisasterAwareActive(req));
    hazards = primary.hazards;
    const primaryStatus = primary.status;

    if (primaryStatus.status !== "success") {
      // 主数据源空、失败或仅有旧缓存时，再请求公开灾害源作为补充或替代。
      fallbackUsed = true;
      try {
        const fallback = await fetchHazards({
          sources,
          sourceFetch: (url) => fetchWithTimeout(upstreamFetch, url, {}, sourceTimeoutMs),
          loadSource,
        });
        hazards =
          primaryStatus.status === "stale"
            ? [...primary.hazards, ...fallback.hazards]
            : fallback.hazards;
        fallbackSources = completeFallbackSourceStatuses(fallback.sources, "fallback", (source) =>
          sourceHealth.snapshot(source, now()),
        );
      } catch {
        fallbackSources = completeFallbackSourceStatuses(
          [
            { id: "usgs", status: "unavailable", count: 0 },
            { id: "nasa-eonet", status: "unavailable", count: 0 },
            { id: "gdacs", status: "unavailable", count: 0 },
          ],
          "unavailable",
          (source) => sourceHealth.snapshot(source, now()),
        );
      }
    } else {
      fallbackSources = completeFallbackSourceStatuses(
        [
          { id: "usgs", status: "fallback", count: 0 },
          { id: "nasa-eonet", status: "fallback", count: 0 },
          { id: "gdacs", status: "fallback", count: 0 },
        ],
        "fallback",
        (source) => sourceHealth.snapshot(source, now()),
      );
    }

    const uniqueHazards = [...new Map(hazards.map((hazard) => [hazard.eventId, hazard])).values()];
    const filtered = typeFilter
      ? uniqueHazards.filter((hazard) => typeFilter.has(hazard.type.toUpperCase()))
      : uniqueHazards;

    res.status(200).json({
      hazards: filtered,
      meta: {
        primary: "disasteraware",
        fallbackUsed,
        generatedAt: new Date().toISOString(),
        sources: [primaryStatus, ...fallbackSources],
        stale: [primaryStatus, ...fallbackSources].some((source) => source.status === "stale"),
      },
    });
  });

  app.post("/api/authorize", authorizeRateLimit, async (_req: Request, res: Response) => {
    try {
      await getAccessToken();
      res.status(200).json({ authorized: true });
    } catch (error: unknown) {
      logger.error("authorization_failed", {
        code: error instanceof RequestBoundaryError ? error.code : "UPSTREAM_UNAVAILABLE",
      });
      if (error instanceof RequestBoundaryError && error.code === "UPSTREAM_TIMEOUT") {
        sendApiError(res, 504, error.code, error.message);
        return;
      }
      sendApiError(res, 502, "UPSTREAM_UNAVAILABLE", "Upstream service is unavailable.");
    }
  });

  app.use("/api/hazards", hazardRateLimit, validateQuery, async (req: Request, res: Response) => {
    // 代理只放行 matchDisasterAwareRoute 定义的 DisasterAWARE 读取路径。
    const pathname = apiPath(req);
    const route = matchDisasterAwareRoute(req.method, pathname);
    if (route.kind === "method_not_allowed") {
      sendApiError(
        res,
        405,
        "API_METHOD_NOT_ALLOWED",
        "HTTP method is not allowed for this API route.",
      );
      return;
    }
    if (route.kind === "not_found") {
      sendApiError(res, 404, "API_ROUTE_NOT_FOUND", "API route is not available.");
      return;
    }

    const requestUrl = new URL(req.originalUrl, "http://bff.local");
    const targetUrl = `${disasterAwareBaseUrl}${pathname}${requestUrl.search}`;

    try {
      const requestUpstream = async (token: string): Promise<FetchResponse> =>
        fetchWithTimeout(
          upstreamFetch,
          targetUrl,
          {
            method: req.method,
            headers: createForwardHeaders(req, token),
          },
          upstreamTimeoutMs,
        );

      let response = await requestUpstream(await getAccessToken());
      if (response.status === 401 || response.status === 403) {
        response = await requestUpstream(await getAccessToken(true));
      }

      if (!response.ok) {
        throw new Error(`DisasterAware proxy returned ${response.status}`);
      }

      const responseBody = await response.text();
      const contentType = response.headers.get("content-type");
      if (contentType) {
        res.setHeader("content-type", contentType);
      }
      res.status(response.status).send(responseBody);
    } catch (error: unknown) {
      logger.error("disasteraware_proxy_failed", {
        code: error instanceof RequestBoundaryError ? error.code : "UPSTREAM_UNAVAILABLE",
      });
      if (error instanceof RequestBoundaryError && error.code === "UPSTREAM_TIMEOUT") {
        sendApiError(res, 504, error.code, error.message);
        return;
      }
      sendApiError(res, 502, "UPSTREAM_UNAVAILABLE", "Upstream service is unavailable.");
    }
  });

  app.use("/api", (_req: Request, res: Response) => {
    sendApiError(res, 404, "API_ROUTE_NOT_FOUND", "API route is not available.");
  });

  app.use(express.static(clientDistPath));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  return app;
}

const isMainModule = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

if (isMainModule) {
  loadLocalEnv();
  const port = process.env.PORT || 8080;
  const logger = createServerLogger("bff");
  void recoverInterruptedAssistantMessages()
    .then((recoveredCount) => {
      if (recoveredCount > 0) {
        logger.info("ai_interrupted_generations_recovered", { count: recoveredCount });
      }
      createApp().listen(port, () => logger.info("server_started", { port: Number(port) }));
    })
    .catch(() => {
      logger.error("ai_interrupted_generation_recovery_failed", {
        code: "DATABASE_UNAVAILABLE",
      });
      process.exitCode = 1;
    });
}
