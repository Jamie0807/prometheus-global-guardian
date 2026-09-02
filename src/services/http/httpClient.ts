import { ServiceError, type ServiceErrorCode } from "./serviceError";

export interface HttpRequestOptions {
  timeoutMs?: number;
  retries?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_ATTEMPTS = 1;
const RETRY_DELAY_MS = 50;

function toServiceError(error: unknown, timeout: boolean): ServiceError {
  if (error instanceof ServiceError) {
    return error;
  }

  const code: ServiceErrorCode = timeout ? "timeout" : "network";
  return new ServiceError(timeout ? "Request timed out" : "Network request failed", code, {
    cause: error,
  });
}

function isRetryable(error: ServiceError): boolean {
  return (
    error.code === "network" ||
    error.code === "timeout" ||
    error.status === 429 ||
    (error.status ?? 0) >= 500
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestResponse(
  input: RequestInfo | URL,
  init: RequestInit = {},
  options: HttpRequestOptions = {},
): Promise<Response> {
  const attempts = Math.max(1, Math.floor(options.retries ?? DEFAULT_ATTEMPTS));
  const timeoutMs = Math.max(1, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let timedOut = false;
    const markTimeout = (): void => {
      timedOut = true;
    };
    controller.signal.addEventListener("abort", markTimeout, { once: true });

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (response.ok) {
        return response;
      }

      const responseBody = await response.text();
      const error = new ServiceError(
        `HTTP request failed: ${response.status} ${response.statusText}`,
        "http",
        { status: response.status, responseBody },
      );

      if (attempt < attempts && isRetryable(error)) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      throw error;
    } catch (error: unknown) {
      const serviceError =
        error instanceof ServiceError
          ? error
          : toServiceError(error, timedOut || isAbortError(error));

      if (attempt < attempts && isRetryable(serviceError)) {
        await delay(RETRY_DELAY_MS);
        continue;
      }

      throw serviceError;
    } finally {
      clearTimeout(timeout);
      controller.signal.removeEventListener("abort", markTimeout);
    }
  }

  throw new ServiceError("Request failed", "network");
}

export async function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: HttpRequestOptions,
): Promise<string> {
  const response = await requestResponse(input, init, options);
  return response.text();
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: HttpRequestOptions,
): Promise<T> {
  const responseText = await requestText(input, init, options);

  try {
    return JSON.parse(responseText) as T;
  } catch (error: unknown) {
    throw new ServiceError("Response body is not valid JSON", "invalid_json", { cause: error });
  }
}

export function requestStream(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: Pick<HttpRequestOptions, "timeoutMs">,
): Promise<Response> {
  return requestResponse(input, init, options);
}

export function requestRaw(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: HttpRequestOptions,
): Promise<Response> {
  return requestResponse(input, init, options);
}
