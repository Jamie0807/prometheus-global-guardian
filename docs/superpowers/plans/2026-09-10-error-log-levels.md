# 前后端日志分级实施计划

> 执行方式：subagent-driven-development，独立实现、任务级复核、最终整体复核。

**目标：** 统一三端日志等级，减少重复与敏感输出，并区分用户提示和开发诊断。

**架构：** TypeScript 共享纯日志核心，浏览器与 BFF 分别注入环境配置。Python 使用标准 logging 的集中配置。沿用现有 HTTP 错误契约。

**技术栈：** React、TypeScript、Express、Python logging、Vitest、unittest。

## 全局约束

- debug、info、warn、error、silent 阈值；非法值回落环境默认。
- 前端 VITE_LOG_LEVEL：开发 debug、生产 warn；后端 LOG_LEVEL：开发 debug、生产 info。
- BFF 以 NODE_ENV=production 判断生产；Python 以 APP_ENV=production 判断生产，未配置 APP_ENV 默认 production，以适配现有部署。
- 静态事件名配合允许列表上下文，不记录凭据、请求头、完整业务数据、原始响应体或未脱敏的异常消息。
- 不改变业务算法、重试次数、HTTP 状态或错误码。取消请求不报错，正常空结果不警告；最终失败与可恢复降级分开。
- 先测试失败再实现；仅改动任务范围；手动编辑使用 apply_patch；不暂存、不提交、不推送。

## 任务 1：共享日志核心及 BFF

文件：新增 shared/logging.ts、server/logging.ts、tests/service-logging.test.ts；修改 server.ts、server/ai/ai-chat-route.ts，必要时修改 server/security 中的日志入口。

接口：shared/logging.ts 导出 createLogger(options)、resolveLogLevel(value, fallback)、LogLevel。options 为 { module: string; level: LogLevel; sink?: (record: LogRecord) => void }；返回 debug/info/warn/error 四个方法，签名 (event: string, context?: Record<string, unknown>) => void。LogRecord 包含 level、module、event、context。默认 sink 使用对应 console 方法。允许上下文限定为安全字段（数值状态、计数、耗时、稳定错误码、UUID 请求标识），丢弃原始 Error/堆栈/正文/令牌。

- [ ] 编写 tests/service-logging.test.ts，覆盖各阈值和 silent、配置回落、结构化输出、敏感字段和嵌套异常过滤。
- [ ] 运行 `pnpm run test:services -- tests/service-logging.test.ts`，记录缺失模块或断言失败。
- [ ] 实现共享核心与 BFF wrapper，环境配置使用 `resolveLogLevel(process.env.LOG_LEVEL, process.env.NODE_ENV === "production" ? "info" : "debug")`。
- [ ] 迁移 BFF 日志，AI 请求终态按状态分级，成功 info、可恢复/客户端错误 warn、服务异常 error、用户取消 debug；保留安全关联字段。
- [ ] 运行定向测试与 BFF 契约测试，任务级复核。

## 任务 2：前端日志及错误展示

文件：新增 src/utils/logger.ts 与错误展示辅助模块（如需要）、tests/component/error-boundary.test.tsx、tests/service-client-logging.test.ts；修改 src 内现有日志和错误展示调用。

消费任务 1 的 createLogger/resolveLogLevel 接口。浏览器 wrapper 以 import.meta.env.PROD 选择默认等级，提供模块级 logger。共享模块引用由 Vite 编译，不导入 server 文件。

- [ ] 写生产错误边界与 logger 默认值测试，验证原始异常正文/堆栈在生产不展示。
- [ ] 运行定向测试并记录失败。
- [ ] 实现浏览器 logger；迁移直接 console 调用到静态事件名，删除完整 payload 输出；图表交互/状态变动 debug，回退 warn，最终失败 error。
- [ ] 对每条失败链明确唯一日志责任层；请求层抛错不重复日志，处理回退或展示的层记录；用户取消不记录 error。
- [ ] ErrorBoundary 展示安全用户提示，仅开发环境允许诊断；检查其他界面不显示原始 responseBody 或异常消息。
- [ ] 运行相关 services/component 测试并任务级复核。

## 任务 3：Python 集中日志配置

文件：新增 python-analytics-service/log_config.py、python-analytics-service/tests/test_logging_config.py；修改 main.py 与 analytics 中现有日志调用。

接口：configure_logging() 从 LOG_LEVEL 和 APP_ENV 选择阈值；使用标准 logging，业务模块不再调用 basicConfig。

- [ ] unittest 覆盖环境默认、非法值、silent、过滤与错误诊断脱敏。
- [ ] 运行 `python -m unittest discover -s tests -p 'test_logging_config.py'` 并记录失败。
- [ ] 实现集中配置，将动态消息改为稳定事件名和安全上下文；保留模块、等级与已有请求关联。
- [ ] 缓存和中间过程 debug，可恢复算法回退 warn，最终接口失败 error；避免同一异常重复记录。
- [ ] 检查现有错误接口不返回原始异常；运行 Python 全部 unittest 并任务级复核。

## 任务 4：配置接线、说明与整体验证

文件：.env.example、Dockerfile、docker-compose.yml、README.md、python-analytics-service/README.md，以及本计划与设计稿。

- [ ] 接通 VITE_LOG_LEVEL 构建变量和 LOG_LEVEL、APP_ENV 运行时变量，文档说明修改浏览器等级需要重建。
- [ ] 说明等级、默认环境、敏感信息策略、调试方法。
- [ ] 执行 lint、format:check、pnpm test、typecheck:client、typecheck:server、build、git diff --check，另执行组件及 Python 测试。
- [ ] 最终整体复核并解决重要问题，记录实际输出和限制。

## 进度记录

- 用户已确认设计，开始实施；已有设计稿属于本需求。
