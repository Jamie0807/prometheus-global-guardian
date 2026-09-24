import { requestJson, requestRaw } from "../http/httpClient";
import { ServiceError } from "../http/serviceError";

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthSessionResponse =
  | { authenticated: false }
  | { authenticated: true; user: AuthUser; csrfToken: string };

export interface AuthenticatedResponse {
  user: AuthUser;
  csrfToken: string;
}

export class AuthApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, code: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUser(value: unknown): AuthUser {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.email !== "string") {
    throw new AuthApiError("登录响应无效，请重试。", "INVALID_RESPONSE");
  }
  return { id: value.id, email: value.email };
}

function messageFor(code: string, status?: number): string {
  if (code === "EMAIL_TAKEN") return "这个邮箱已注册，请直接登录。";
  if (code === "INVALID_CREDENTIALS") return "邮箱或密码不正确。";
  if (code === "RATE_LIMITED" || status === 429) return "尝试次数过多，请稍后再试。";
  if (code === "INVALID_REQUEST") return "请检查邮箱和密码格式。";
  if (status === 503) return "认证服务暂时不可用，请稍后重试。";
  return "请求失败，请检查网络后重试。";
}

function normalizeRequestError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error;
  if (error instanceof ServiceError) {
    let code = "REQUEST_FAILED";
    try {
      const parsed: unknown = JSON.parse(error.responseBody ?? "");
      if (isRecord(parsed) && typeof parsed.code === "string") code = parsed.code;
    } catch {
      // Error bodies are optional; the HTTP status still provides a useful fallback.
    }
    return new AuthApiError(messageFor(code, error.status), code, error.status);
  }
  return new AuthApiError(messageFor("NETWORK_ERROR"), "NETWORK_ERROR");
}

async function sendCredentials(
  path: "/api/auth/login" | "/api/auth/register",
  email: string,
  password: string,
): Promise<AuthenticatedResponse> {
  try {
    const value = await requestJson(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!isRecord(value) || typeof value.csrfToken !== "string") {
      throw new AuthApiError("登录响应无效，请重试。", "INVALID_RESPONSE");
    }
    return { user: parseUser(value.user), csrfToken: value.csrfToken };
  } catch (error: unknown) {
    throw normalizeRequestError(error);
  }
}

export async function getAuthSession(): Promise<AuthSessionResponse> {
  try {
    const value = await requestJson("/api/auth/session", { method: "GET" });
    if (!isRecord(value) || typeof value.authenticated !== "boolean") {
      throw new AuthApiError("会话响应无效。", "INVALID_RESPONSE");
    }
    if (!value.authenticated) return { authenticated: false };
    if (typeof value.csrfToken !== "string") {
      throw new AuthApiError("会话响应无效。", "INVALID_RESPONSE");
    }
    return {
      authenticated: true,
      user: parseUser(value.user),
      csrfToken: value.csrfToken,
    };
  } catch (error: unknown) {
    throw normalizeRequestError(error);
  }
}

export function login(email: string, password: string): Promise<AuthenticatedResponse> {
  return sendCredentials("/api/auth/login", email, password);
}

export function register(email: string, password: string): Promise<AuthenticatedResponse> {
  return sendCredentials("/api/auth/register", email, password);
}

export async function logout(): Promise<void> {
  try {
    await requestRaw("/api/auth/logout", { method: "POST" });
  } catch (error: unknown) {
    throw normalizeRequestError(error);
  }
}

export async function deleteAccount(password: string): Promise<void> {
  try {
    await requestRaw("/api/auth/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
  } catch (error: unknown) {
    throw normalizeRequestError(error);
  }
}
