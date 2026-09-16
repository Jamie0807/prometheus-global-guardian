/**
 * 定义分析服务的原始记录契约与解析逻辑。
 */
import { AnalyticsContractError, parseRecord } from "./common";

export type AnalyticsJsonValue = string | number | boolean | null;
export type AnalyticsJsonRecord = Record<string, AnalyticsJsonValue>;
export type AnalyticsJsonTreeValue =
  | AnalyticsJsonValue
  | AnalyticsJsonTreeValue[]
  | { [key: string]: AnalyticsJsonTreeValue };
export type AnalyticsJsonTreeRecord = Record<string, AnalyticsJsonTreeValue>;

export function parseAnalyticsJsonRecord(value: unknown, path: string): AnalyticsJsonRecord {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => {
      if (item === null || typeof item === "string" || typeof item === "boolean") {
        return [key, item];
      }
      if (typeof item === "number" && Number.isFinite(item)) return [key, item];
      throw new AnalyticsContractError(`${path}.[key]`);
    }),
  );
}

export function parseAnalyticsJsonRecords(value: unknown, path: string): AnalyticsJsonRecord[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError(path);
  return value.map((item, index) => parseAnalyticsJsonRecord(item, `${path}.${index}`));
}

export function parseAnalyticsJsonTreeValue(value: unknown, path: string): AnalyticsJsonTreeValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (Number.isFinite(value)) return value;
    throw new AnalyticsContractError(path);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => parseAnalyticsJsonTreeValue(item, `${path}.${index}`));
  }

  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      parseAnalyticsJsonTreeValue(item, `${path}.[key]`),
    ]),
  );
}

export function parseAnalyticsJsonTreeRecord(
  value: unknown,
  path: string,
): AnalyticsJsonTreeRecord {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => [
      key,
      parseAnalyticsJsonTreeValue(item, `${path}.[key]`),
    ]),
  );
}

export function parseAnalyticsJsonTreeRecords(
  value: unknown,
  path: string,
): AnalyticsJsonTreeRecord[] {
  if (!Array.isArray(value)) throw new AnalyticsContractError(path);
  return value.map((item, index) => parseAnalyticsJsonTreeRecord(item, `${path}.${index}`));
}
