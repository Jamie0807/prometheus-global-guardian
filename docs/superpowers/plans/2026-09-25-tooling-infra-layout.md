# 工具与运维脚本分层治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将开发工具、数据库运维和 Analytics 启动脚本放入职责明确的目录，同时保持根命令兼容。

**Architecture:** `tooling/` 只放开发辅助工具，`infra/persistence/` 只放数据库运维，Analytics 自己拥有启动/测试脚本。`package.json`、CI 和文档继续作为稳定编排入口。

**Tech Stack:** Bash、Node ESM、Prisma、Docker Compose、pnpm。

## Global Constraints

- 保持所有现有 `pnpm` 命令名、参数、环境变量、退出码和安全行为。
- 不改变数据库 schema、migration、备份保留策略或 Docker 服务协议。
- 不打印或提交密钥、令牌、密码、连接串和本地环境。

### Task 1: Move development tooling

**Files:**

- Move: `scripts/check-architecture.mjs` -> `tooling/architecture/check.mjs`
- Move: `scripts/with-node-version.sh` -> `tooling/node/with-node-version.sh`
- Modify: `package.json`, `Dockerfile`, `.github/workflows/quality.yml`, docs and tests referencing these paths
- Modify: `tests/integration/service-architecture-boundaries.test.ts` after the test-layout move

- [ ] 先将 package scripts 指向新路径并运行架构/Node 命令确认旧路径缺失时失败。
- [ ] 移动文件，修正 `import.meta.url`、项目根路径计算和所有调用方。
- [ ] 运行 `pnpm run check:architecture`, `pnpm run node:version`、lint 和相关测试。

### Task 2: Move persistence operations

**Files:**

- Move: `scripts/persistence/backup-utils.mjs`, `backup-utils.d.ts`, `db-ops.mjs` -> `infra/persistence/`
- Move: `tests/service-persistence-ops.test.ts` -> `infra/persistence/tests/`
- Modify: `package.json`, `docs/OPERATIONS_PERSISTENCE.md`, `README.md`, `Dockerfile`, `.dockerignore`

- [ ] 先更新数据库命令到新模块路径并运行定向持久化测试确认旧路径失败。
- [ ] 移动模块和测试，修正项目根、Compose 文件和备份目录解析。
- [ ] 运行持久化单元测试、`docker compose config --quiet` 和隔离 Docker 恢复演练。

### Task 3: Consolidate Analytics scripts

**Files:**

- Move: `scripts/start-python-service.sh` -> `services/analytics/start-service.sh`
- Move: `scripts/test-python.sh` -> `services/analytics/test.sh`
- Modify: `services/analytics/README.md`, `package.json`, `.github/workflows/quality.yml`, `docs/TESTING_BASELINE.md`
- Delete: root `scripts/` after remaining files are migrated

- [ ] 先把 `test:python` 和 CI 指向 `services/analytics/test.sh`，运行 Python 测试确认旧路径缺失时失败。
- [ ] 移动脚本并让脚本从自身位置解析仓库根目录，不依赖当前工作目录。
- [ ] 运行 `pnpm run test:python` 和 Docker Analytics unittest。

### Task 4: Enforce directory governance

**Files:**

- Modify: `scripts/check-architecture.mjs` after Task 1 move -> `tooling/architecture/check.mjs`
- Modify: `tests/service-architecture-boundaries.test.ts` after test move -> `tests/integration/service-architecture-boundaries.test.ts`
- Modify: `docs/PROJECT_SPEC.md`, `docs/PROJECT_OPTIMIZATION_BACKLOG.md`, `README.md`, `cspell.json`

- [ ] 增加开发工具、持久化和 Analytics 脚本目录规则的失败测试。
- [ ] 删除根 `scripts/` 后运行架构检查确认旧路径被拒绝。
- [ ] 运行 lint、格式检查、类型检查、构建、Node/Python/组件测试和 `git diff --check`。
