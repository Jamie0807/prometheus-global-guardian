# BFF Runtime Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Express BFF 迁入 `apps/bff/`，保持现有 API、静态托管、数据库和 Docker 运行行为不变。

**Architecture:** `apps/bff/index.ts` 成为正式入口，BFF 模块归档在 `apps/bff/`；根目录继续负责 pnpm、Vite、TypeScript、Docker 和测试编排。TypeScript 输出仍位于根 `dist-server/`，但入口变为 `dist-server/apps/bff/index.js`；静态客户端始终从根 `dist/` 提供。

**Tech Stack:** Node.js 20.19、TypeScript 5.9、Express 5、Prisma 7、pnpm 10、Vitest、Docker Compose。

## Global Constraints

- 不改变 HTTP API、数据库 schema、migration、认证策略、AI provider 或 Python 服务协议。
- 根 `package.json` 继续作为编排入口，不为 `apps/bff` 新增 workspace 包。
- `apps/bff` 不依赖 React 组件或 Python 源码；`apps/web` 不依赖 `apps/bff` 内部文件。
- `packages/*` 不得导入运行单元；生产代码只能从 `@pgg/hazard-domain` 公共入口使用灾害领域能力。
- 保留 `shared/hazards/` 兼容 re-export；删除兼容入口不属于本批。
- 不自动执行 `git add`、`git commit`、push 或合并；只有用户明确授权提交时才执行。
- 每个任务完成后运行覆盖性测试和 `git diff --check`。

---

### Task 1: 建立 BFF 目标入口与架构验收

**Files:**

- Modify: `tests/service-architecture-boundaries.test.ts`
- Modify: `scripts/check-architecture.mjs`
- Modify: `tsconfig.server.json`
- Modify: `tsconfig.server.test.json`
- Create: `apps/bff/index.ts`（由迁移步骤生成）

**Interfaces:**

- Produces: `apps/bff/index.ts` 正式入口、根 BFF 残留检查和新的 TypeScript include。
- Consumes: 现有 `server.ts)、`server/`模块和`@pgg/hazard-domain` 公共入口。

- [ ] **Step 1: 写迁移前失败测试**

在架构测试中增加以下断言：

```ts
it("requires the BFF runtime entry under apps/bff", () => {
  expect(existsSync(path.join(repositoryRoot, "apps/bff/index.ts"))).toBe(true);
  expect(existsSync(path.join(repositoryRoot, "server.ts"))).toBe(false);
  expect(existsSync(path.join(repositoryRoot, "server"))).toBe(false);
});
```

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
```

预期：因入口缺失和根目录残留而失败。

- [ ] **Step 2: 更新 BFF TypeScript include**

把 `tsconfig.server.json` 和 `tsconfig.server.test.json` 的 `server.ts`、`server/**/*.ts` include 替换为 `apps/bff/index.ts`、`apps/bff/**/*.ts`、`apps/bff/**/*.d.ts`。保留 `rootDir: "."`、`outDir: "dist-server"`、`shared/**/*.ts` 和 `packages/**/*.ts`。

- [ ] **Step 3: 实现架构门禁**

在 `scripts/check-architecture.mjs` 中增加稳定错误：

```text
BFF entrypoint is missing: apps/bff/index.ts
root BFF entrypoint must be removed: server.ts
root BFF directory must be removed: server
```

运行同一架构测试和 `pnpm run check:architecture`，确认 RED 只来自尚未移动的实现。

### Task 2: 移动 BFF 入口和模块并修正导入

**Files:**

- Move: `server.ts` → `apps/bff/index.ts`
- Move: `server/` → `apps/bff/`
- Modify: `apps/bff/index.ts`
- Modify: `apps/bff/**/*.ts`
- Modify: BFF 相关 Node 测试中的旧 `../server/... ` 导入

**Interfaces:**

- Consumes: Task 1 的目标 include 和架构门禁。
- Produces: `apps/bff/index.ts` 导出的 `createApp)、`adaptDisasterAwareHazards`和`UpstreamFetch`，以及新的测试导入路径。

- [ ] **Step 1: 移动文件并保留实现内容**

```bash
mkdir -p apps/bff
git mv server.ts apps/bff/index.ts
git mv server apps/bff/
```

根目录 `server.ts` 和 `server/` 必须消失，不创建重复兼容副本。

- [ ] **Step 2: 修正入口相对导入**

在 `apps/bff/index.ts` 将 `./server/...` 改为 `./...`，将 `./shared/...` 改为 `../../shared/...`。保持导出名称不变。

- [ ] **Step 3: 修正 BFF 内部跨目录导入**

把移动后仍指向旧路径的引用更新为 `apps/bff` 内部相对路径；将 BFF 的灾害领域导入改为：

```ts
import { createHazardEventId, resolveHazardLayerId } from "@pgg/hazard-domain";
```

不要移动 `shared/logging.ts)，BFF 对它使用 `../../shared/logging.js`。

- [ ] **Step 4: 更新 Node 测试导入**

将测试中的 `../server/...` 改为 `../apps/bff/...`，将入口导入改为 `../apps/bff/index.js` 或现有测试配置可解析的无后缀路径。不改变测试断言和 fixture。

- [ ] **Step 5: 运行 BFF 类型与边界测试**

```bash
pnpm run typecheck:server
pnpm run build:server:test
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-source-health.test.ts tests/server-hazard-event-registry.test.ts
```

### Task 3: 修正静态托管、Prisma 和 Docker 入口

**Files:**

- Modify: `apps/bff/index.ts`
- Modify: `prisma/schema.prisma`
- Modify: `apps/bff/db/prisma.ts`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `Dockerfile`
- Modify: BFF 持久化测试中的 Prisma 导入

**Interfaces:**

- Consumes: Task 2 的正式 BFF 入口。
- Produces: `dist-server/apps/bff/index.js)、`apps/bff/generated/prisma`和根`dist/` 静态托管兼容路径。

- [ ] **Step 1: 锁定静态路径和启动产物**

在架构测试或 BFF 配置测试中断言 `package.json` 的 `start` 使用 `dist-server/apps/bff/index.js`，并在构建后检查根 `dist/index.html` 与 `dist-server/apps/bff/index.js` 存在。

- [ ] **Step 2: 使用仓库根计算客户端静态目录**

在 `apps/bff/index.ts` 使用：

```ts
const repositoryRoot = path.resolve(__dirname, "../..");
const clientDistPath = path.join(repositoryRoot, "dist");
```

保持 `express.static(clientDistPath)` 和 SPA fallback 的 URL 行为不变。

- [ ] **Step 3: 迁移 Prisma 输出**

把 `prisma/schema.prisma` 的 generator output 改为 `../apps/bff/generated/prisma`，更新 BFF Prisma import 和测试路径为 `apps/bff/db/prisma)。生成目录为本地构建产物，不提交生成文件。

- [ ] **Step 4: 更新启动脚本和 Docker CMD**

将 `package.json` 的 `start` 与 `Dockerfile` CMD 改为 `dist-server/apps/bff/index.js`；`build:server)、Compose 服务名和端口保持不变。

- [ ] **Step 5: 运行编译和构建**

```bash
pnpm run db:generate
pnpm run typecheck:server
pnpm run build
test -f dist/index.html
test -f dist-server/apps/bff/index.js
test ! -e dist-server/server.js
```

### Task 4: 完善门禁、文档和回归验证

**Files:**

- Modify: `scripts/check-architecture.mjs`
- Modify: `tests/service-architecture-boundaries.test.ts`
- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/TESTING_BASELINE.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: Tasks 1–3 的实际路径和产物。
- Produces: 当前架构文档与运行命令和代码一致，BFF 迁移状态可被门禁验证。

- [ ] **Step 1: 更新架构扫描规则**

让 `check-architecture` 检查 `apps/bff` 入口、禁止根 `server.ts`/`server/`，并继续禁止 Web 到 BFF 内部文件、共享包到运行单元的越界导入。

- [ ] **Step 2: 全仓搜索旧 BFF 路径**

```bash
rg -n "server\\.ts|dist-server/server\\.js|server/" README.md docs scripts package.json tsconfig*.json Dockerfile docker-compose*.yml tests apps packages shared
```

生产配置和当前文档只能保留历史迁移说明，不得保留可执行旧路径。

- [ ] **Step 3: 更新文档和格式清单**

README、项目 Spec、测试基线和优化清单改为 `apps/bff/index.ts)、`apps/bff/`与`dist-server/apps/bff/index.js`；`package.json`的格式清单纳入`apps/bff`。

- [ ] **Step 4: 运行完整 Node 验收**

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run check:architecture
pnpm run test:services
pnpm run test:component
pnpm run build
git diff --check
```

需要 PostgreSQL 的 BFF 集成测试和 E2E 在可用数据库环境中单独记录结果；不把缺失环境变量误报为代码失败。

### 完成定义

- [ ] `apps/bff/index.ts` 是唯一 BFF 入口，根 `server.ts` 与 `server/` 不存在。
- [ ] `start)、Docker CMD、Playwright 启动链指向 `dist-server/apps/bff/index.js`。
- [ ] 静态页面仍从根 `dist/` 提供，Prisma 生成目录位于 `apps/bff/generated/prisma/`。
- [ ] 架构门禁、文档、测试路径与实际代码一致。
- [ ] 不引入 API、数据库、认证、AI 或 Python 行为变更。
