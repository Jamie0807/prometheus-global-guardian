import { requestJson, requestStream } from "../http/httpClient";
import { ServiceError } from "../http/serviceError";

let authorized = false;

export async function authorize(): Promise<void> {
  await requestJson<{ authorized: boolean }>("/api/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
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
  try {
    return await requestStream(url);
  } catch (error: unknown) {
    if (error instanceof ServiceError && (error.status === 401 || error.status === 403)) {
      await refreshAccessToken();
      return requestStream(url);
    }
    throw error;
  }
}
