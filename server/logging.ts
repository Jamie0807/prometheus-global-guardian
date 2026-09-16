/** 创建带有服务端默认日志级别的模块化日志记录器。 */
import { createLogger, resolveLogLevel } from "../shared/logging.js";

export function createServerLogger(module: string, env: NodeJS.ProcessEnv = process.env) {
  return createLogger({
    module,
    level: resolveLogLevel(env.LOG_LEVEL, env.NODE_ENV === "production" ? "info" : "debug"),
  });
}
