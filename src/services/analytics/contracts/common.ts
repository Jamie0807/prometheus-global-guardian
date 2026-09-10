export class AnalyticsContractError extends Error {
  readonly code = "ANALYTICS_RESPONSE_INVALID" as const;
  readonly path: string;

  constructor(path: string, message = "Invalid analytics response") {
    super(`${message} at ${path}`);
    this.name = "AnalyticsContractError";
    this.path = path;
  }
}

export class AnalyticsBusinessError extends Error {
  readonly code = "ANALYTICS_REQUEST_FAILED" as const;

  constructor(message = "Analytics request failed") {
    super(message);
    this.name = "AnalyticsBusinessError";
  }
}

export interface AnalyticsSuccess<T> {
  success: true;
  data: T;
  processingTime?: number;
  timestamp?: string;
}

export function parseRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AnalyticsContractError(path);
  }
  return value as Record<string, unknown>;
}

export function parseFiniteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AnalyticsContractError(path);
  }
  return value;
}

export function parseOptionalFiniteNumber(value: unknown, path: string): number | null | undefined {
  if (value === undefined || value === null) return value;
  return parseFiniteNumber(value, path);
}

export function parseString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new AnalyticsContractError(path);
  return value;
}

export function parseStringArray(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError(path);
  return value.map((item, index) => parseString(item, `${path}.${index}`));
}

export function parseNumberMap(value: unknown, path: string): Record<string, number> {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [key, parseFiniteNumber(item, `${path}.[key]`)]),
  );
}

export function parseAnalyticsSuccess<T>(
  value: unknown,
  parseData: (value: unknown) => T,
): AnalyticsSuccess<T> {
  const record = parseRecord(value, "response");
  if (record.success === false) throw new AnalyticsBusinessError();
  if (record.success !== true) throw new AnalyticsContractError("response.success");
  if (!("data" in record)) throw new AnalyticsContractError("response.data");

  const processingTime =
    "processingTime" in record
      ? parseFiniteNumber(record.processingTime, "response.processingTime")
      : undefined;
  const timestamp =
    "timestamp" in record ? parseString(record.timestamp, "response.timestamp") : undefined;

  return {
    success: true,
    data: parseData(record.data),
    ...(processingTime === undefined ? {} : { processingTime }),
    ...(timestamp === undefined ? {} : { timestamp }),
  };
}
