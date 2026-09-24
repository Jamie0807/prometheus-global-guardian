/**
 * 定义分析服务信息契约与解析逻辑。
 */
import { parseRecord, parseString, parseStringArray } from "./common";

export interface AnalyticsServiceInfo {
  service: string;
  status: string;
  version: string;
  features: string[];
}

export function parseAnalyticsServiceInfo(value: unknown): AnalyticsServiceInfo {
  const record = parseRecord(value, "response");
  return {
    service: parseString(record.service, "response.service"),
    status: parseString(record.status, "response.status"),
    version: parseString(record.version, "response.version"),
    features: parseStringArray(record.features, "response.features"),
  };
}
