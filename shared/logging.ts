/**
 * 定义应用日志级别与日志记录器创建逻辑。
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "silent"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export interface LogRecord {
  level: Exclude<LogLevel, "silent">;
  module: string;
  event: string;
  context: Record<string, string | number | boolean>;
}

export interface Logger {
  debug(event: string, context?: Record<string, unknown>): void;
  info(event: string, context?: Record<string, unknown>): void;
  warn(event: string, context?: Record<string, unknown>): void;
  error(event: string, context?: Record<string, unknown>): void;
}

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY,
};

const sensitiveKey = /authorization|body|cookie|error|key|message|password|secret|stack|token/i;

function sanitizeContext(context: Record<string, unknown> | undefined): LogRecord["context"] {
  if (!context) return {};

  const sanitized: LogRecord["context"] = {};
  for (const [key, value] of Object.entries(context)) {
    if (
      !sensitiveKey.test(key) &&
      (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    ) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function defaultSink(record: LogRecord): void {
  console[record.level](JSON.stringify(record));
}

export function resolveLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "warning") return "warn";
  return LOG_LEVELS.includes(normalized as LogLevel) ? (normalized as LogLevel) : fallback;
}

export function createLogger({
  module,
  level,
  sink = defaultSink,
}: {
  module: string;
  level: LogLevel;
  sink?: (record: LogRecord) => void;
}): Logger {
  const log = (
    recordLevel: Exclude<LogLevel, "silent">,
    event: string,
    context?: Record<string, unknown>,
  ): void => {
    if (priorities[recordLevel] < priorities[level]) return;
    sink({ level: recordLevel, module, event, context: sanitizeContext(context) });
  };

  return {
    debug: (event, context) => log("debug", event, context),
    info: (event, context) => log("info", event, context),
    warn: (event, context) => log("warn", event, context),
    error: (event, context) => log("error", event, context),
  };
}
