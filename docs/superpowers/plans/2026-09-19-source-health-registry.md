# 数据源健康检查与新鲜度实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 执行本计划。步骤使用复选框跟踪；本仓库未获用户授权时不得自动提交 Git。

**Goal:** 在现有 `/api/hazards` 的 `meta.sources[]` 中增加四个灾害来源最近 5 分钟的进程内健康快照，同时保持缓存、fallback、stale 和旧响应兼容。

**Architecture:** 新增无外部依赖的 `HazardSourceHealthRegistry`，按 `HazardSourceId` 保存带时间戳的加载尝试，并在读取快照时清理 5 分钟窗口外的记录。BFF 的 `loadSource` 是唯一真实来源加载计数边界：每次 `load()` 成功或失败记录一次，缓存命中不计数；现有 `HazardSourceStatus` 增加可选 `health` 对象，由 `/api/hazards` 合并返回。

**Tech Stack:** TypeScript 5、Express 5、Vitest、Node test runner、Prettier、ESLint。

## Global Constraints

- 健康统计只存在当前 Node 进程内，固定 `windowMs: 300000`，不引入数据库、Redis、外部指标系统或新依赖。
- 四个来源为 `disasteraware`、`usgs`、`nasa-eonet`、`gdacs`；来源类型必须继续从 `shared/hazards/hazard-event.ts` 导入。
- 每次 `loadSource` 调用中的每个 `load()` 最多记录一次；现有两次重试最多记录两次；DisasterAware 认证不单独计数。
- `empty` 计为成功；`fallback` 和 `stale` 不改变真实上游统计；缓存命中不创建尝试记录。
- 健康字段只增加在现有 `meta.sources[]` 中，保留 `id`、`status`、`count`、`fetchedAt`、`message` 和现有 API 路径。
- `lastErrorCode` 只允许 `TIMEOUT`、`HTTP_ERROR`、`INVALID_RESPONSE`、`UPSTREAM_ERROR`，不得返回原始异常、响应体、URL、token 或凭据。
- 窗口内没有尝试时省略 `successRate`、`averageLatencyMs`、`lastLatencyMs`、`lastAttemptAt` 和 `lastSuccessAt`，不伪造为零。
- 新增 TypeScript 边界使用 `unknown`、类型守卫和 `import type`，不新增无必要的 `any`。
- 先写并运行 RED，再写最小实现并运行 GREEN；不改变当前工作树中与本需求无关的用户文件。
- 未经用户再次明确授权，不执行新的 `git add`、`git commit`、push 或 PR；每项任务结束只检查 `git diff --check` 和工作树范围。

---

## 文件与责任地图

| 文件                                   | 责任                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `server/hazards/source-health.ts`      | 5 分钟滚动尝试记录、窗口清理、快照计算和稳定错误码。                                                |
| `server/hazards/hazard-source.ts`      | 扩展 `HazardSourceStatus` 与健康类型，保持公共来源适配和 loader 契约。                              |
| `server.ts`                            | 在 `loadSource` 记录真实加载、映射错误、合并健康快照并返回来源状态。                                |
| `tests/service-source-health.test.ts`  | 注册表纯逻辑的确定性测试。                                                                          |
| `tests/server-auth.test.ts`            | `/api/hazards` 重试、缓存、来源状态和脱敏回归。                                                     |
| `tests/service-hazard-source.test.ts`  | 若现有文件可复用，则补充公共来源 loader 的健康字段；否则只在 `tests/server-auth.test.ts` 验证集成。 |
| `docs/PROJECT_SPEC.md`                 | 记录来源健康指标和进程内窗口边界。                                                                  |
| `docs/PROJECT_OPTIMIZATION_BACKLOG.md` | 将数据源健康检查从下一项 P1 更新为已完成能力，并保留数据库设计为下一项。                            |
| `docs/TESTING_BASELINE.md`             | 仅当实际测试数量或命令说明变化时更新。                                                              |
| `package.json`                         | 仅当 `format:check` 文件清单缺少新增规格/计划文档时更新。                                           |

---

### Task 1: 实现 5 分钟健康注册表

**Files:**

- Create: `server/hazards/source-health.ts`
- Test: `tests/service-source-health.test.ts`

**Interfaces:**

```ts
export type HazardSourceHealthErrorCode =
  | "TIMEOUT"
  | "HTTP_ERROR"
  | "INVALID_RESPONSE"
  | "UPSTREAM_ERROR";

export interface HazardSourceHealth {
  windowMs: 300000;
  attempts: number;
  successes: number;
  failures: number;
  successRate?: number;
  averageLatencyMs?: number;
  lastLatencyMs?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  lastErrorCode?: HazardSourceHealthErrorCode;
}

export interface HazardSourceHealthRegistry {
  recordSuccess(source: HazardSourceId, latencyMs: number, at: Date): void;
  recordFailure(
    source: HazardSourceId,
    latencyMs: number,
    errorCode: HazardSourceHealthErrorCode,
    at: Date,
  ): void;
  snapshot(source: HazardSourceId, at: Date): HazardSourceHealth;
}

export function createHazardSourceHealthRegistry(windowMs?: number): HazardSourceHealthRegistry;
```

- [x] **Step 1: 写确定性 RED 测试**：在 `tests/service-source-health.test.ts` 使用固定 `Date`，先覆盖空窗口、一次成功、一次空结果视为成功、一次失败、成功率和平均延迟。

```ts
it("returns an empty five-minute snapshot before any attempts", () => {
  const registry = createHazardSourceHealthRegistry();
  expect(registry.snapshot("usgs", new Date("2026-09-19T00:00:00.000Z"))).toEqual({
    windowMs: 300000,
    attempts: 0,
    successes: 0,
    failures: 0,
    consecutiveFailures: 0,
  });
});
```

- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/service-source-health.test.ts
```

预期：因模块或导出不存在而失败。

- [x] **Step 3: 实现最小注册表**：使用按来源分组的事件数组保存 `{ at, latencyMs, ok, errorCode? }`；`snapshot` 先删除 `at <= now - 300000` 的事件，再计算计数、成功率、平均延迟、最近尝试和连续失败后缀。成功事件更新 `lastSuccessAt`，失败事件更新 `lastErrorCode`；空窗口只返回必需计数和 `consecutiveFailures: 0`。

- [x] **Step 4: 补充边界 RED/GREEN 测试**：覆盖窗口边界、过期记录清理、连续失败在成功后归零、失败后成功仍保留最近失败代码、延迟四舍五入为整数、所有来源互相隔离，并确认非法负延迟不会进入快照。

- [x] **Step 5: 运行 Task 1 GREEN 与类型检查**：

```bash
pnpm exec vitest run tests/service-source-health.test.ts
pnpm run typecheck:server
pnpm run lint -- server/hazards/source-health.ts tests/service-source-health.test.ts
git diff --check
```

预期：注册表测试通过，服务端类型检查和定向 lint 通过；不提交代码。

---

### Task 2: 接入 BFF 来源加载与 `meta.sources[]`

**Files:**

- Modify: `server/hazards/hazard-source.ts`
- Modify: `server.ts`
- Modify: `tests/server-auth.test.ts`
- Modify: `tests/service-hazard-source.test.ts`（仅在现有测试文件存在且直接覆盖公共 loader 时使用）

**Interfaces:**

- Consumes: `createHazardSourceHealthRegistry`, `HazardSourceHealth`, `HazardSourceHealthErrorCode` from Task 1。
- Produces: `HazardSourceStatus.health?: HazardSourceHealth`，现有 `/api/hazards` 响应继续包含 `meta.sources[]`，每个来源附带当前健康快照。

- [x] **Step 1: 写 BFF RED 测试**：在现有 `server-auth.test.ts` 增加断言：首次成功返回 `attempts: 1/successes: 1/failures: 0`；空数组仍增加成功；失败重试返回 `attempts: 2/failures: 2` 和稳定错误码；缓存命中返回 `stale` 且不增加尝试；成功请求不把公共 fallback 的占位状态误计为真实尝试。

```ts
assert.deepEqual(body.meta.sources[0]?.health, {
  windowMs: 300000,
  attempts: 1,
  successes: 1,
  failures: 0,
  successRate: 1,
  averageLatencyMs: 0,
  lastLatencyMs: 0,
  lastAttemptAt: body.meta.sources[0]?.health?.lastAttemptAt,
  lastSuccessAt: body.meta.sources[0]?.health?.lastSuccessAt,
  consecutiveFailures: 0,
});
```

- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/server-auth.test.ts tests/service-hazard-source.test.ts
```

预期：新增 `health` 断言失败，而既有旧字段测试继续通过。

- [x] **Step 3: 扩展来源状态类型**：在 `server/hazards/hazard-source.ts` 为 `HazardSourceStatus` 增加 `health?: HazardSourceHealth`，导出健康类型供 `server.ts` 使用；不修改现有状态枚举和 `HazardSourceLoader` 参数。

- [x] **Step 4: 集成真实加载计数**：在 `createApp` 创建一个健康注册表实例；`loadSource` 每次调用 `load()` 前记录开始时间，成功返回后按一次成功记录，catch 分支按一次失败记录并将未知异常映射为 `UPSTREAM_ERROR`，检测超时/HTTP/解析错误时映射到对应稳定码；重试继续沿用现有两次逻辑。

- [x] **Step 5: 合并健康快照**：让成功、空、stale、unavailable 状态都从注册表取得同一来源快照；缓存命中路径只读快照。`completeFallbackSourceStatuses` 为未在本次调用真实加载的来源附加快照，但不调用 `record*`；`meta.sources` 仍按 primary 加三个公共来源输出。

- [x] **Step 6: 运行 GREEN 与服务回归**：

```bash
pnpm exec vitest run tests/server-auth.test.ts tests/service-hazard-source.test.ts tests/service-source-health.test.ts
pnpm run test:bff
pnpm run typecheck:server
pnpm run lint
pnpm run format:check
git diff --check
```

预期：健康指标测试、BFF 测试、服务端类型检查、lint、格式检查和 diff 检查全部通过；Node engine warning 如出现只记录为环境提示。

---

### Task 3: 同步事实文档并完成验收

**Files:**

- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/TESTING_BASELINE.md`（仅当测试数量或命令说明变化）
- Modify: `package.json`（仅当格式清单缺少本规格/计划文件）

- [x] **Step 1: 写文档 RED 检查**：使用 `rg` 确认规格书和待办仍把数据源健康检查描述为未完成 P1，并确认 `package.json` 的 `format:check` 是否包含本规格和计划文件。

```bash
rg -n "数据源健康检查|成功率|陈旧|P1" docs/PROJECT_SPEC.md docs/PROJECT_OPTIMIZATION_BACKLOG.md
node -e 'const p=require("./package.json"); console.log(p.scripts["format:check"])'
```

- [x] **Step 2: 更新项目规格**：记录来源健康快照字段、5 分钟窗口、真实加载计数边界、缓存/fallback/stale 语义和进程重启清空限制；保留 PostgreSQL/PostGIS、历史快照、复杂几何和审计存储为未完成边界。

- [x] **Step 3: 更新优化清单**：将“数据源健康检查与新鲜度”移动到已完成能力，明确只做进程内 5 分钟统计；保留“PostgreSQL/PostGIS 技术设计”为下一项 P1。

- [x] **Step 4: 更新格式清单（必要时）**：只在实际缺少时加入 `docs/superpowers/specs/2026-09-19-source-health-registry-design.md` 与本计划路径；不加入过程报告，不误删用户既有调研文档。

- [x] **Step 5: 运行完整相关门禁**：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run test:bff
pnpm run test:services
pnpm run test:component
pnpm run test:e2e
pnpm run test:python
pnpm run build
git diff --check
```

预期：所有命令通过；若环境权限导致 BFF 监听失败，记录实际错误和已通过的替代测试，不修改测试规避。

- [x] **Step 6: 最终工作树验收**：确认变更只包含本需求代码、测试、文档和必要配置；确认 `docs/OPEN_SOURCE_DISASTER_VISUALIZATION_RESEARCH.md` 仍是用户既有未跟踪文件；不自动提交或推送。

---

## 完成定义

- 四个来源的 `meta.sources[]` 均可返回最近 5 分钟健康快照。
- 真实加载、重试、空结果、缓存命中、fallback 和 stale 的计数边界符合规格。
- 旧状态字段、fallback 语义、缓存 TTL 和 API 路径不变。
- 健康错误代码稳定且不泄露上游细节。
- 定向测试、完整质量门禁和最终工作树检查都有实际输出证据。
