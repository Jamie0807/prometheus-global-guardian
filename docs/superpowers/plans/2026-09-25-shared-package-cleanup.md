# 共享包与兼容层治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将跨运行单元的日志和灾害领域入口统一到 `packages/`，删除 `shared/` 生产兼容层。

**Architecture:** 新增无运行时依赖的 `@pgg/logging` workspace 包；Web 与 BFF 只通过包公共入口使用日志。灾害领域继续由 `@pgg/hazard-domain` 提供唯一入口，测试和架构门禁删除旧 `shared/hazards` 兼容路径。

**Tech Stack:** TypeScript、pnpm workspace、Vitest、Node `node:test`、Vite、Express BFF。

## Global Constraints

- 保持现有日志级别、脱敏规则、记录格式和默认 sink。
- 不改变公开 HTTP API、数据库、AI 流和前端行为。
- 不提交构建产物、缓存、密钥或用户已有的 `README.md` 修改。
- 新增行为先写失败测试，再实现最小改动。

### Task 1: 建立 logging workspace package

**Files:**

- Create: `packages/logging/package.json`
- Create: `packages/logging/tsconfig.json`
- Create: `packages/logging/src/index.ts`
- Test: `packages/logging/tests/logging.test.ts`

- [ ] 写测试，断言 `@pgg/logging` 暴露级别、`resolveLogLevel`、脱敏上下文和 sink 注入行为。
- [ ] 运行 `pnpm exec vitest run packages/logging/tests/logging.test.ts`，确认新包入口尚不存在时失败。
- [ ] 把 `shared/logging.ts` 内容迁入 `packages/logging/src/index.ts`，保持导出签名和实现语义。
- [ ] 添加 workspace package exports、TypeScript 构建配置和测试 alias。
- [ ] 运行测试并确认通过。

### Task 2: 迁移 consumers 并删除 shared logging

**Files:**

- Modify: `apps/web/src/utils/logger.ts`
- Modify: `apps/bff/logging.ts`
- Modify: `package.json`, `tsconfig.app.json`, `tsconfig.server.json`, `vitest.config.ts`, `vitest.component.config.ts`
- Delete: `shared/logging.ts`

- [ ] 更新 Web、BFF 和配置中的包入口，删除相对 `shared/logging` 导入。
- [ ] 删除旧文件，运行客户端/服务端日志测试并确认通过。
- [ ] 运行 `pnpm run typecheck:client` 和 `pnpm run typecheck:server`。

### Task 3: 删除 hazard compatibility re-exports

**Files:**

- Delete: `shared/hazards/hazard-event.ts`
- Delete: `shared/hazards/hazard-layer-registry.ts`

- [ ] 删除两个兼容文件。
- [ ] 运行 hazard domain 和服务测试确认通过；架构门禁规则由工具治理任务统一更新。

### Task 4: Documentation and package verification

**Files:**

- Modify: `docs/PROJECT_SPEC.md`, `docs/PROJECT_OPTIMIZATION_BACKLOG.md`, `docs/TESTING_BASELINE.md`, `README.md`
- Modify: `cspell.json`, `package.json`

- [ ] 更新目录树、包清单、测试命令和治理清单中的 `shared/` 描述。
- [ ] 更新格式检查清单，运行 `pnpm run format:check`。
- [ ] 运行 `pnpm run check:architecture`, `pnpm run lint`, `pnpm run typecheck:contracts` 和 `git diff --check`。
