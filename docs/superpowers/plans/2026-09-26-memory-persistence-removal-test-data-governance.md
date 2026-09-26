# 移除旧 Memory 持久化与测试数据治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除不再使用的 Memory 持久化表和运行时代码，保留自动聊天记录/摘要，并记录自动化测试数据隔离治理方案。

**Architecture:** `AIMessage` 是聊天记录事实来源，`AIConversation.summary` 是同会话上下文压缩摘要。旧 Memory API、Prisma 模型和账号开关全部移除；通过新增前向 migration 清理已有数据库结构。测试数据治理先沉淀为待优化项，不改变本轮测试运行方式。

**Tech Stack:** Prisma/PostgreSQL、Express、TypeScript、Vitest、Docker Compose、Markdown。

## Global Constraints

- 保留 `ai_conversations`、`ai_messages` 和 `ai_conversations.summary`。
- 不打印、提交或暴露数据库凭据、测试密码、消息正文或个人数据。
- 手动文件修改使用 `apply_patch`；不执行 `git reset --hard`、强制推送或自动提交。
- 数据库删除仅针对 `ai_memory_items`、`ai_memory_suggestions`、`AIMemorySuggestionStatus` 和 `users.memory_enabled`。

### Task 1: 健康检查回归测试

**Files:**

- Modify: `infra/persistence/tests/service-persistence-ops.test.ts`

- [x] **Step 1: Write the failing test**

新增测试调用 `checkDatabase`，收集 Compose 查询参数，并断言生成的健康检查 SQL 不包含 `ai_memory_items`、`ai_memory_suggestions`。

- [x] **Step 2: Run test to verify it fails**

运行：

```bash
pnpm exec vitest run infra/persistence/tests/service-persistence-ops.test.ts
```

预期：新增断言失败，因为当前 `requiredTables` 仍包含两个 Memory 表。

### Task 2: 删除运行时代码与 Prisma 模型

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `apps/bff/index.ts`
- Modify: `apps/bff/auth/auth-routes.ts`
- Modify: `apps/bff/ai/ai-chat-route.ts`
- Modify: `apps/bff/ai/memory-generation.ts`
- Delete: `apps/bff/ai/memory-routes.ts`
- Delete: `apps/bff/ai/memory-repository.ts`
- Create: `apps/bff/ai/context-summary.ts`
- Modify: `infra/persistence/db-ops.mjs`

- [x] **Step 1: Move the summary function**

将 `summarizeTrimmedConversation` 和其摘要提示词移到 `context-summary.ts`，保留 `ai-chat-route.ts` 的导入行为和返回类型；删除 `memory-generation.ts` 中的建议生成逻辑并删除该文件。

- [x] **Step 2: Remove Memory runtime references**

移除 BFF Memory router 挂载、`/api/ai/memories*` 与 `/api/ai/memory-suggestions*` 路由、账号 `memoryEnabled` PATCH 分支和 Memory repository。

- [x] **Step 3: Remove Prisma schema references**

移除 Memory enum、User 的 `memoryEnabled`/relations、AIConversation 的 Memory relations、两个 Memory model。

- [x] **Step 4: Remove health-check requirements**

从 `requiredTables` 和健康检查成功日志中移除两个 Memory 表。

- [x] **Step 5: Run focused validation**

运行：

```bash
pnpm run build:server:test
pnpm exec vitest run infra/persistence/tests/service-persistence-ops.test.ts apps/bff/tests/ai-provider.test.ts apps/bff/tests/context-manager.test.ts
```

预期：schema 生成、上下文摘要和持久化运维测试通过。

### Task 3: 新增并应用数据库 migration

**Files:**

- Create: `prisma/migrations/20260926120000_remove_legacy_ai_memory/migration.sql`

- [x] **Step 1: Verify destructive targets are empty**

只读检查 `ai_memory_items` 和 `ai_memory_suggestions` 的数量；如果任一表非空，停止并报告，不执行删除。

- [x] **Step 2: Add forward migration**

迁移按顺序删除两个表、`AIMemorySuggestionStatus` 枚举和 `users.memory_enabled` 字段。

- [x] **Step 3: Apply and verify**

运行：

```bash
docker compose run --rm --no-deps web pnpm exec prisma migrate deploy
docker compose exec -T db psql -U prometheus -d prometheus -tAc "SELECT to_regclass('public.ai_memory_items'), to_regclass('public.ai_memory_suggestions'), EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='memory_enabled');"
```

预期：迁移成功，查询结果为 `,,f`。

### Task 4: 同步当前文档与待优化清单

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/OPERATIONS_PERSISTENCE.md`（若存在旧表清单）
- Modify: `.superpowers/sdd/progress.md`

- [x] **Step 1: Update current architecture wording**

将当前文档中的“用户确认长期记忆”改为自动保存聊天记录、同会话摘要；账号接口仅保留账号删除/会话相关能力。

- [x] **Step 2: Record both optimization items**

在待优化清单记录 Memory 表清理结果，以及 P1 自动化测试数据治理：独立数据库、`DATABASE_URL` 保护、测试数据清理和 CI/本地统一入口。

- [x] **Step 3: Scan and validate**

运行当前文档与生产代码引用扫描、Prettier、TypeScript 类型检查、Service/持久化定向测试和 `git diff --check`。

### Task 5: Final verification

- [x] **Step 1: Run project gates**

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run test:services
pnpm run build
git diff --check
```

- [x] **Step 2: Verify runtime health**

```bash
docker compose ps
curl -fsS http://127.0.0.1:8080/health
```

- [x] **Step 3: Report migration and data impact**

交付说明必须明确 Memory 表已删除、聊天表保留、测试账号治理仅记录为待优化项，且本轮未自动删除 `@example.test` 测试账号，除非用户另行授权。
