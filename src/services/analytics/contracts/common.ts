/**
 * 定义分析服务数据契约的通用解析与校验工具。
 */
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
  readonly serviceCode?: string;
  readonly requestId?: string;

  constructor(
    message = "Analytics request failed",
    options: { serviceCode?: string; requestId?: string } = {},
  ) {
    super(message);
    this.name = "AnalyticsBusinessError";
    this.serviceCode = options.serviceCode;
    this.requestId = options.requestId;
  }
}

export interface AnalyticsResponseMetadata {
  schemaVersion: string;
  requestId: string;
  generatedAt: string;
  modelVersion: string;
  inputSnapshotId: string;
  warnings: string[];
}

export interface AnalyticsErrorEnvelope {
  success: false;
  schemaVersion: string;
  requestId: string;
  generatedAt: string;
  modelVersion: string;
  warnings: string[];
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export interface AnalyticsSuccess<T> {
  success: true;
  data: T;
  schemaVersion?: string;
  requestId?: string;
  generatedAt?: string;
  modelVersion?: string;
  inputSnapshotId?: string;
  warnings?: string[];
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

function parseResponseMetadata(
  record: Record<string, unknown>,
): Partial<AnalyticsResponseMetadata> {
  const metadataKeys = [
    "schemaVersion",
    "requestId",
    "generatedAt",
    "modelVersion",
    "inputSnapshotId",
    "warnings",
  ] as const;
  if (!metadataKeys.some((key) => key in record)) return {};

  return {
    schemaVersion: parseString(record.schemaVersion, "response.schemaVersion"),
    requestId: parseString(record.requestId, "response.requestId"),
    generatedAt: parseString(record.generatedAt, "response.generatedAt"),
    modelVersion: parseString(record.modelVersion, "response.modelVersion"),
    inputSnapshotId: parseString(record.inputSnapshotId, "response.inputSnapshotId"),
    warnings: parseStringArray(record.warnings, "response.warnings"),
  };
}

function validateErrorEnvelope(record: Record<string, unknown>): void {
  const metadataKeys = ["schemaVersion", "requestId", "generatedAt", "modelVersion", "warnings"];
  if (!metadataKeys.some((key) => key in record)) return;

  parseString(record.schemaVersion, "response.schemaVersion");
  parseString(record.requestId, "response.requestId");
  parseString(record.generatedAt, "response.generatedAt");
  parseString(record.modelVersion, "response.modelVersion");
  parseStringArray(record.warnings, "response.warnings");
  const error = parseRecord(record.error, "response.error");
  parseString(error.code, "response.error.code");
  parseString(error.message, "response.error.message");
  parseString(error.requestId, "response.error.requestId");
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
  if (record.success === false) {
    validateErrorEnvelope(record);
    const error =
      "error" in record && typeof record.error === "object" && record.error !== null
        ? parseRecord(record.error, "response.error")
        : {};
    const serviceCode =
      "code" in error ? parseString(error.code, "response.error.code") : undefined;
    const requestId =
      "requestId" in record
        ? parseString(record.requestId, "response.requestId")
        : "requestId" in error
          ? parseString(error.requestId, "response.error.requestId")
          : undefined;
    throw new AnalyticsBusinessError("Analytics request failed", { serviceCode, requestId });
  }
  if (record.success !== true) throw new AnalyticsContractError("response.success");
  if (!("data" in record)) throw new AnalyticsContractError("response.data");

  const processingTime =
    "processingTime" in record
      ? parseFiniteNumber(record.processingTime, "response.processingTime")
      : undefined;
  const timestamp =
    "timestamp" in record ? parseString(record.timestamp, "response.timestamp") : undefined;
  const metadata = parseResponseMetadata(record);

  return {
    success: true,
    data: parseData(record.data),
    ...metadata,
    ...(processingTime === undefined ? {} : { processingTime }),
    ...(timestamp === undefined ? {} : { timestamp }),
  };
}
