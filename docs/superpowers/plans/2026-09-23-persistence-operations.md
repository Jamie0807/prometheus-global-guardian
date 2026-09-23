# 持久化运维实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为本地/单机 Compose 部署提供手动 PostgreSQL 备份、7 天保留、恢复演练和数据库检查命令，并用隔离数据库验证其不会影响正式数据。

**Architecture:** 以 `scripts/persistence/` 下的 Node.js CLI 作为唯一入口，CLI 调用当前 Compose 数据库容器中的 `pg_dump`、`pg_restore` 和 `psql`，不依赖宿主机 PostgreSQL 客户端。纯路径、命名、manifest 和保留窗口逻辑独立成可测试模块；恢复演练使用项目 Compose 网络中的临时 PostgreSQL 容器和独立卷。

**Tech Stack:** Node.js 20.19、pnpm、Docker Compose、PostgreSQL 16、Prisma 7、Vitest、Shell/Node CLI。

## Global Constraints

- 只支持本地或私有单机自托管；不加入常驻定时任务、对象存储、多实例协调或公网告警。
- 默认备份目录为项目根目录 `backups/`，可用 `PERSISTENCE_BACKUP_DIR` 指定外部目录；备份目录必须被 Git 忽略。
- 保留策略为今天及之前 6 天，共 7 个自然日；清理只允许删除符合固定命名规则且超过窗口的文件。
- 恢复演练只能写入临时数据库和临时卷，禁止连接正式数据库执行 `drop`、`truncate` 或 clean restore。
- 不输出 `DATABASE_URL`、密码、令牌或备份内容；所有失败路径返回非零退出码。
- 生产代码变更遵循 TDD；每个纯函数先添加失败测试，再写最小实现。
- migration 只前向执行；不生成自动 down migration，不在应用启动时隐式迁移。

---

### Task 1: 建立备份工件与保留窗口纯逻辑

**Files:**

- Create: `scripts/persistence/backup-utils.mjs`
- Create: `scripts/persistence/backup-utils.d.ts`
- Test: `tests/service-persistence-ops.test.ts`

**Interfaces:**

- `resolveBackupDirectory(configuredPath, projectRoot): string`：默认返回 `<projectRoot>/backups`，配置路径解析为绝对路径。
- `makeBackupArtifactName(now): string`：返回 `pgg-postgres-YYYYMMDD-HHmmss.dump`，时间格式固定、文件名只包含 ASCII 字符。
- `parseBackupArtifact(filename): { timestamp: Date; dumpName: string; manifestName: string } | undefined`：只接受上述命名规则。
- `selectPrunableBackups(entries, now, retentionDays = 7): string[]`：返回超过自然日保留窗口且符合命名规则的 dump 和 manifest 文件。
- `buildManifest({ dumpName, sizeBytes, sha256, database, schema, createdAt }): string`：返回不包含连接串和凭据的稳定 JSON 文本。

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

// @ts-expect-error The declaration is added in this task with the implementation module.
import {
  buildManifest,
  makeBackupArtifactName,
  parseBackupArtifact,
  selectPrunableBackups,
} from "../scripts/persistence/backup-utils.mjs";

describe("persistence backup artifacts", () => {
  it("creates and parses a deterministic timestamped filename", () => {
    const name = makeBackupArtifactName(new Date("2026-09-23T08:09:10.000Z"));
    expect(name).toBe("pgg-postgres-20260923-080910.dump");
    expect(parseBackupArtifact(name)?.dumpName).toBe(name);
  });

  it("prunes only matching artifacts older than seven local calendar days", () => {
    const entries = [
      "pgg-postgres-20260923-010000.dump",
      "pgg-postgres-20260917-235959.dump",
      "pgg-postgres-20260916-235959.dump",
      "pgg-postgres-20260916-150000.dump",
      "pgg-postgres-20260916-150000.dump.sha256",
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
      "notes.txt",
    ];
    expect(selectPrunableBackups(entries, new Date("2026-09-23T12:00:00+08:00"))).toEqual([
      "pgg-postgres-20260916-150000.dump",
      "pgg-postgres-20260916-150000.dump.sha256",
      "pgg-postgres-20260915-010000.dump",
      "pgg-postgres-20260915-010000.dump.sha256",
    ]);
  });

  it("manifest contains only operational metadata", () => {
    const manifest = JSON.parse(
      buildManifest({
        dumpName: "pgg-postgres-20260923-080910.dump",
        sizeBytes: 12,
        sha256: "a".repeat(64),
        database: "prometheus",
        schema: "public",
        createdAt: "2026-09-23T08:09:10.000Z",
      }),
    );
    expect(manifest).toEqual({
      version: 1,
      dumpName: "pgg-postgres-20260923-080910.dump",
      sizeBytes: 12,
      sha256: "a".repeat(64),
      database: "prometheus",
      schema: "public",
      createdAt: "2026-09-23T08:09:10.000Z",
    });
    expect(JSON.stringify(manifest)).not.toMatch(/password|DATABASE_URL|token/i);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run tests/service-persistence-ops.test.ts`

Expected: FAIL because `scripts/persistence/backup-utils.mjs` does not exist yet.

- [ ] **Step 3: Implement the pure module**

Implement the five exported functions using `node:path`, UTC timestamp formatting for filenames, local calendar date arithmetic for pruning, strict filename parsing, and `JSON.stringify` with the manifest field order shown in the test. Reject negative sizes and non-64-character SHA-256 values with `TypeError`.

- [ ] **Step 4: Add the declaration and verify GREEN**

Declare the exact exported function signatures in `backup-utils.d.ts`, remove the temporary `@ts-expect-error` only if TypeScript resolves the declaration, then run:

```bash
pnpm exec vitest run tests/service-persistence-ops.test.ts
pnpm run typecheck:contracts
```

Expected: all focused tests pass and the contract typecheck exits 0.

- [ ] **Step 5: Commit the self-contained utility**

```bash
git add scripts/persistence/backup-utils.mjs scripts/persistence/backup-utils.d.ts tests/service-persistence-ops.test.ts
git commit -m "test(ops): define persistence backup contracts"
```

### Task 2: Implement backup generation and seven-day pruning

**Files:**

- Create: `scripts/persistence/db-ops.mjs`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `tests/service-persistence-ops.test.ts`

**Interfaces:**

- CLI entry: `node scripts/persistence/db-ops.mjs backup` and `node scripts/persistence/db-ops.mjs prune`.
- `PERSISTENCE_BACKUP_DIR` selects the backup directory; unset means `backups/`.
- `PERSISTENCE_COMPOSE_PROJECT` and `COMPOSE_FILE` are passed through to Docker Compose; defaults remain the project’s normal Compose configuration.

- [ ] **Step 1: Add failing command contract tests**

Add tests for `resolveBackupDirectory` rejecting a path that resolves inside a Git-tracked file, for `selectPrunableBackups` preserving unmatched files, and for a manifest checksum mismatch being rejected by the exported verification helper. Keep Docker calls out of this unit test; inject the command runner into the CLI module only through a named `runCompose` export used by the test.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run tests/service-persistence-ops.test.ts`

Expected: FAIL with missing CLI utility behavior or missing checksum verification.

- [ ] **Step 3: Implement safe backup generation**

Implement `backup` with these exact steps:

```js
await ensureDatabaseReady();
await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
const tempPath = path.join(backupDir, `.${artifactName}.tmp`);
await runCompose(["exec", "-T", "db", "sh", "-ec", pgDumpCommand], { stdoutPath: tempPath });
const stat = await fs.stat(tempPath);
if (stat.size === 0) throw new Error("backup is empty");
const sha256 = await sha256File(tempPath);
await fs.rename(tempPath, dumpPath);
await writeFileAtomically(
  manifestPath,
  buildManifest({ ...metadata, sizeBytes: stat.size, sha256 }),
);
```

Use the container’s `POSTGRES_USER` and `POSTGRES_DB` variables inside `pg_dump`; never interpolate a password into the command line. On failure, remove only the temporary path and return exit code 1.

- [ ] **Step 4: Implement pruning**

List only regular files in the configured directory, call `selectPrunableBackups`, unlink the returned files, and print counts. A missing directory is a successful no-op. Refuse to follow symlinks and refuse filenames outside the fixed artifact pattern.

- [ ] **Step 5: Add package commands and ignore rule**

Add these `package.json` entries:

```json
"db:backup": "./scripts/with-node-version.sh node scripts/persistence/db-ops.mjs backup",
"db:backup:prune": "./scripts/with-node-version.sh node scripts/persistence/db-ops.mjs prune",
"db:restore:verify": "./scripts/with-node-version.sh node scripts/persistence/db-ops.mjs restore-verify",
"db:check": "./scripts/with-node-version.sh node scripts/persistence/db-ops.mjs check"
```

Add `backups/` to `.gitignore` and include the new script/test files in `format:check`.

- [ ] **Step 6: Run GREEN and commit**

```bash
pnpm exec vitest run tests/service-persistence-ops.test.ts
pnpm run format:check
pnpm run lint
git diff --check
git add scripts/persistence/db-ops.mjs package.json .gitignore tests/service-persistence-ops.test.ts
git commit -m "feat(ops): add PostgreSQL backup commands"
```

### Task 3: Implement restore rehearsal and database health checks

**Files:**

- Modify: `scripts/persistence/db-ops.mjs`
- Modify: `tests/service-persistence-ops.test.ts`
- Modify: `docker-compose.test.yml`

**Interfaces:**

- `node scripts/persistence/db-ops.mjs check` checks the active Compose database and returns 1 for any missing table, pending migration, unavailable connection, or missing migration history.
- `node scripts/persistence/db-ops.mjs restore-verify [backup-file]` selects the newest verified artifact when no file is supplied and returns 1 for checksum, restore, table, or cleanup failures.

- [ ] **Step 1: Add failing health and restore safety tests**

Add tests for nonzero results when a required table is absent, checksum mismatch rejection before any Docker command, and cleanup command generation using a temporary container name that cannot equal the Compose database service name `prometheus-global-guardian-db-1`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm exec vitest run tests/service-persistence-ops.test.ts`

Expected: FAIL because `check` and `restore-verify` behavior is not implemented.

- [ ] **Step 3: Implement `check`**

Run `psql` inside the active `db` service with `-At` queries for connection, `public`, `_prisma_migrations`, and the six required account/AI tables. Run `docker compose run --rm web pnpm exec prisma migrate status` with the active database URL and treat “Database schema is up to date” as success. Do not print the URL. Aggregate failures and exit once with code 1.

- [ ] **Step 4: Implement isolated `restore-verify`**

Create a random container name with prefix `pgg-restore-`, attach it to the project’s default Compose network, start `postgres:16-alpine` with a random temporary database/user/password, wait using `pg_isready`, copy the dump into the container, and run `pg_restore --no-owner --no-acl`. Query the six required tables and `_prisma_migrations`, then run a one-off `web` container with `DATABASE_URL` pointing at the temporary container to execute `pnpm exec prisma migrate status`. Always remove the temporary container and volume in a `finally` block; return nonzero if cleanup fails. Never pass the formal database host or password to the temporary restore command.

- [ ] **Step 5: Add isolated Compose test settings**

Extend `docker-compose.test.yml` with a unique project-scoped database volume and local-only port if needed by the integration command. Do not reuse `postgres-data` or the running application database. Keep credentials test-only and document them only in the test Compose file.

- [ ] **Step 6: Run focused unit and isolated integration checks**

```bash
pnpm exec vitest run tests/service-persistence-ops.test.ts
docker compose -f docker-compose.yml -f docker-compose.test.yml -p pgg-persistence-test up -d db
COMPOSE_PROJECT_NAME=pgg-persistence-test DATABASE_URL='postgresql://pgg_auth_test:pgg_auth_test@127.0.0.1:55439/pgg_auth_test?schema=public' pnpm run db:migrate:deploy
COMPOSE_PROJECT_NAME=pgg-persistence-test pnpm run db:check
COMPOSE_PROJECT_NAME=pgg-persistence-test pnpm run db:backup
COMPOSE_PROJECT_NAME=pgg-persistence-test pnpm run db:restore:verify
docker compose -f docker-compose.yml -f docker-compose.test.yml -p pgg-persistence-test down -v
```

Expected: all commands exit 0, restore verification reports the required tables, and the test project’s volume is removed only by the explicit final test cleanup command.

- [ ] **Step 7: Commit the restore and health work**

```bash
git add scripts/persistence/db-ops.mjs tests/service-persistence-ops.test.ts docker-compose.test.yml
git commit -m "feat(ops): add database restore rehearsal"
```

### Task 4: Publish the runbook and update project tracking

**Files:**

- Create: `docs/OPERATIONS_PERSISTENCE.md`
- Modify: `docs/TESTING_BASELINE.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `package.json`

**Interfaces:**

- Runbook commands must match the four `package.json` scripts exactly.
- The runbook must distinguish backup verification from destructive production recovery and must state that Prisma migrations are forward-only.

- [ ] **Step 1: Write the runbook**

Document prerequisites, first-time migration, normal backup sequence, seven-day pruning, restore rehearsal, pre-migration checklist, failure handling, backup sensitivity, and the explicit prohibition on deleting the formal database volume as a recovery shortcut. Include these command blocks:

```bash
pnpm db:check
pnpm db:backup
pnpm db:backup:prune
pnpm db:restore:verify
pnpm db:migrate:deploy
```

- [ ] **Step 2: Update quality baseline and backlog**

Add the persistence command checks and isolated PostgreSQL verification to `docs/TESTING_BASELINE.md`. Move persistence operations from the remaining-work matrix to the completed section in `docs/PROJECT_OPTIMIZATION_BACKLOG.md`, while keeping public production operations explicitly outside the current scope.

- [ ] **Step 3: Update formatting and commit documentation**

Add the runbook and new spec/plan paths to `format:check` if not already covered, then run:

```bash
pnpm run format:check
git diff --check
git add docs/OPERATIONS_PERSISTENCE.md docs/TESTING_BASELINE.md docs/PROJECT_OPTIMIZATION_BACKLOG.md package.json
git commit -m "docs(ops): document persistence runbook"
```

### Task 5: Final verification and review checkpoint

**Files:**

- No new production files; inspect all files changed by Tasks 1–4.

- [ ] **Step 1: Run the complete relevant verification**

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run test:services -- tests/service-persistence-ops.test.ts
pnpm run build
git diff --check
```

Run the isolated PostgreSQL flow from Task 3 again if the database container or CLI code changed after its first run. Confirm the formal Compose database remains healthy and that no `backups/` file is tracked.

- [ ] **Step 2: Review the final diff**

Check that only persistence scripts, tests, Compose test settings, package commands, ignore rules, runbook, and tracking documents changed. Confirm no `.env`, password, token, dump, or temporary volume appears in Git status.

- [ ] **Step 3: Request code review before integration**

Use the project code review workflow to review backup safety, restore isolation, retention deletion scope, and migration status handling before merging or pushing any branch.
