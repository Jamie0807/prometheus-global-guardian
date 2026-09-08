import express, { type Application, type NextFunction, type Request, type Response } from "express";
import fetch, { type Response as FetchResponse } from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAllHazards } from "./server/hazards/hazard-source.js";
import { loadLocalEnv } from "./server/env.js";
import { registerAIChatRoute } from "./server/ai/ai-chat-route.js";
import {
  createForwardHeaders,
  createRateLimitMiddleware,
  createRawBodyMiddleware,
  fetchWithTimeout,
  matchDisasterAwareRoute,
  RequestBoundaryError,
  type UpstreamFetch,
  validateQuery,
} from "./server/security/request-boundaries.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");
const disasterAwareBaseUrl = "https://api.disasteraware.com";

export type { UpstreamFetch } from "./server/security/request-boundaries.js";

interface CreateAppOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: UpstreamFetch;
  fetchHazards?: typeof fetchAllHazards;
}

interface DisasterAwareTokenResponse {
  accessToken?: string;
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
  const upstreamFetch = options.fetchImpl ?? (fetch as unknown as UpstreamFetch);
  const fetchHazards = options.fetchHazards ?? fetchAllHazards;
  const upstreamTimeoutMs = readBoundedPositiveInteger(
    serverEnv,
    "DISASTERAWARE_REQUEST_TIMEOUT_MS",
    10_000,
    60_000,
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
  let authorizationRequest: Promise<string> | undefined;

  app.disable("x-powered-by");
  // This BFF is directly addressable in development. Configure trusted proxy hops at deployment time.
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

  app.use(createRawBodyMiddleware());

  registerAIChatRoute(app, [aiRateLimit]);

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const pathname = apiPath(req);
    const localMethods: Record<string, string> = {
      "/ai/chat": "POST",
      "/authorize": "POST",
      "/hazards": "GET",
    };
    const allowedMethod = localMethods[pathname];

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
    try {
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

      const { hazards, meta } = await fetchHazards({ sources });
      const filtered = typeFilter
        ? hazards.filter((hazard) => typeFilter.has(String(hazard.type).toUpperCase()))
        : hazards;

      res.status(200).json({
        success: true,
        data: filtered,
        meta: { ...meta, returned: filtered.length },
      });
    } catch {
      console.error("Hazard aggregation failed.");
      sendApiError(
        res,
        502,
        "HAZARD_AGGREGATION_UNAVAILABLE",
        "Hazard aggregation is unavailable.",
      );
    }
  });

  app.post("/api/authorize", authorizeRateLimit, async (_req: Request, res: Response) => {
    try {
      await getAccessToken();
      res.status(200).json({ authorized: true });
    } catch (error: unknown) {
      console.error("Authorization failed.");
      if (error instanceof RequestBoundaryError && error.code === "UPSTREAM_TIMEOUT") {
        sendApiError(res, 504, error.code, error.message);
        return;
      }
      sendApiError(res, 502, "UPSTREAM_UNAVAILABLE", "Upstream service is unavailable.");
    }
  });

  app.use("/api/hazards", hazardRateLimit, validateQuery, async (req: Request, res: Response) => {
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
      console.error("DisasterAware proxy request failed.");
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
  createApp().listen(port, () => console.log(`Server running on ${port}`));
}
