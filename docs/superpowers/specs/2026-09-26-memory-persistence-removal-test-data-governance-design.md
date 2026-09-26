# 移除旧 Memory 持久化与测试数据治理设计

## 背景

当前产品把同一会话内的聊天记录自动保存到 `ai_conversations` 和 `ai_messages`，长对话使用 `ai_conversations.summary` 做上下文压缩。旧的 `ai_memory_items`、`ai_memory_suggestions` 以及用户确认式长期记忆入口已经不属于当前产品需求，但 Prisma 模型、BFF 路由、账号开关和运维健康检查仍然保留。

同时，后端集成测试会通过注册接口创建随机 `@example.test` 账号和会话。若测试使用当前开发数据库，测试数据会污染本地账号与对话数据。

## 目标

1. 删除旧 Memory 表及所有生产代码依赖，保留聊天记录和同会话摘要。
2. 通过版本化 Prisma migration 删除现有数据库中的旧 Memory 表、状态枚举和账号记忆开关字段。
3. 将自动化测试数据隔离与清理方案写入项目待优化清单，本次不把测试治理实现混入 Memory 清理。

## 非目标

- 不删除 `ai_conversations`、`ai_messages` 或 `ai_conversations.summary`。
- 不把每条聊天消息复制到 Memory 表。
- 本次不实现完整的测试数据库隔离方案，只记录具体治理要求。
- 不修改历史 Spec/Plan 中对旧架构的历史记录；当前 README、项目规格和运维文档需要与新架构一致。

## 方案

### Memory 清理

- 从 Prisma schema 移除 `AIMemorySuggestionStatus`、`User.memoryEnabled`、用户/会话 Memory relations 以及两个 Memory model。
- 从 BFF 移除 Memory router、repository 和记忆建议生成逻辑；保留摘要生成函数并放入独立的上下文摘要模块。
- 从账号 API 移除仅用于 `memoryEnabled` 的 PATCH 行为；保留账号删除。
- 从数据库健康检查的必需表列表移除两个 Memory 表。
- 新增迁移按顺序删除 `ai_memory_suggestions`、`ai_memory_items`、`AIMemorySuggestionStatus` 和 `users.memory_enabled`。
- 当前开发数据库执行该 migration；迁移前应确认两张表为空，避免误删历史数据。

### 自动化测试数据治理记录

待优化清单新增 P1 项：

- 数据库集成测试必须使用独立 Compose 项目/数据库，禁止读取根项目开发数据库。
- 测试启动时必须校验 `DATABASE_URL` 指向测试数据库，拒绝开发库、生产库和宿主默认库。
- 测试账号、会话、对话和消息应在每个测试或测试批次结束后清理，或使用一次性数据库卷。
- CI 与本地命令使用同一隔离入口，并保留失败时的诊断输出但不打印凭据或消息正文。

## 验收标准

- `prisma/schema.prisma`、BFF 代码和当前文档不再引用已删除 Memory 表/模型/路由。
- 新 migration 可在现有开发数据库应用，两个 Memory 表和 `memory_enabled` 不再存在。
- `db:check` 只检查当前仍需要的业务表。
- 聊天创建、消息持久化和摘要压缩的定向测试保持通过。
- 待优化清单明确记录测试数据隔离、数据库保护和清理要求。
