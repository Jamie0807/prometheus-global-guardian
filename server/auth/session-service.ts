import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import type { PrismaClient } from "../generated/prisma/client.js";
import { prisma } from "../db/prisma.js";

export const SESSION_COOKIE_NAME = "pg_session";
const DEFAULT_IDLE_TTL_MS = 30 * 60 * 1000;
const DEFAULT_ABSOLUTE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CSRF_SECRET = resolveCsrfSecret();

function resolveCsrfSecret(): string {
  const configuredSecret = process.env.AUTH_CSRF_SECRET;
  const isPlaceholder = configuredSecret?.toLowerCase().startsWith("replace_with_") ?? false;
  if (configuredSecret && configuredSecret.length >= 32 && !isPlaceholder) return configuredSecret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_CSRF_SECRET must be a non-placeholder secret with at least 32 characters in production.",
    );
  }
  return randomBytes(32).toString("base64url");
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const SESSION_IDLE_TTL_MS = readPositiveInteger(
  process.env.AUTH_SESSION_IDLE_TTL_MS,
  DEFAULT_IDLE_TTL_MS,
);
export const SESSION_ABSOLUTE_TTL_MS = readPositiveInteger(
  process.env.AUTH_SESSION_ABSOLUTE_TTL_MS,
  DEFAULT_ABSOLUTE_TTL_MS,
);

export type AuthenticatedSession = {
  readonly id: string;
  readonly userId: string;
  readonly email: string;
  readonly csrfToken: string;
};

export type CreatedSession = AuthenticatedSession & {
  readonly rawToken: string;
  readonly expiresAt: Date;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function csrfForSession(sessionId: string): string {
  return createHmac("sha256", CSRF_SECRET).update(sessionId).digest("base64url");
}

export function verifyCsrfToken(expected: string, provided: string | undefined): boolean {
  if (!provided) return false;
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  return (
    expectedBytes.length === providedBytes.length && timingSafeEqual(expectedBytes, providedBytes)
  );
}

export function readSessionToken(request: Request): string | undefined {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return undefined;

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== SESSION_COOKIE_NAME) continue;
    const token = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{40,64}$/.test(token) ? token : undefined;
  }

  return undefined;
}

function isSecureRequest(request: Request, env: NodeJS.ProcessEnv): boolean {
  if (request.secure) return true;
  const publicOrigin = env.PUBLIC_ORIGIN?.trim();
  if (!publicOrigin) return false;
  try {
    return new URL(publicOrigin).protocol === "https:";
  } catch {
    return false;
  }
}

export function createSessionCookie(
  token: string,
  request: Request,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secure = isSecureRequest(request, env) ? "; Secure" : "";
  const maxAgeSeconds = Math.floor(SESSION_ABSOLUTE_TTL_MS / 1000);
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearSessionCookie(request: Request, env: NodeJS.ProcessEnv = process.env): string {
  const secure = isSecureRequest(request, env) ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

type SessionWriter = Pick<PrismaClient, "authSession">;

export async function createSession(
  userId: string,
  client: SessionWriter = prisma,
): Promise<CreatedSession> {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_TTL_MS);
  const session = await client.authSession.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    },
    select: { id: true, userId: true, user: { select: { email: true } } },
  });

  return {
    id: session.id,
    userId: session.userId,
    email: session.user.email,
    csrfToken: csrfForSession(session.id),
    rawToken,
    expiresAt,
  };
}

export async function findSession(request: Request): Promise<AuthenticatedSession | undefined> {
  const token = readSessionToken(request);
  if (!token) return undefined;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      userId: true,
      lastSeenAt: true,
      expiresAt: true,
      user: { select: { email: true } },
    },
  });
  if (!session) return undefined;

  const now = Date.now();
  if (
    session.expiresAt.getTime() <= now ||
    session.lastSeenAt.getTime() <= now - SESSION_IDLE_TTL_MS
  ) {
    await prisma.authSession.deleteMany({ where: { id: session.id } });
    return undefined;
  }

  if (session.lastSeenAt.getTime() <= now - 5 * 60 * 1000) {
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(now) },
    });
  }

  return {
    id: session.id,
    userId: session.userId,
    email: session.user.email,
    csrfToken: csrfForSession(session.id),
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.deleteMany({ where: { id: sessionId } });
}

export async function revokeToken(request: Request): Promise<void> {
  const token = readSessionToken(request);
  if (!token) return;
  await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
}
