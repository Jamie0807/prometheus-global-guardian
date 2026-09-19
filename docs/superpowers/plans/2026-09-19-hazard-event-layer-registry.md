# 统一灾害事件与图层注册表实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 执行本计划。步骤使用复选框跟踪；本仓库未获用户授权时不得自动提交 Git。

**Goal:** 在 BFF、浏览器、Analytics、数据质量和 AI 边界建立共享的灾害事件 canonical 模型与逻辑图层注册表，同时保持现有 API、算法和旧字段兼容。

**Architecture:** 新增不依赖运行时的 `shared/hazards/` TypeScript 模块和 `contracts/hazard-event.json` 跨语言样本。BFF 数据源适配器首先生成 canonical 事件，浏览器 parser 负责兼容旧响应并将数据交给 Worker、地图、Analytics、质量和 AI；Python 只增加可选请求字段，不改变算法和端点。

**Tech Stack:** TypeScript 5、Express 5、React 19、Vite、Vitest、Node test runner、Python 3.13、Pydantic、unittest、Prettier。

## Global Constraints

- 开始每个实现批次前运行 `git status --short`；保留现有未跟踪的 `docs/OPEN_SOURCE_DISASTER_VISUALIZATION_RESEARCH.md`。
- `eventId` 必须为 `${sourceId}:${sourceEventId}`；缺少稳定来源事件 ID 的记录跳过，不使用数组下标或 `Date.now()` 生成跨刷新 ID。
- `schemaVersion` 当前只接受 `"1"`；未知灾害类型和未知 `layerId` 回退到 `unknown`，不得使整批数据失败。
- 坐标顺序保持 `[longitude, latitude]`；当前只规范现有点状数据，不增加多边形、历史回放或空间数据库。
- `confidence` 是可选的 `0..1` 数值；来源没有可信依据时保持缺省。
- 保留 `Hazard.id`、`Hazard.source`、`Hazard.timestamp`、Analytics `timestamp`/`source` 等兼容字段。
- 不引入数据库、Redis、Socket.IO 或生产依赖；不改变 API 路径、分析算法、刷新竞态和来源 fallback 语义。
- 每项行为先写失败测试并确认 RED，再写最小实现并确认 GREEN；所有计划、进度和交付说明使用中文。
- 新增 TypeScript 边界使用 `unknown`、类型守卫和 `import type`，不新增无必要的 `any`。
- 未经用户明确要求，不执行 `git add`、`git commit`、push、PR 或修改 Git 历史；用 `git diff --stat` 和 `git status --short` 做检查点。

---

## 文件与责任地图

| 文件                                                                           | 责任                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `shared/hazards/hazard-event.ts`                                               | canonical 事件、来源 ID、版本和事件 ID 构造/校验辅助函数。 |
| `shared/hazards/hazard-layer-registry.ts`                                      | 类型到逻辑 `layerId` 的注册表与回退解析。                  |
| `contracts/hazard-event.json`                                                  | TypeScript/Python 共同读取的完整、兼容和非法样本。         |
| `server/hazards/hazard-source.ts`                                              | USGS、NASA EONET、GDACS 适配器及服务端事件归一化。         |
| `server.ts`                                                                    | DisasterAware 适配、BFF 聚合去重和 canonical 响应字段。    |
| `src/types/index.ts`                                                           | 浏览器共享 Hazard 类型及旧字段别名。                       |
| `src/services/hazards/contracts/hazardFeed.ts`                                 | BFF Hazard 响应的 `unknown` 运行时解析和旧响应归一化。     |
| `src/workers/hazard-worker.ts`                                                 | canonical 事件坐标清洗与 `eventId` 去重。                  |
| `src/features/map/utils/hazardGeojson.ts`                                      | 地图 GeoJSON 的 canonical 属性透传。                       |
| `src/services/analytics/analyticsTypes.ts`、`analyticsService.ts`              | Analytics 输入的可选 canonical 字段与兼容转换。            |
| `python-analytics-service/app/schemas/requests.py`                             | Python 请求模型的可选 canonical 字段与边界验证。           |
| `src/components/AIChatAssistant.tsx`、`src/services/ai/aiAssistantService.ts`  | 浏览器 AI 上下文中的来源和图层元数据。                     |
| `server/ai/ai-provider.ts`、`server/security/ai-request.ts`                    | 服务端 AI 摘要类型、提示和请求边界。                       |
| `tests/` 与 `python-analytics-service/tests/`                                  | 注册表、适配器、解析、跨语言和回归测试。                   |
| `docs/PROJECT_SPEC.md`、`docs/PROJECT_OPTIMIZATION_BACKLOG.md`、`package.json` | 事实文档、待办状态和格式检查清单。                         |

---

### Task 1: 建立共享事件模型、图层注册表和跨语言样本

**Files:**

- Create: `shared/hazards/hazard-event.ts`
- Create: `shared/hazards/hazard-layer-registry.ts`
- Create: `contracts/hazard-event.json`
- Modify: `tsconfig.app.json`
- Modify: `tsconfig.server.json`
- Test: `tests/service-hazard-event-registry.test.ts`

**Interfaces:**

```ts
export type HazardSourceId = "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";
export type HazardLayerId =
  | "earthquake"
  | "volcanic"
  | "hydrological"
  | "meteorological"
  | "fire"
  | "land"
  | "drought"
  | "unknown";

export interface HazardEvent {
  schemaVersion: "1";
  eventId: string;
  sourceEventId: string;
  sourceId: HazardSourceId;
  layerId: HazardLayerId;
  type: string;
  title: string;
  geometry: { type: string; coordinates: number[] };
  observedAt?: string;
  updatedAt?: string;
  severity?: string;
  confidence?: number;
  magnitude?: number;
  description: string;
  url?: string;
}

export function createHazardEventId(sourceId: HazardSourceId, sourceEventId: string): string;
export function resolveHazardLayerId(type: string): HazardLayerId;
```

- [x] **Step 1: 写 RED 测试**：覆盖 `createHazardEventId("usgs", "abc")` 返回 `usgs:abc`、空来源 ID 被拒绝、所有首批类型映射到预期图层、未知类型回退 `unknown`，并验证共享 JSON 样本包含可选 `confidence` 字段；`confidence` 的运行时范围校验留给 Task 3 和 Task 4 的 parser/model。

```ts
it("使用来源和上游事件 ID 构造稳定 canonical ID", () => {
  expect(createHazardEventId("usgs", "abc")).toBe("usgs:abc");
});

it("将未知灾害类型回退到 unknown 图层", () => {
  expect(resolveHazardLayerId("UNRECOGNIZED")).toBe("unknown");
});
```

- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/service-hazard-event-registry.test.ts
```

预期：因共享模块不存在或导出未实现而失败。

- [x] **Step 3: 实现最小共享模块**：在 `shared/hazards/hazard-event.ts` 导出精确的 `HazardSourceId`、`HazardLayerId`、`HazardEvent` 和 `createHazardEventId`；在 `hazard-layer-registry.ts` 定义首批八个逻辑图层、类型集合和 `resolveHazardLayerId`。对空 `sourceEventId` 抛出 `TypeError`，不记录原始数据。
- [x] **Step 4: 加入跨语言样本**：`contracts/hazard-event.json` 至少包含 `valid.complete`、`valid.optionalOmitted`、`valid.unknownType` 和 `invalid` 数组；完整样本使用 `usgs:usgs-1`，包含 `sourceId`、`layerId`、`observedAt`、`updatedAt` 和 `confidence: 0.8`，非法样本覆盖版本、事件 ID、坐标和置信度。
- [x] **Step 5: 扩展 TypeScript 编译范围**：将 `shared` 加入 `tsconfig.app.json` 和 `tsconfig.server.json` 的 `include`，确保浏览器和 BFF 都从同一模块导入类型。
- [x] **Step 6: 运行 GREEN 和类型检查**：

```bash
pnpm exec vitest run tests/service-hazard-event-registry.test.ts
pnpm run typecheck:client
pnpm run typecheck:server
```

预期：注册表测试通过，两个 TypeScript 类型检查通过。

- [x] **Step 7: 检查差异**：运行 `git diff --stat` 和 `git status --short`，确认未跟踪调研文档仍存在，未产生构建产物或依赖变更。此项目不执行自动提交。

### Task 2: 将四个 BFF 数据源适配到 canonical 事件

**Files:**

- Modify: `server/hazards/hazard-source.ts`
- Modify: `server.ts`
- Modify: `tests/server-auth.test.ts`
- Create: `tests/server-hazard-event-registry.test.ts`

**Interfaces:**

```ts
export interface ServerHazard extends HazardEvent {
  id: string;
  source: string;
  timestamp?: string;
}

export interface FetchAllHazardsResult {
  hazards: ServerHazard[];
  sources: HazardSourceStatus[];
}
```

- [x] **Step 1: 写 BFF RED 测试**：新增 USGS、NASA、GDACS fixtures，断言 `eventId`、`sourceEventId`、`sourceId`、`layerId`、时间字段和 `id === eventId`；补充缺少 `feature.id`、`event.id`、`properties.eventid` 和 DisasterAware `hazard_ID` 的样本，断言记录被跳过。

```ts
it("将 USGS 事件归一化为稳定 canonical 事件", async () => {
  const result = await fetchUSGSEarthquakes(mockFetchWith({ id: "usgs-1" }));
  expect(result[0]).toMatchObject({
    eventId: "usgs:usgs-1",
    sourceEventId: "usgs-1",
    sourceId: "usgs",
    layerId: "earthquake",
    id: "usgs:usgs-1",
  });
});
```

- [x] **Step 2: 运行 BFF RED 测试**：

```bash
pnpm exec vitest run tests/server-hazard-event-registry.test.ts
```

预期：因 `ServerHazard` 缺少 canonical 字段或适配器仍使用旧 ID 而失败。

- [x] **Step 3: 改造公共源适配器**：从 `shared/hazards` 导入来源类型、事件 ID 和图层解析；USGS 使用 `feature.id`，NASA 使用 `event.id`，GDACS 使用 `properties.eventid`，缺失时返回空记录；`timestamp` 与 `observedAt` 同步已有观测时间，GDACS/DisasterAware 可用来源更新时间填充 `updatedAt`。
- [x] **Step 4: 改造 DisasterAware 适配器**：固定 `sourceId: "disasteraware"`，只接受字符串或有限数字形式的 `hazard_ID`，删除 `da-${index}` 回退；从 `type_ID` 生成 `layerId`，从 `create_Date`/`last_Update` 分别生成 `observedAt`/`updatedAt`；保留 `creator` 作为旧 `source` 显示值。
- [x] **Step 5: 改造 BFF 聚合去重**：将现有 `${hazard.source}:${hazard.id}` Map key 改为 `hazard.eventId`，并保留 `id === eventId` 的兼容断言；不改变 primary/fallback/stale 和类型筛选逻辑。
- [x] **Step 6: 运行 GREEN 和 BFF 回归**：

```bash
pnpm exec vitest run tests/server-hazard-event-registry.test.ts tests/server-auth.test.ts
pnpm run build:server:test
```

预期：canonical 适配测试和现有服务端灾害测试通过。

- [x] **Step 7: 检查敏感信息与差异**：确认测试输出不包含上游原始 body、凭据或 token；运行 `git diff --check` 和 `git diff --stat`，不提交。

### Task 3: 更新浏览器 Hazard 契约、Worker 和地图转换

**Files:**

- Modify: `src/types/index.ts`
- Modify: `src/services/hazards/hazardAdapters.ts`
- Modify: `src/services/hazards/contracts/hazardFeed.ts`
- Modify: `src/workers/hazard-worker.ts`
- Modify: `src/features/map/utils/hazardGeojson.ts`
- Modify: `tests/service-hazard-feed.test.ts`
- Modify: `tests/service-adapters.test.ts`
- Modify: `tests/service-map-utils.test.ts`
- Modify: `tests/component/map-view.test.tsx`

**Interfaces:**

```ts
export interface Hazard extends HazardEvent {
  id: string;
  source: string;
  timestamp?: string;
}

export interface HazardLodProperties {
  readonly id: string;
  readonly eventId: string;
  readonly sourceId: HazardSourceId;
  readonly layerId: HazardLayerId;
  readonly title: string;
  readonly type: string;
  readonly severity: string | undefined;
  readonly color: string;
}
```

- [x] **Step 1: 写 parser 和 Worker RED 测试**：在 `tests/service-hazard-feed.test.ts` 加入完整 canonical feed、旧兼容 feed、错误 `eventId`、越界 `confidence` 和未知 `schemaVersion`；在 Worker/地图测试中断言同一 `eventId` 的重复记录只保留一条，并且 GeoJSON properties 透传 `eventId`、`sourceId`、`layerId`。
- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/service-hazard-feed.test.ts tests/service-map-utils.test.ts
```

预期：旧 parser 无法读取 canonical 字段或地图输出缺少新属性而失败。

- [x] **Step 3: 扩展浏览器领域类型**：让 `Hazard` 继承共享 `HazardEvent`，保留 `id`、`source`、`timestamp` 兼容字段；不要删除 `HazardFeedResponse.meta` 的来源状态类型。
- [x] **Step 4: 实现 parser 归一化**：新响应校验必填 canonical 字段及 `eventId` 组合规则；旧响应使用合法 `source` 映射 `sourceId`，以旧 `id` 推导 `sourceEventId`/`eventId`，从 `type` 解析 `layerId`，没有依据的时间和置信度保持缺省；未知类型回退 `unknown`。
- [x] **Step 5: 更新 Worker 去重**：`WorkerHazard` 增加 canonical 字段，`dedup` 使用 `eventId`，仅在兼容输入缺少 `eventId` 时使用已归一化的 `id`；不改变坐标合法性过滤。
- [x] **Step 6: 更新 GeoJSON 属性**：在 LOD feature properties 增加 `eventId`、`sourceId` 和 `layerId`；保留原有 `id`、`title`、`type`、`severity` 和颜色逻辑；热力图只保留现有 `magnitude`/`type` 数据口径。
- [x] **Step 7: 运行 GREEN 和前端检查**：

```bash
pnpm exec vitest run tests/service-hazard-feed.test.ts tests/service-map-utils.test.ts tests/component/map-view.test.tsx
pnpm run typecheck:client
```

预期：契约、地图工具和 MapView 测试通过，客户端类型检查通过。

### Task 4: 接入 Analytics 输入和 Python 跨语言契约

**Files:**

- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `python-analytics-service/app/schemas/requests.py`
- Modify: `tests/service-cross-language-hazard-contract.test.ts`
- Modify: `tests/service-analytics.test.ts`
- Modify: `python-analytics-service/tests/test_cross_language_hazard_contract.py`
- Modify: `python-analytics-service/tests/test_api_contract.py`

**Interfaces:**

```ts
export interface HazardData {
  id: string;
  type: string;
  title: string;
  coordinates: HazardCoordinates;
  timestamp: string;
  magnitude?: number | null;
  severity?: string;
  source?: string;
  populationExposed?: number | null;
  schemaVersion?: "1";
  eventId?: string;
  sourceEventId?: string;
  sourceId?: HazardSourceId;
  layerId?: HazardLayerId;
  observedAt?: string;
  updatedAt?: string;
  confidence?: number;
}
```

- [x] **Step 1: 写 TypeScript/Python RED 测试**：读取 `contracts/hazard-event.json` 的完整样本，断言 `formatHazards` 保留 canonical 字段；补充 `confidence: -0.01`、`confidence: 1.01`、不匹配 `eventId` 和未知字段的失败用例。
- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/service-cross-language-hazard-contract.test.ts tests/service-analytics.test.ts
pnpm run test:python -- python-analytics-service/tests/test_cross_language_hazard_contract.py python-analytics-service/tests/test_api_contract.py
```

预期：TypeScript 类型、parser 或 Python `extra="forbid"` 尚未支持新字段而失败。

- [x] **Step 3: 扩展 TypeScript Analytics 类型和 formatter**：为 `HazardData` 增加上方可选字段；`formatHazards` 从 canonical `eventId`、`sourceId`、`layerId`、`observedAt`、`updatedAt` 读取，并继续提供 `id`、`source`、`timestamp` 兼容值；`confidence` 只接受有限 `0..1` 数值。
- [x] **Step 4: 扩展 Python Pydantic 模型**：在 `HazardData` 增加对应可选字段，使用现有 `Field` 长度/数值边界和 validator；当 `eventId`、`sourceId`、`sourceEventId` 三者同时存在时校验一致性，canonical 版本未知时拒绝，未知 `layerId` 统一规范化为 `unknown`。
- [x] **Step 5: 校验共享样本**：TypeScript 测试读取 `contracts/hazard-event.json`，Python 测试用 `HazardData.model_validate` 读取同一样本；保留现有 `contracts/analytics-hazard-data.json` 测试，不用新模型替换旧兼容样本。
- [x] **Step 6: 运行 GREEN 和 Python 回归**：

```bash
pnpm exec vitest run tests/service-cross-language-hazard-contract.test.ts tests/service-analytics.test.ts
pnpm run test:python
pnpm run typecheck:client
```

预期：Analytics Service、跨语言样本、Python 请求模型和客户端类型检查通过。

### Task 5: 统一质量检查和 AI 灾害上下文

**Files:**

- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `src/services/ai/aiAssistantService.ts`
- Modify: `server/ai/ai-provider.ts`
- Modify: `server/security/ai-request.ts`
- Modify: `src/components/DataQualityMonitor.tsx`
- Modify: `python-analytics-service/analytics/quality_monitor.py`
- Modify: `tests/ai-provider.test.ts`
- Modify: `tests/request-boundaries.test.ts`
- Modify: `tests/service-ai.test.ts`
- Modify: `tests/component/data-quality-monitor.test.tsx`

**Interfaces:**

```ts
export interface HazardSummary {
  title?: string;
  type?: string;
  severity?: string;
  magnitude?: number;
  sourceId?: HazardSourceId;
  layerId?: HazardLayerId;
}

export interface DisasterContext {
  total?: number;
  byType?: Record<string, number>;
  recent?: HazardSummary[];
}
```

- [x] **Step 1: 写 AI/质量 RED 测试**：组件构造的 `recent` 记录必须包含 `sourceId` 和 `layerId`；BFF 请求边界接受合法可选字段、拒绝超长字段和非法 `confidence`；AI prompt 能安全显示 layer label；质量检查使用 canonical `sourceId` 作为来源维度。
- [x] **Step 2: 运行 RED 测试**：

```bash
pnpm exec vitest run tests/ai-provider.test.ts tests/request-boundaries.test.ts tests/service-ai.test.ts tests/component/data-quality-monitor.test.tsx
```

预期：现有 AI 类型、请求校验和质量来源处理不认识 canonical 字段而失败。

- [x] **Step 3: 更新浏览器 AI 上下文**：`AIChatAssistant` 从 `Hazard` 读取 `sourceId`/`layerId`；`aiAssistantService` 保持现有上下文条数、字段长度和请求体限制，在序列化时仅加入可选短字符串。
- [x] **Step 4: 更新服务端 AI 边界**：扩展 `HazardSummary`、`isValidRecentHazard` 和 prompt 构造；只允许长度不超过既有 `MAX_CONTEXT_FIELD_LENGTH` 的 `sourceId`/`layerId`，不把原始灾害对象或 URL 放入 prompt。
- [x] **Step 5: 更新质量检查来源语义**：前端和 Python 质量入口优先消费 canonical `sourceId`；旧 `source` 仍可作为兼容 fallback；未知来源显示为安全的 `unknown`，不放宽既有原始文本长度和未知来源问题检测。
- [x] **Step 6: 运行 GREEN 和相关类型检查**：

```bash
pnpm exec vitest run tests/ai-provider.test.ts tests/request-boundaries.test.ts tests/service-ai.test.ts tests/component/data-quality-monitor.test.tsx
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run test:python
```

预期：AI、请求边界、质量组件和 Python 质量测试通过，客户端/服务端类型检查通过。

### Task 6: 同步文档、格式清单并完成整体验收

**Files:**

- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `package.json`
- Modify: `docs/TESTING_BASELINE.md`（仅当实际测试数量或命令说明变化）

- [x] **Step 1: 写文档验收检查**：先用 `rg` 确认规格书当前仍写明“事件/图层注册表未统一”，并确认待办将其列为 P1 剩余项。
- [x] **Step 2: 更新项目规格**：补充 `shared/hazards/`、`contracts/hazard-event.json`、canonical 字段、旧字段兼容、BFF/浏览器/Python 数据流和未知类型回退规则；保留数据源健康检查、数据库设计和复杂几何为未完成边界。
- [x] **Step 3: 更新优化清单**：将统一灾害事件与图层注册表移入已完成能力，记录 `eventId`、`sourceId`、`layerId`、时间和置信度边界；保留“数据源健康检查”和“PostgreSQL/PostGIS 技术设计”为下一项 P1。
- [x] **Step 4: 更新格式入口**：在 `package.json` 的 `format:check` 文件列表中加入 `contracts/hazard-event.json` 和 `docs/superpowers/specs/2026-09-19-hazard-event-layer-registry-design.md`；不把过程文件或现有调研文档误删出清单。
- [x] **Step 5: 运行完整质量门禁**：

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

预期：所有命令通过；若 BFF 监听测试在受限环境因 `listen EPERM` 失败，记录为环境限制并在具备本地端口权限的环境重跑，不通过放宽测试规避。

- [x] **Step 6: 最终人工验收**：用 `git status --short` 和 `git diff --stat` 确认只包含本需求实现、测试、文档、共享样本和必要配置；确认 `docs/OPEN_SOURCE_DISASTER_VISUALIZATION_RESEARCH.md` 仍作为用户既有未跟踪文件保留；未授权时不暂存、不提交。

## 完成定义

- BFF、Worker 和所有下游边界对同一来源事件使用同一个 `eventId`；
- 首批灾害类型均通过共享注册表得到稳定 `layerId`，未知类型安全回退；
- 新旧 Hazard 响应都能安全解析，非法 canonical 字段被拒绝且不泄露原始数据；
- TypeScript、BFF、Python 和共享 JSON 样本测试一致；
- 现有地图、Analytics、质量、AI、fallback、刷新竞态和安全边界无回归；
- 质量清单和项目规格书准确记录完成能力与剩余边界；
- 完整质量门禁有实际命令输出作为交付证据；
- 工作区未发生未经用户授权的 Git 提交或历史修改。
