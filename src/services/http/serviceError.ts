export type ServiceErrorCode = "network" | "timeout" | "http" | "invalid_json" | "invalid_response";

export interface ServiceErrorOptions {
  status?: number;
  responseBody?: string;
  cause?: unknown;
}

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status?: number;
  readonly responseBody?: string;
  readonly cause?: unknown;

  constructor(message: string, code: ServiceErrorCode, options: ServiceErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "ServiceError";
    this.code = code;
    this.status = options.status;
    this.responseBody = options.responseBody;
    this.cause = options.cause;
  }
}
