import type { RequestHandler } from "express";
import { clearSessionCookie, findSession, verifyCsrfToken } from "./session-service.js";

export function isSameOrigin(
  request: Parameters<RequestHandler>[0],
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const origin = request.get("origin");
  const host = request.get("host");
  if (!origin) return false;

  const publicOrigin = env.PUBLIC_ORIGIN?.trim();
  if (publicOrigin) {
    try {
      return new URL(origin).origin === new URL(publicOrigin).origin;
    } catch {
      return false;
    }
  }
  if (!host) return false;

  try {
    return new URL(origin).origin === `${request.protocol}://${host}`;
  } catch {
    return false;
  }
}

export function createRequireUser(env: NodeJS.ProcessEnv = process.env): RequestHandler {
  return async (request, response, next) => {
    try {
      const session = await findSession(request);
      if (!session) {
        response.append("Set-Cookie", clearSessionCookie(request, env));
        response.status(401).json({ code: "AUTH_REQUIRED", message: "Sign in to continue." });
        return;
      }

      const isMutation = !["GET", "HEAD", "OPTIONS"].includes(request.method);
      if (
        isMutation &&
        (!isSameOrigin(request, env) ||
          !verifyCsrfToken(session.csrfToken, request.get("x-csrf-token")))
      ) {
        response
          .status(403)
          .json({ code: "CSRF_REJECTED", message: "Request origin was rejected." });
        return;
      }

      request.user = { userId: session.userId, email: session.email };
      request.authSession = { id: session.id, csrfToken: session.csrfToken };
      next();
    } catch {
      response
        .status(503)
        .json({ code: "AUTH_UNAVAILABLE", message: "Authentication is unavailable." });
    }
  };
}

export const requireUser = createRequireUser();
