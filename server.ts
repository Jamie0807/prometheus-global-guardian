import express, { type Application, type NextFunction, type Request, type Response } from "express";
import fetch, { type RequestInit, type Response as FetchResponse } from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";
import getRawBody from "raw-body";
import { fetchAllHazards } from "./hazards-source.js";
import { loadLocalEnv } from "./server/env.js";
import { registerAIChatRoute } from "./server/ai/ai-chat-route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");
const disasterAwareBaseUrl = "https://api.disasteraware.com";

export type UpstreamFetch = (url: string, init?: RequestInit) => Promise<FetchResponse>;

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

function createForwardHeaders(req: Request, accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {};

  for (const [name, value] of Object.entries(req.headers)) {
    if (name === "host" || name === "authorization" || name === "content-length") {
      continue;
    }

    if (typeof value === "string") {
      headers[name] = value;
    }
  }

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return headers;
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

export function createApp(options: CreateAppOptions = {}): Application {
  const app = express();
  const serverEnv = options.env ?? process.env;
  const upstreamFetch = options.fetchImpl ?? (fetch as unknown as UpstreamFetch);
  const fetchHazards = options.fetchHazards ?? fetchAllHazards;
  let accessToken = "";
  let authorizationRequest: Promise<string> | undefined;

  const authorizeUpstream = async (): Promise<string> => {
    const username = serverEnv.DISASTERAWARE_USERNAME;
    const password = serverEnv.DISASTERAWARE_PASSWORD;

    if (!username || !password) {
      throw new Error("DisasterAware server credentials are not configured");
    }

    const response = await upstreamFetch(`${disasterAwareBaseUrl}/authorize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

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

  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        req.rawBody = await getRawBody(req);
      }
    } catch (error: unknown) {
      console.error("Raw body error:", error);
    }
    next();
  });

  registerAIChatRoute(app);

  app.get("/api/hazards", async (req: Request, res: Response) => {
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
    } catch (error: unknown) {
      console.error("/api/hazards error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/authorize", async (_req: Request, res: Response) => {
    try {
      await getAccessToken(true);
      res.status(200).json({ authorized: true });
    } catch (error: unknown) {
      console.error("Authorization failed:", error);
      res.status(502).json({
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.use("/api", async (req: Request, res: Response) => {
    const targetUrl = `${disasterAwareBaseUrl}${req.url}`;
    const requestBody = req.method !== "GET" && req.method !== "HEAD" ? req.rawBody : undefined;

    try {
      const requestUpstream = async (token: string): Promise<FetchResponse> =>
        upstreamFetch(targetUrl, {
          method: req.method,
          headers: createForwardHeaders(req, token),
          body: requestBody,
        });

      let response = await requestUpstream(await getAccessToken());
      if (response.status === 401 || response.status === 403) {
        response = await requestUpstream(await getAccessToken(true));
      }

      const responseBody = await response.text();
      res.status(response.status).send(responseBody);
    } catch (error: unknown) {
      console.error("DisasterAware proxy error:", error);
      res.status(502).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.use(express.static(clientDistPath));
  app.use((_req, res) => {
    res.sendFile(path.join(clientDistPath, "index.html"));
  });

  return app;
}

loadLocalEnv();

const isMainModule = process.argv[1] ? path.resolve(process.argv[1]) === __filename : false;

if (isMainModule) {
  const port = process.env.PORT || 8080;
  createApp().listen(port, () => console.log(`Server running on ${port}`));
}
