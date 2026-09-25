# 测试目录物理归档治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 让 TypeScript 测试跟随 Web、BFF、共享包和集成边界归档，同时保留现有命令和测试数量。

**Architecture:** Web 测试移动到 `apps/web/tests`，BFF 测试移动到 `apps/bff/tests`，契约类型测试移动到 `packages/contracts/tests`，跨运行单元测试移动到 `tests/integration`。Python 测试继续位于 `services/analytics/tests`。

**Tech Stack:** Vitest、Node `node:test`、Playwright、TypeScript、Python unittest。

## Global Constraints

- 只改变文件位置、导入路径和测试发现配置，不改变测试断言或产品行为。
- 根 `package.json` 命令名保持不变。
- 每次移动后立即运行对应测试集合，避免批量迁移后难以定位路径问题。

### Task 1: Move Web tests

**Files:**

- Move: `tests/component/` -> `apps/web/tests/component/`
- Move: `tests/e2e/` -> `apps/web/tests/e2e/`
- Move: Web service tests `service-adapters`, `service-ai`, `service-analytics-*`, `service-auth`, `service-client-logging`, `service-disaster-aware`, `service-hazard-feed`, `service-hazard-metrics`, `service-http`, `service-map-utils`, `service-report-html` -> `apps/web/tests/services/`
- Move: `tests/component/setup.ts` -> `apps/web/tests/component/setup.ts`
- Modify: `vitest.component.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.type-tests.json`, `package.json`

- [ ] 先更新配置到目标路径并运行组件/Service/E2E 命令，确认旧路径缺失时失败。
- [ ] 物理移动文件，按新目录深度修正相对导入。
- [ ] 运行 `pnpm run test:component`, `pnpm run test:services` 和 `pnpm run test:e2e`。

### Task 2: Move BFF and infrastructure tests

**Files:**

- Move: `tests/ai-*.test.ts`, `tests/server-*.test.ts`, `tests/request-boundaries.test.ts`, `tests/service-ai-stream-session.test.ts`, `tests/service-source-health.test.ts` -> `apps/bff/tests/`
- Modify: `package.json`, `vitest.config.ts`, `tsconfig.server.test.json`, `Dockerfile`

- [ ] 将 Node BFF 测试配置的 include 指向 `apps/bff/tests`，先运行确认迁移前路径失败。
- [ ] 移动测试并修正 `../../` 导入，保留 Node 与 Vitest 两种测试运行器。
- [ ] 运行 `pnpm run test:bff`、`pnpm run test:services` 和持久化测试。

### Task 3: Move contract and integration tests

**Files:**

- Move: `tests/type-tests/analytics-contracts.test-d.ts` -> `packages/contracts/tests/`
- Move: `tests/service-architecture-boundaries.test.ts`, `tests/service-cross-language-hazard-contract.test.ts`, `tests/service-hazard-event-registry.test.ts` -> `tests/integration/`
- Modify: `tsconfig.type-tests.json`, `vitest.config.ts`, `package.json`, `tooling/architecture/check.mjs`

- [ ] 先更新类型测试和集成测试路径配置，运行对应命令确认失败。
- [ ] 移动文件并修正相对导入，确保集成测试能访问仓库根目录 fixture。
- [ ] 运行 `pnpm run typecheck:contracts`, `pnpm run test:services` 和架构测试。

### Task 4: Remove root test discovery and verify counts

**Files:**

- Modify: `docs/TESTING_BASELINE.md`, `docs/PROJECT_SPEC.md`, `docs/PROJECT_OPTIMIZATION_BACKLOG.md`, `README.md`
- Modify: `.github/workflows/quality.yml`, `.prettierignore`, `cspell.json`

- [ ] 删除配置和文档中对旧 `tests/component`, `tests/e2e`, `tests/service-*` 路径的引用。
- [ ] 用 `find`/Vitest/Node test 输出核对迁移前后测试数量一致。
- [ ] 运行完整 Node、组件、E2E、Python 测试和 `git diff --check`。
