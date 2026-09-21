/**
 * 提供身份认证及令牌管理服务。
 */
import { requestJson, requestStream } from "../http/httpClient";
import { ServiceError } from "../http/serviceError";

let authorized = false;

function parseAuthorizeResponse(value: unknown): { authorized: true } {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { authorized?: unknown }).authorized !== true
  ) {
    throw new ServiceError("Authorization response is invalid", "invalid_response");
  }

  return { authorized: true };
}

export async function authorize(): Promise<void> {
  parseAuthorizeResponse(
    await requestJson("/api/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
  authorized = true;
}

export function getAccessToken(): string {
  return authorized ? "bff-managed" : "";
}

export async function refreshAccessToken(): Promise<void> {
  authorized = false;
  await authorize();
}

export async function authFetch(url: string): Promise<Response> {
  return requestStream(url);
}
