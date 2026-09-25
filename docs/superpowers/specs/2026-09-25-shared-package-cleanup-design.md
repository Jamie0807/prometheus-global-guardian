# 共享包与兼容层治理设计

状态：已确认，待实施。

## 目标

把跨运行单元的 TypeScript 代码统一放入 `packages/`，让 `shared/` 退出生产代码，保留现有日志行为、灾害领域行为和公开 API。

## 范围

- 新增 `packages/logging/`，包名为 `@pgg/logging`。
- 将 `shared/logging.ts` 的日志级别、脱敏、记录器和公共类型迁入包入口。
- Web 与 BFF 改用 `@pgg/logging`；浏览器与 Node 只通过公共包入口消费。
- 删除 `shared/logging.ts`、`shared/hazards/hazard-event.ts` 和 `shared/hazards/hazard-layer-registry.ts`。
- 测试直接导入 `@pgg/hazard-domain`，不再验证兼容转导出路径。
- 架构门禁拒绝生产代码对 `shared/` 的导入，并确认 `shared/` 不再存在。

## 约束

- 不改变日志级别解析、敏感字段过滤、记录格式和默认 sink。
- `@pgg/logging` 不依赖 Node、React、数据库或运行时配置。
- 不引入新的日志平台、持久化或浏览器存储。
- 继续使用 workspace 包和现有 TypeScript 构建方式。

## 验收

- `pnpm run check:architecture` 检查通过并覆盖 `packages/logging` 元数据和 `shared/` 残留。
- Web、BFF 日志测试通过，日志输出契约不变。
- 客户端、服务端和契约类型检查通过。
- `shared/` 目录不再包含生产代码或兼容转导出文件。
