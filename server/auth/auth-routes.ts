import { Router, type Request, type Response } from "express";
import { prisma } from "../db/prisma.js";
import { createRateLimitMiddleware } from "../security/request-boundaries.js";
import { isValidPassword, hashPassword, verifyPassword } from "./passwords.js";
import { createRequireUser, isSameOrigin } from "./require-user.js";
import {
  clearSessionCookie,
  createSession,
  createSessionCookie,
  findSession,
  revokeSession,
  revokeToken,
  verifyCsrfToken,
} from "./session-service.js";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseBody(request: Request): RecordValue | undefined {
  if (!request.rawBody?.length) return undefined;
  try {
    const payload: unknown = JSON.parse(request.rawBody.toString("utf8"));
    return isRecord(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}

function normalizeEmail(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    isRecord(error) &&
    error.code === "P2002" &&
    isRecord(error.meta) &&
    Array.isArray(error.meta.target) &&
    error.meta.target.includes("email")
  );
}

function sendInvalidRequest(response: Response): void {
  response.status(400).json({ code: "INVALID_REQUEST", message: "Request data is invalid." });
}

function sendOriginRejected(response: Response): void {
  response.status(403).json({ code: "CSRF_REJECTED", message: "Request origin was rejected." });
}

export function createAuthRouter(env: NodeJS.ProcessEnv = process.env): Router {
  const router = Router();
  const requireAuthenticatedUser = createRequireUser(env);
  const registerRateLimit = createRateLimitMiddleware({
    maxRequests: Number(env.BFF_REGISTER_RATE_LIMIT_MAX) || 5,
  });
  const loginRateLimit = createRateLimitMiddleware({
    maxRequests: Number(env.BFF_LOGIN_RATE_LIMIT_MAX) || 10,
  });

  router.post("/register", registerRateLimit, async (request, response) => {
    if (!isSameOrigin(request, env)) {
      sendOriginRejected(response);
      return;
    }

    const body = parseBody(request);
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    if (!email || !isValidPassword(password)) {
      sendInvalidRequest(response);
      return;
    }

    try {
      const session = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: { email, passwordHash: await hashPassword(password) },
          select: { id: true, email: true },
        });
        return { user, session: await createSession(user.id, transaction) };
      });

      await revokeToken(request);
      response.append("Set-Cookie", createSessionCookie(session.session.rawToken, request, env));
      response.status(201).json({
        user: { id: session.user.id, email: session.user.email },
        csrfToken: session.session.csrfToken,
      });
    } catch (error: unknown) {
      if (isUniqueConstraintError(error)) {
        response.status(409).json({ code: "EMAIL_TAKEN", message: "An account already exists." });
        return;
      }
      response.status(503).json({ code: "AUTH_UNAVAILABLE", message: "Account creation failed." });
    }
  });

  router.post("/login", loginRateLimit, async (request, response) => {
    if (!isSameOrigin(request, env)) {
      sendOriginRejected(response);
      return;
    }

    const body = parseBody(request);
    const email = normalizeEmail(body?.email);
    const password = body?.password;
    if (!email || typeof password !== "string" || password.length > 128) {
      response
        .status(401)
        .json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        response
          .status(401)
          .json({ code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." });
        return;
      }

      await revokeToken(request);
      const session = await createSession(user.id);
      response.append("Set-Cookie", createSessionCookie(session.rawToken, request, env));
      response.status(200).json({
        user: { id: user.id, email: user.email },
        csrfToken: session.csrfToken,
      });
    } catch {
      response.status(503).json({ code: "AUTH_UNAVAILABLE", message: "Sign in is unavailable." });
    }
  });

  router.get("/session", async (request, response) => {
    try {
      const session = await findSession(request);
      if (!session) {
        response.append("Set-Cookie", clearSessionCookie(request, env));
        response.status(200).json({ authenticated: false });
        return;
      }

      response.status(200).json({
        authenticated: true,
        user: { id: session.userId, email: session.email },
        csrfToken: session.csrfToken,
      });
    } catch {
      response.status(503).json({ code: "AUTH_UNAVAILABLE", message: "Session lookup failed." });
    }
  });

  router.post("/logout", async (request, response) => {
    if (!isSameOrigin(request, env)) {
      sendOriginRejected(response);
      return;
    }

    try {
      const session = await findSession(request);
      if (session && !verifyCsrfToken(session.csrfToken, request.get("x-csrf-token"))) {
        sendOriginRejected(response);
        return;
      }
      if (session) await revokeSession(session.id);
      response.append("Set-Cookie", clearSessionCookie(request, env));
      response.status(204).end();
    } catch {
      response.status(503).json({ code: "AUTH_UNAVAILABLE", message: "Sign out failed." });
    }
  });

  router.patch("/account", requireAuthenticatedUser, async (request, response) => {
    const body = parseBody(request);
    if (
      !request.user ||
      typeof body?.memoryEnabled !== "boolean" ||
      Object.keys(body).length !== 1
    ) {
      sendInvalidRequest(response);
      return;
    }
    try {
      const result = await prisma.user.updateMany({
        where: { id: request.user.userId },
        data: { memoryEnabled: body.memoryEnabled },
      });
      if (result.count === 0) {
        response.status(401).json({ code: "AUTH_REQUIRED", message: "Sign in to continue." });
        return;
      }
      response.status(200).json({ memoryEnabled: body.memoryEnabled });
    } catch {
      response
        .status(503)
        .json({ code: "AUTH_UNAVAILABLE", message: "Could not update account preferences." });
    }
  });

  router.delete("/account", requireAuthenticatedUser, async (request, response) => {
    const body = parseBody(request);
    const password = body?.password;
    if (typeof password !== "string" || password.length > 128 || !request.user) {
      sendInvalidRequest(response);
      return;
    }

    try {
      const user = await prisma.user.findUnique({ where: { id: request.user.userId } });
      if (!user || !(await verifyPassword(user.passwordHash, password))) {
        response
          .status(401)
          .json({ code: "INVALID_CREDENTIALS", message: "Password is incorrect." });
        return;
      }

      await prisma.user.delete({ where: { id: user.id } });
      response.append("Set-Cookie", clearSessionCookie(request, env));
      response.status(204).end();
    } catch {
      response.status(503).json({ code: "AUTH_UNAVAILABLE", message: "Account deletion failed." });
    }
  });

  return router;
}
