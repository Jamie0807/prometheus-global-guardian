# 外部数据源时效性与韧性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为地图灾害来源提供超时、一次重试、5 分钟来源级缓存和陈旧数据提示。

**Architecture:** BFF 在来源请求边界封装可注入的超时、重试和内存缓存，保留 DisasterAWARE 首选与现有回退逻辑。聚合响应携带来源 `fetchedAt` 和 `meta.stale`，前端地图只根据该元数据显示陈旧提示。

**Tech Stack:** TypeScript、Express、node-fetch、Node test runner、React、Vitest。

## Global Constraints

- 每个来源默认超时为 8 秒、最多重试一次；服务端超时环境变量只能取 1–30 秒。
- 来源缓存仅存在 BFF 进程内，缓存有效期固定为 5 分钟；不写盘、不跨实例共享。
- DisasterAWARE 仍是唯一首选，只有实时失败或空结果时调用备用来源。
- 仅未过期缓存可以作为 `stale` 返回，且不能暴露上游 URL、凭据、响应正文或异常堆栈。
- 最终列表按 `source:id` 去重；不做跨来源事件匹配。
- 本轮不实现自动刷新、请求取消、客户端去重或共享缓存。

---

### Task 1: BFF 来源调用韧性与陈旧缓存

**Files:**

- Modify: `server/hazards/hazard-source.ts`
- Modify: `server.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**

- Produces: `HazardSourceState` 的 `stale` 变体、可选 `HazardSourceStatus.fetchedAt`、`HazardFeedResponse.meta.stale`。
- Consumes: `fetchWithTimeout`、既有 `fetchAllHazards`、DisasterAWARE 鉴权与 `/api/hazards` 聚合流程。

- [ ] **Step 1: 写入失败的 BFF 行为测试**

在 `tests/server-auth.test.ts` 添加可控时钟和 source fixture，验证：第一次实时成功写入缓存；第二次实时失败在 5 分钟内返回 `stale`、原 hazards 与首个 `fetchedAt`；超过 5 分钟不复用缓存；第一次尝试超时、第二次成功时为实时成功；最终相同 `source:id` 仅返回一次。

Run: `pnpm run test:bff`

Expected: 新测试失败，因为当前响应没有 `stale`、`fetchedAt`、超时重试或缓存。

- [ ] **Step 2: 定义来源缓存和重试接口**

在 `server/hazards/hazard-source.ts` 增加：

```ts
export type HazardSourceState = "success" | "empty" | "unavailable" | "fallback" | "stale";
export interface HazardSourceStatus {
  id: HazardSourceId;
  status: HazardSourceState;
  count: number;
  fetchedAt?: string;
  message?: string;
}
export interface CachedHazardSource {
  hazards: ServerHazard[];
  fetchedAt: string;
}
```

将公共来源 fetch 函数接受受控 fetch/超时包装器，使每次来源请求可以计时、一次重试、写入缓存，并在失败时读取未过期缓存。缓存键使用 `HazardSourceId`，TTL 为 `300_000` 毫秒。

- [ ] **Step 3: 实现 DisasterAWARE 与备用来源的来源级包装**

在 `server.ts` 读取 `HAZARD_SOURCE_TIMEOUT_MS`，通过现有 `readBoundedPositiveInteger` 约束到 1–30 秒并默认 8 秒。创建应用私有的来源缓存和 `loadSource` 包装器：每次实时调用最多两次，成功更新缓存和 `fetchedAt`；两次失败后仅返回仍在 TTL 内的同来源缓存并标记 `stale`。将 DisasterAWARE 与三个备用来源都接入该包装器，保持“仅首选失败/空时才请求备用来源”。

最终响应中的 `meta.stale` 使用 `sources.some((source) => source.status === "stale")`，并以：

```ts
const uniqueHazards = [
  ...new Map(hazards.map((hazard) => [`${hazard.source}:${hazard.id}`, hazard])).values(),
];
```

去重。

- [ ] **Step 4: 验证 BFF 回归**

Run: `pnpm run test:bff && pnpm run typecheck:server`

Expected: BFF 全部测试通过，服务端类型检查通过。

### Task 2: 前端陈旧提示与文档状态

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/features/map/MapView.tsx`
- Modify: `tests/component/map-view.test.tsx`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Interfaces:**

- Consumes: Task 1 的 `HazardFeedResponse.meta.stale` 和来源 `fetchedAt`。
- Produces: 地图状态条的陈旧提示及最近成功时间展示。

- [ ] **Step 1: 写入失败的组件测试**

在 `tests/component/map-view.test.tsx` mock `fetchHazardFeed` 返回 `meta.stale: true` 与 `disasteraware` 的 `fetchedAt: "2026-09-09T00:00:00.000Z"`，断言 `role="status"` 包含“数据可能已过期”和本地化日期。保留现有实时与回退状态断言。

Run: `pnpm run test:component`

Expected: 新断言失败，因为类型和状态条尚未处理 `stale`。

- [ ] **Step 2: 扩展前端类型和状态条**

在 `src/types/index.ts` 为 `HazardSourceState` 添加 `stale`，为 `HazardSourceStatus` 添加可选 `fetchedAt`，并在 `HazardFeedResponse.meta` 增加 `stale: boolean`。MapView 的 `getSourceStatusLabel` 在 `meta.stale` 时返回“数据可能已过期”，并使用所有 stale 来源中最早的 `fetchedAt` 生成最近成功时间；非陈旧路径保持现有标签。

- [ ] **Step 3: 更新优化清单**

在 `docs/PROJECT_OPTIMIZATION_BACKLOG.md` 将“外部数据源时效性与韧性”从剩余矩阵移入已完成项，写明 8 秒超时、一次重试、5 分钟进程内来源缓存、陈旧标识与 `source:id` 去重。保留“自动刷新与请求竞态保护”作为下一步。

- [ ] **Step 4: 验证前端测试与格式**

Run: `pnpm run test:component && pnpm run format:check && git diff --check`

Expected: 组件测试、格式检查和差异检查通过。

### Task 3: 完整质量验证与提交准备

**Files:**

- Verify: `server.ts`
- Verify: `server/hazards/hazard-source.ts`
- Verify: `src/types/index.ts`
- Verify: `src/features/map/MapView.tsx`
- Verify: `tests/server-auth.test.ts`
- Verify: `tests/component/map-view.test.tsx`
- Verify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

- [ ] **Step 1: 执行完整回归**

Run: `pnpm run test:baseline && docker compose run --rm analytics python -m unittest discover -s tests -p 'test_*.py' && git diff --check`

Expected: Node 基线完成 lint、格式、类型、BFF、Service、组件、E2E 和构建；Docker 输出 `Ran 26 tests` 与 `OK`；无空白错误。

- [ ] **Step 2: 审查提交范围**

Run: `git status --short && git diff --stat`

Expected: 仅包含本计划的 BFF、MapView、类型、测试、优化清单、设计和计划文档；无构建产物、缓存、凭据或临时报告。

- [ ] **Step 3: 在用户授权时提交**

Run: `printf '%s\\n' 'feat(hazards): add source resilience' | pnpm exec commitlint`

只有用户明确要求提交时，才暂存本计划文件并通过 `pnpm commit` 提交。
