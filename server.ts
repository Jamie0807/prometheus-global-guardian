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
} from "./server/hazards/hazard-source.js";
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
  now?: () => Date;
}

const HAZARD_SOURCE_CACHE_TTL_MS = 300_000;

interface DisasterAwareTokenResponse {
  accessToken?: string;
}

type DisasterAwareHazard = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: DisasterAwareHazard, key: string, fallback = ""): string {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readFiniteNumber(record: DisasterAwareHazard, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function adaptDisasterAwareHazards(payload: unknown): ServerHazard[] {
  if (!Array.isArray(payload)) return [];

  return payload.filter(isRecord).map((hazard, index) => {
    const latitude = readFiniteNumber(hazard, "latitude");
    const longitude = readFiniteNumber(hazard, "longitude");
    const hazardId = hazard.hazard_ID;
    const timestamp = readString(hazard, "create_Date");
    const severity = readString(hazard, "severity_ID");

    return {
      id:
        typeof hazardId === "number" || typeof hazardId === "string"
          ? String(hazardId)
          : `da-${index}`,
      title: readString(hazard, "hazard_Name", "Unknown Hazard"),
      type: readString(hazard, "type_ID", "UNKNOWN"),
      geometry: {
        type: "Point",
        coordinates:
          latitude === undefined || longitude === undefined ? [0, 0] : [longitude, latitude],
      },
      description: readString(
        hazard,
        "description",
        readString(hazard, "hazard_Name", "No description available"),
      ),
      source: readString(hazard, "creator", "DisasterAWARE"),
      ...(severity ? { severity } : {}),
      ...(timestamp ? { timestamp } : {}),
    } satisfies ServerHazard;
  });
}

const fallbackSourceIds = ["usgs", "nasa-eonet", "gdacs"] as const;

function completeFallbackSourceStatuses(
  sources: readonly HazardSourceStatus[],
  defaultStatus: HazardSourceStatus["status"],
): HazardSourceStatus[] {
  return fallbackSourceIds.map(
    (id) => sources.find((source) => source.id === id) ?? { id, status: defaultStatus, count: 0 },
  );
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
  const now = options.now ?? (() => new Date());
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
  let authorizationRequest: Promise<string> | undefined;
  const sourceCache = new Map<HazardSourceId, CachedHazardSource>();

  const loadSource = async (
    source: HazardSourceId,
    load: () => Promise<ServerHazard[]>,
  ): Promise<HazardSourceLoadResult> => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const hazards = await load();
        const fetchedAt = now().toISOString();
        sourceCache.set(source, { hazards, fetchedAt });
        return {
          hazards,
          status: {
            id: source,
            status: hazards.length > 0 ? "success" : "empty",
            count: hazards.length,
            fetchedAt,
          },
        };
      } catch {
        // A second attempt and a cached response are handled below without exposing upstream details.
      }
    }

    const cached = sourceCache.get(source);
    const fetchedAtMs = cached ? Date.parse(cached.fetchedAt) : Number.NaN;
    if (
      cached &&
      Number.isFinite(fetchedAtMs) &&
      now().getTime() - fetchedAtMs <= HAZARD_SOURCE_CACHE_TTL_MS
    ) {
      return {
        hazards: cached.hazards,
        status: {
          id: source,
          status: "stale",
          count: cached.hazards.length,
          fetchedAt: cached.fetchedAt,
        },
      };
    }

    return { hazards: [], status: { id: source, status: "unavailable", count: 0 } };
  };

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

    return adaptDisasterAwareHazards(await readJsonResponse(response));
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
        fallbackSources = completeFallbackSourceStatuses(fallback.sources, "fallback");
      } catch {
        fallbackSources = completeFallbackSourceStatuses(
          [
            { id: "usgs", status: "unavailable", count: 0 },
            { id: "nasa-eonet", status: "unavailable", count: 0 },
            { id: "gdacs", status: "unavailable", count: 0 },
          ],
          "unavailable",
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
      );
    }

    const uniqueHazards = [
      ...new Map(hazards.map((hazard) => [`${hazard.source}:${hazard.id}`, hazard])).values(),
    ];
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
