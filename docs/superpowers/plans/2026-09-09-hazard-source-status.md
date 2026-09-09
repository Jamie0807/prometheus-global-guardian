# 灾害数据入口与来源级状态 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让地图只通过 BFF 获取首选 DisasterAWARE 数据或显式备用来源数据，并展示来源级降级状态。

**Architecture:** BFF 在 `/api/hazards` 内调度来源：先经既有鉴权代理读取 DisasterAWARE，再在失败或空结果时调用公共来源聚合器。前端 Service 解析统一响应，地图 Hook 仅消费该入口与来源元数据，MapView 负责渲染紧凑状态条。

**Tech Stack:** Express、TypeScript、React、Vitest、Node test runner、Mapbox mock。

## Global Constraints

- DisasterAWARE 是唯一首选来源；仅在其失败或无记录时调用 USGS、NASA EONET、GDACS。
- 浏览器不得直连上述公共来源，且不得读取 DisasterAWARE 凭据或 token。
- 来源消息必须是稳定的用户文本，不得暴露 URL、令牌、上游正文或异常细节。
- 本轮不加入超时、重试、缓存、新鲜度、自动刷新或请求取消。
- 全部来源无记录时返回成功的空结果；已有地图数据由前端保留。

---

### Task 1: BFF 统一来源调度与响应契约

**Files:**

- Modify: `server.ts`
- Modify: `server/hazards/hazard-source.ts`
- Modify: `tests/server-auth.test.ts`

**Interfaces:**

- Produces: `HazardFeedResponse`，包含 `hazards`、`meta.primary`、`meta.fallbackUsed`、`meta.generatedAt` 和四个来源的 `{ id, status, count, message? }`。
- Consumes: 既有 DisasterAWARE 鉴权、`fetchWithTimeout`、`fetchAllHazards` 和 `ServerHazard`。

- [ ] **Step 1: 先添加失败的 BFF 契约测试**

在 `tests/server-auth.test.ts` 增加 fixtures 与测试，验证：DisasterAWARE 有记录时只请求 `/authorize` 和 `/hazards/active`，不会调用备用聚合器；空数组与 502 时调用备用聚合器；备用部分成功返回规范来源状态；上游异常文本不在 JSON 响应中。

Run: `pnpm run test:bff`

Expected: 新增断言在实现前失败，因为 `/api/hazards` 仍直接调用公共来源聚合器。

- [ ] **Step 2: 定义稳定来源类型和公共来源结果**

在 `server/hazards/hazard-source.ts` 导出：

```ts
export type HazardSourceId = "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";
export type HazardSourceState = "success" | "empty" | "unavailable" | "fallback";
export interface HazardSourceStatus {
  id: HazardSourceId;
  status: HazardSourceState;
  count: number;
  message?: string;
}
```

将公共聚合器的结果收敛为 hazards 与 `usgs`、`nasa-eonet`、`gdacs` 的稳定状态，捕获异常时只标记 `unavailable`，不保存 `String(error)` 供客户端返回。

- [ ] **Step 3: 实现 DisasterAWARE 首选与回退分支**

在 `server.ts` 提取受鉴权保护的 DisasterAWARE 活动灾害请求与 `ServerHazard` 适配器。`GET /api/hazards` 先获取该结果；有记录则返回四来源状态且不调用备用聚合器。空数组标记 `empty`，异常标记 `unavailable`，两种情况均调用备用聚合器并设置 `fallbackUsed: true`。类型筛选在合并结果后执行，响应中的 `data` 改为 `hazards`，统一为设计文档的 `HazardFeedResponse`。

- [ ] **Step 4: 运行 BFF 回归测试**

Run: `pnpm run test:bff`

Expected: 64 个既有测试和新增来源调度测试全部通过。

### Task 2: 前端统一入口与地图来源状态条

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/services/hazards/hazardService.ts`
- Modify: `src/features/map/hooks/useHazardData.ts`
- Modify: `src/features/map/MapView.tsx`
- Modify: `tests/component/map-view.test.tsx`
- Test: `tests/service-*.test.ts`

**Interfaces:**

- Consumes: Task 1 的 `HazardFeedResponse`。
- Produces: `fetchHazardFeed(filter?: string): Promise<HazardFeedResponse>` 与 `MapView` 的来源状态条。

- [ ] **Step 1: 添加失败的 Service 与组件测试**

Service 测试 mock `/api/hazards` 的完整响应，断言 `fetchHazardFeed` 返回 hazards 和 meta；组件测试 mock 统一入口，断言不再调用 `fetchHazardsActive` 或三个外部 fetch 函数，且分别显示“已更新”“暂无数据 · 已显示备用数据”“暂不可用 · 已显示备用数据”。

Run: `pnpm run test:services && pnpm run test:component`

Expected: 新测试失败，因为统一入口和状态条尚不存在。

- [ ] **Step 2: 定义前端契约并实现 Service**

在 `src/types/index.ts` 增加与 BFF 相同的来源 ID、状态、`HazardSourceStatus` 和 `HazardFeedResponse` 类型。`hazardService` 新增 `fetchHazardFeed`，通过 `requestJson<HazardFeedResponse>` 请求 `/api/hazards`，可选 type 使用 `URLSearchParams`；删除 Map Hook 对 `fetchHazardsActive`、`fetchUSGSEarthquakes`、`fetchNASAEONET`、`fetchGDACS` 的依赖。

- [ ] **Step 3: 收敛 Hook 与渲染状态条**

`useHazardData` 调用 `fetchHazardFeed`，保留 Worker 清洗；仅在返回 hazards 非空时替换地图数据，向 `MapView` 暴露 `sourceMeta`。MapView 根据 `sourceMeta` 渲染带 `role="status"` 的状态条，并在首屏空结果显示“暂无可用灾害数据”。

- [ ] **Step 4: 运行前端测试**

Run: `pnpm run test:services && pnpm run test:component`

Expected: Service 与组件测试全绿，现有 Popup 安全测试仍通过。

### Task 3: 文档、优化清单与整体验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `README.md` only if endpoint documentation requires it

- [ ] **Step 1: 更新优化清单**

将“最小 CI 门禁与 Python 测试入口”移到已完成优化项，记录 `pnpm run test:python` 与 GitHub Actions 双任务门禁；将“统一灾害数据入口与来源级状态”标记为已完成，说明 DisasterAWARE 首选和回退边界。保留数据源韧性、自动刷新和公开 Analytics API 治理的后续范围。

- [ ] **Step 2: 执行完整验证**

Run: `pnpm run test:baseline && docker compose run --rm analytics python -m unittest discover -s tests -p 'test_*.py' && git diff --check`

Expected: Node 基线通过；Docker Python 输出 `Ran 26 tests` 与 `OK`；无 diff 空白错误。

- [ ] **Step 3: 审查提交范围**

Run: `git status --short && git diff --stat`

Expected: 仅包含 BFF 灾害聚合、前端 Service/Map、对应测试、优化清单、设计和计划文件；不包含凭据、构建产物或临时报告。

- [ ] **Step 4: 在用户授权范围内提交**

先运行：

```bash
printf '%s\\n' 'feat(hazards): centralize source status' | pnpm exec commitlint
```

仅暂存本计划涉及文件，使用 `pnpm commit` 创建 Conventional Commit。
