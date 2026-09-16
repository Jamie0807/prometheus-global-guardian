/**
 * 提供客户端日志记录器创建工具。
 */
import { createLogger, resolveLogLevel } from "../../shared/logging.js";
import type { LogLevel, Logger } from "../../shared/logging.js";

export function getClientLogLevel(value: string | undefined, isProduction: boolean): LogLevel {
  return resolveLogLevel(value, isProduction ? "warn" : "debug");
}

export function createClientLogger(module: string): Logger {
  return createLogger({
    module,
    level: getClientLogLevel(import.meta.env.VITE_LOG_LEVEL, import.meta.env.PROD),
  });
}

export const logger = createClientLogger("client");
