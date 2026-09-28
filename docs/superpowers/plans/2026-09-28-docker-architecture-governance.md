# Docker 架构治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Docker 构建文件和 Compose 编排统一收口到 `Docker/`，同步更新架构门禁、持久化运维、测试和项目文档。

**Architecture:** 保持仓库根目录作为 Docker build context。`Docker/build/` 保存 Web/BFF 和 Analytics 镜像构建文件，`Docker/compose/` 保存本地完整栈与测试覆盖编排；架构门禁拒绝旧路径回流，持久化脚本默认使用新的完整栈 Compose，但尊重 `COMPOSE_FILE` 覆盖。

**Tech Stack:** Docker Compose、Node.js 20.19、pnpm 10.15.1、Python 3.13、Prisma、FastAPI、Vitest、Prettier。

## Global Constraints

- 保持 Compose 服务名 `web`、`db`、`analytics`、容器端口和测试数据库端口 `127.0.0.1:55439`。
- 保持仓库根目录为 Docker build context，不能改成 `Docker/` 子目录作为 context。
- 保持服务端密钥只通过运行时环境变量读取，不写入 Dockerfile 或前端构建产物。
- 不使用 `latest` 基础镜像；保持 Node `20.19`、Python `3.13` 和锁文件构建。
- 手动编辑使用 `apply_patch`；不执行 `git commit`，除非用户明确要求提交。

---

### Task 1: 先更新架构边界测试

**Files:**

- Modify: `tests/integration/service-architecture-boundaries.test.ts`
- Test: `tests/integration/service-architecture-boundaries.test.ts`

**Interfaces:**

- Consumes: `repositoryRoot` 和架构文件系统断言。
- Produces: 对 `Docker/build/`、`Docker/compose/` 新入口和旧路径禁止回流的可执行契约。

- [ ] **Step 1: 修改测试断言以表达新目录契约**

将旧路径断言改为：

```ts
const dockerfile = readFileSync(
  path.join(repositoryRoot, "Docker/build/web-bff.Dockerfile"),
  "utf8",
);
const compose = readFileSync(
  path.join(repositoryRoot, "Docker/compose/docker-compose.yml"),
  "utf8",
);
const testCompose = readFileSync(
  path.join(repositoryRoot, "Docker/compose/docker-compose.test.yml"),
  "utf8",
);
expect(existsSync(path.join(repositoryRoot, "Docker/build/web-bff.Dockerfile"))).toBe(true);
expect(existsSync(path.join(repositoryRoot, "Docker/build/analytics.Dockerfile"))).toBe(true);
expect(existsSync(path.join(repositoryRoot, "Docker/compose/docker-compose.yml"))).toBe(true);
expect(existsSync(path.join(repositoryRoot, "Docker/compose/docker-compose.test.yml"))).toBe(true);
expect(existsSync(path.join(repositoryRoot, "Dockerfile"))).toBe(false);
expect(existsSync(path.join(repositoryRoot, "docker-compose.yml"))).toBe(false);
expect(existsSync(path.join(repositoryRoot, "docker-compose.test.yml"))).toBe(false);
expect(existsSync(path.join(repositoryRoot, "services/analytics/Dockerfile"))).toBe(false);
expect(compose).toContain("dockerfile: Docker/build/web-bff.Dockerfile");
expect(compose).toContain("dockerfile: Docker/build/analytics.Dockerfile");
```

- [ ] **Step 2: 运行定向测试确认 RED**

Run: `pnpm run test:services -- tests/integration/service-architecture-boundaries.test.ts`

Expected: FAIL，因为新 Docker 文件尚未移动，旧路径仍存在。

### Task 2: 移动并整理 Docker 构建与 Compose 文件

**Files:**

- Create: `Docker/build/web-bff.Dockerfile`
- Create: `Docker/build/analytics.Dockerfile`
- Create: `Docker/compose/docker-compose.yml`
- Create: `Docker/compose/docker-compose.test.yml`
- Create: `Docker/README.md`
- Delete: `Dockerfile`
- Delete: `services/analytics/Dockerfile`
- Delete: `docker-compose.yml`
- Delete: `docker-compose.test.yml`

**Interfaces:**

- Consumes: 仓库根目录 build context、现有 Compose 服务和环境变量。
- Produces: 新 Docker 目录入口，保持服务名、端口、卷、健康检查和构建产物不变。

- [ ] **Step 1: 建立新目录并移动构建文件内容**

创建 `Docker/build/web-bff.Dockerfile`，内容保持原根 `Dockerfile` 的 Node 20.19 两阶段构建；创建 `Docker/build/analytics.Dockerfile`，内容保持原 `services/analytics/Dockerfile` 的 Python 3.13 构建。

- [ ] **Step 2: 修改 Compose build 路径**

在 `Docker/compose/docker-compose.yml` 中将两个服务的构建段固定为：

```yaml
build:
  context: ../..
  dockerfile: Docker/build/web-bff.Dockerfile
```

Analytics 使用相同的 `context: ../..`，并把 `dockerfile` 改为 `Docker/build/analytics.Dockerfile`。其余服务配置保持不变。

- [ ] **Step 3: 复制测试覆盖并保留隔离语义**

将现有 `docker-compose.test.yml` 内容放入 `Docker/compose/docker-compose.test.yml`，不改变 `web` 的测试 `DATABASE_URL`、`127.0.0.1:55439:5432` 映射和 `postgres-auth-test-data` 卷。

- [ ] **Step 4: 编写 Docker 使用说明**

`Docker/README.md` 必须说明目录职责、根目录 build context、启动命令、显式 migration、测试覆盖命令、备份边界、`.env` 来源和禁止提交密钥规则。

- [ ] **Step 5: 删除旧入口并运行 Compose 配置检查**

Run: `pnpm run check:docker`

Expected: PASS，两个新 Compose 文件均能完成配置解析。

### Task 3: 更新架构门禁和持久化 Compose 默认值

**Files:**

- Modify: `tooling/architecture/check.mjs`
- Modify: `tooling/docker/check-compose.sh`
- Modify: `infra/persistence/db-ops.mjs`
- Modify: `infra/persistence/tests/service-persistence-ops.test.ts`

**Interfaces:**

- Consumes: 新 Docker 路径和可选的 `COMPOSE_FILE` 环境变量。
- Produces: 架构检查、Compose 检查和数据库运维对新目录的稳定支持。

- [ ] **Step 1: 更新架构门禁入口列表**

将 `containerGovernanceEntries` 改为检查：

```js
".dockerignore",
"Docker/README.md",
"Docker/build/web-bff.Dockerfile",
"Docker/build/analytics.Dockerfile",
"Docker/compose/docker-compose.yml",
"Docker/compose/docker-compose.test.yml",
```

并增加旧路径存在时的错误：`Dockerfile`、`docker-compose.yml`、`docker-compose.test.yml`、`services/analytics/Dockerfile`。

- [ ] **Step 2: 更新 Compose 内容断言**

从 `Docker/compose/docker-compose.yml` 读取内容，断言 `web`、`db`、`analytics` 存在，并断言两个 `dockerfile: Docker/build/...` 路径存在；从测试覆盖读取隔离卷和端口断言。

- [ ] **Step 3: 更新无副作用 Compose 检查脚本**

让 `tooling/docker/check-compose.sh` 从仓库根目录解析绝对文件路径：

```bash
compose_file="${repository_root}/Docker/compose/docker-compose.yml"
test_compose_file="${repository_root}/Docker/compose/docker-compose.test.yml"
docker compose -f "${compose_file}" config --quiet
docker compose -f "${compose_file}" -f "${test_compose_file}" config --quiet
```

- [ ] **Step 4: 更新持久化运维默认 Compose 文件**

在 `infra/persistence/db-ops.mjs` 中增加：

```js
const defaultComposeFile = path.join(projectRoot, "Docker/compose/docker-compose.yml");
```

当 `options.composeFile` 和 `process.env.COMPOSE_FILE` 都未提供时，`composeCommand` 传入 `-f defaultComposeFile`；如果 `COMPOSE_FILE` 已设置，则不传 `-f`，继续让 Docker Compose 解析环境变量覆盖。

- [ ] **Step 5: 更新持久化测试**

将测试中的 `docker-compose.yml` 和 `docker-compose.test.yml` 断言改为 `Docker/compose/...`，增加“未设置 `COMPOSE_FILE` 时使用默认 Docker Compose 文件”的断言，并保留现有环境覆盖测试。

- [ ] **Step 6: 运行定向测试确认 GREEN**

Run: `pnpm run check:architecture && pnpm run check:docker && pnpm run test:services -- tests/integration/service-architecture-boundaries.test.ts infra/persistence/tests/service-persistence-ops.test.ts`

Expected: PASS。

### Task 4: 同步项目文档和质量入口

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/TESTING_BASELINE.md`
- Modify: `docs/OPERATIONS_PERSISTENCE.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Interfaces:**

- Consumes: 新 Docker 目录和命令。
- Produces: 不再引用旧根 Docker 文件的用户文档和架构事实来源。

- [ ] **Step 1: 更新 README 中英文 Docker 命令和目录树**

将启动、停止、配置检查和目录树中的旧路径改为 `Docker/compose/...`，新增 Docker 目录说明，并保留“Compose 仅为本地完整栈，不是部署配置”的边界。

- [ ] **Step 2: 更新规格与运维文档**

更新 `PROJECT_SPEC.md` 的目录地图、容器边界和质量命令；更新 `OPERATIONS_PERSISTENCE.md` 的 Compose 组合命令；更新 `TESTING_BASELINE.md` 的测试覆盖入口和 `PROJECT_OPTIMIZATION_BACKLOG.md` 的已完成 Docker 治理描述。

- [ ] **Step 3: 运行格式检查和旧路径扫描**

Run: `pnpm run format:check && git diff --check && git grep -n -E '(^|[ /])Dockerfile|docker-compose\.yml|docker-compose\.test\.yml' -- README.md docs tooling infra tests || true`

Expected: 只保留新 `Docker/build`、`Docker/compose` 路径和必要的历史/兼容说明，不出现旧根路径作为当前入口。

### Task 5: 完成全量验证

**Files:**

- Verify: all files changed by Tasks 1–4

- [ ] **Step 1: 运行架构、Docker 和格式门禁**

Run: `pnpm run check:architecture && pnpm run check:docker && pnpm run format:check && git diff --check`

Expected: all commands exit 0。

- [ ] **Step 2: 运行 Docker 相关回归测试**

Run: `pnpm run test:services -- tests/integration/service-architecture-boundaries.test.ts infra/persistence/tests/service-persistence-ops.test.ts`

Expected: all selected tests pass。

- [ ] **Step 3: 构建两个镜像的配置验证**

Run: `docker compose -f Docker/compose/docker-compose.yml config --quiet` and `docker compose -f Docker/compose/docker-compose.yml -f Docker/compose/docker-compose.test.yml config --quiet`.

Expected: no output and exit code 0; this task does not publish or deploy images.

- [ ] **Step 4: Review final diff and status**

Run: `git status --short && git diff --stat`

Expected: only the planned Docker files, governance code, tests, docs, spec and plan are changed; no generated images, volumes, secrets or build output are tracked.
