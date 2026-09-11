# Hazard 与通用 HTTP 边界类型治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Hazard 全部上游 JSON 经运行时解析后转为既有领域类型，并让通用 `requestJson` 明确只返回 `unknown`。

**Architecture:** HTTP 客户端保留请求与传输错误语义，成功 JSON 以 `unknown` 交由调用方处理。Hazard contracts 校验 BFF 和 DisasterAware，现有 `hazardAdapters` 使用共享守卫校验三个公开来源并映射为领域模型；公开来源保留逐条跳过和空数组降级。

**Tech Stack:** TypeScript 5.9 strict、Fetch、Vitest、React 19、现有 Express Hazard BFF。

## Global Constraints

- `requestJson` 只返回 `Promise<unknown>`；只负责网络、超时、HTTP 状态和 JSON 语法，不能引入领域类型或 `as T` 断言。
- `ServiceErrorCode` 增加 `invalid_response`，仅用于“合法 JSON 但不符合调用方契约”；错误不得包含上游 URL、JSON 正文、动态键或堆栈。
- 保持 HTTP 重试、超时、`AbortSignal`、`authFetch` 的 401/403 刷新逻辑和 HTTP 既有错误码不变。
- BFF 与 DisasterAware 顶层结构或必要字段错误必须拒绝；USGS、NASA EONET 和 GDACS 对混合数组只跳过无效单条记录，顶层错误仍按现有空数组语义降级。
- 保持已有公开 URL、请求参数、`Hazard`、`ActiveHazard`、`HazardType`、`HazardFeedResponse` 和组件消费接口，不修改 BFF 来源优先级、缓存、超时、重试或来源状态。
- 不新增 schema 依赖，不修改 Python、BFF 或组件展示代码；解析器是无副作用的 TypeScript 函数。
- 每项先写失败测试并确认 RED，再写最小实现确认 GREEN；不自动执行 `git add`、`git commit`、push 或改写历史。

---

### Task 1: 明确通用 JSON 边界与授权响应契约

**Files:**

- Modify: `src/services/http/httpClient.ts`
- Modify: `src/services/http/serviceError.ts`
- Modify: `src/services/auth/authService.ts`
- Modify: `tests/service-http.test.ts`
- Create: `tests/service-auth.test.ts`

**Interfaces:**

```ts
export type ServiceErrorCode = "network" | "timeout" | "http" | "invalid_json" | "invalid_response";

export async function requestJson(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: HttpRequestOptions,
): Promise<unknown>;

function parseAuthorizeResponse(value: unknown): { authorized: true };
```

- [x] **Step 1: 写 HTTP 与授权失败测试**

在 `tests/service-http.test.ts` 将成功断言改为 `const payload: unknown = await requestJson(...)`，再用局部类型守卫读取 `ok`，证明 HTTP 层不产生静态领域类型；保留无效 JSON、HTTP 错误、超时、取消和重试测试。新增 `tests/service-auth.test.ts`，mock `requestJson`，断言 `{ authorized: true }` 后 `getAccessToken()` 返回 `bff-managed`，`{ authorized: false }`、缺失字段和非对象值均抛出 `ServiceError` 且 `code` 是 `invalid_response`。

```ts
it("rejects a syntactically valid but invalid authorize response", async () => {
  requestJsonMock.mockResolvedValue({ authorized: false });
  await expect(authorize()).rejects.toMatchObject({ code: "invalid_response" });
  expect(getAccessToken()).toBe("");
});
```

- [x] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-http.test.ts tests/service-auth.test.ts`

预期：`tests/service-auth.test.ts` 因授权响应未解析而失败；HTTP 成功测试需要按 `unknown` 语义调整。

- [x] **Step 3: 实现最小 HTTP 与授权解析**

将 `requestJson<T>` 改为不带泛型的 `requestJson(...): Promise<unknown>`，保留 `JSON.parse(responseText)` 的原始结果。向错误码联合添加 `invalid_response`。在 `authService.ts` 增加本地对象守卫，只接受严格 `authorized === true`，再设置模块级授权状态；其它 JSON 值抛出固定文案的 `new ServiceError("Authorization response is invalid", "invalid_response")`。

```ts
function parseAuthorizeResponse(value: unknown): { authorized: true } {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { authorized?: unknown }).authorized !== true
  ) {
    throw new ServiceError("Authorization response is invalid", "invalid_response");
  }
  return { authorized: true };
}

export async function authorize(): Promise<void> {
  parseAuthorizeResponse(
    await requestJson("/api/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }),
  );
  authorized = true;
}
```

- [x] **Step 4: 运行 GREEN 与类型检查**

运行：`pnpm exec vitest run tests/service-http.test.ts tests/service-auth.test.ts && pnpm run typecheck:client`

预期：两份测试通过；客户端 TypeScript 检查无 `requestJson` 泛型残留。

### Task 2: 建立 Hazard 契约基础与 BFF/公开源解析器

**Files:**

- Create: `src/services/hazards/contracts/common.ts`
- Create: `src/services/hazards/contracts/hazardFeed.ts`
- Modify: `src/services/hazards/hazardAdapters.ts`
- Modify: `src/services/hazards/hazardService.ts`
- Modify: `tests/service-adapters.test.ts`
- Modify: `tests/service-hazard-feed.test.ts`

**Interfaces:**

```ts
export class HazardContractError extends ServiceError {
  readonly path: string;
  constructor(path: string);
}

export function asRecord(value: unknown): Record<string, unknown> | undefined;
export function asRecordArray(value: unknown): Record<string, unknown>[];
export function parseHazardFeed(value: unknown): HazardFeedResponse;
```

- [x] **Step 1: 写 BFF 与公开源失败测试**

在 `tests/service-hazard-feed.test.ts` 保留现有有效 BFF fixture，新增 `hazards` 不是数组、`meta.primary` 不在 `disasteraware | usgs | nasa-eonet | gdacs`、`meta.sources.0.count` 为负数以及 hazard 缺少 `geometry.coordinates` 的断言，全部要求抛出 `{ code: "invalid_response" }` 且错误文本不含 fixture 数据。在 `tests/service-adapters.test.ts` 增加 USGS、NASA、GDACS 的顶层非对象返回 `[]`，以及每个来源包含一条有效和一条缺少 id/geometry/有限坐标的记录时只返回有效记录。

```ts
expect(() => parseHazardFeed({ hazards: [], meta: { primary: "other" } })).toThrowError(
  expect.objectContaining({ code: "invalid_response", path: "meta.primary" }),
);
expect(adaptUSGSResponse({ features: [validFeature, { id: "bad" }] })).toHaveLength(1);
```

- [x] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-adapters.test.ts tests/service-hazard-feed.test.ts`

预期：解析器导入尚不存在，且现有 `fetchHazardFeed` 会直接返回损坏 BFF JSON，因此新断言失败。

- [x] **Step 3: 实现共享守卫与 BFF 契约**

在 `common.ts` 实现 `parseRecord`、`parseString`、`parseFiniteNumber`、`parseStringArray`、`parseCoordinates`、`parseOptionalString`、`parseNonNegativeInteger`，失败时抛 `HazardContractError(path)`。`HazardContractError` 固定使用 `invalid_response` 和 `"Hazard response is invalid"`，路径只能是静态字段索引，动态字典键一律写为 `[key]`。

`hazardFeed.ts` 严格校验 `hazards` 数组中每个 `Hazard` 的 `id`、`title`、`type`、`description`、`source`、`geometry.type` 和有限数值坐标；可选 `severity`、`magnitude`、`timestamp`、`url` 仅在存在时校验类型。它还校验 `meta.primary`、布尔 `fallbackUsed`/`stale`、字符串 `generatedAt`，及每条来源状态的枚举、非负整数 `count` 和可选字符串字段。

```ts
const sourceIds = new Set(["disasteraware", "usgs", "nasa-eonet", "gdacs"]);
function parseSourceId(value: unknown, path: string): HazardSourceId {
  const id = parseString(value, path);
  if (!sourceIds.has(id)) throw new HazardContractError(path);
  return id as HazardSourceId;
}
```

- [x] **Step 4: 在现有适配器实现公开源逐条契约**

`hazardAdapters.ts` 使用 `common.ts` 的记录、字符串、有限数值和 geometry 守卫。三个 adapter 先验证顶层记录和列表字段；缺少 `features`/`events` 或顶层非记录返回空数组，单条记录只在具备其来源必要字段与有效 geometry 时构造 `Hazard`。保留 `mapNASACategoryToType` 与 `detectHazardTypeFromTitle` 的既有导出和输出。GDACS 不得用 `Date.now()` 为外部缺失 `eventid` 生成不稳定 id，缺少 id 的单条记录应跳过。

```ts
export function adaptUSGSResponse(value: unknown): Hazard[] {
  const root = asRecord(value);
  if (!root) return [];
  return asRecordArray(root.features).flatMap((feature, index) =>
    parseUSGSFeature(feature, `features.${index}`),
  );
}
```

- [x] **Step 5: 接入 BFF service 并运行 GREEN**

将 `fetchHazardFeed` 改为 `return parseHazardFeed(await requestJson(url, { signal }))`；不改变查询构造和信号传递。运行：`pnpm exec vitest run tests/service-adapters.test.ts tests/service-hazard-feed.test.ts && pnpm run typecheck:client`。

预期：公开源 adapter、BFF service 和类型检查全部通过。

### Task 3: 解析 DisasterAware 类型与活动灾害响应

**Files:**

- Create: `src/services/hazards/contracts/disasterAware.ts`
- Modify: `src/services/hazards/hazardService.ts`
- Create: `tests/service-disaster-aware.test.ts`

**Interfaces:**

```ts
export function parseHazardTypes(value: unknown): HazardType[];
export function parseActiveHazards(value: unknown): ActiveHazard[];
```

- [x] **Step 1: 写 DisasterAware 失败与兼容测试**

新增 `tests/service-disaster-aware.test.ts`，mock `getAccessToken`、`authorize` 和 `authFetch`。有效类型返回 `[{ type_id: "FLOOD", type_name: "Flood" }]`；`type_icon` 缺失允许。活动灾害使用完整 `ActiveHazard` fixture，验证 `latitude: 0`、`longitude: 0` 和 `update_User: null` 均保留。类型数组非数组、活动项的 `app_ID` 字符串化、非有限经纬度、缺少 `roles` 数组都应降级为 `[]`，并验证 `fetchActiveHazards("FLOOD/../")` 仍调用 `%2F` 编码后的 URL。

```ts
await expect(fetchHazardsActive("FLOOD/../")).resolves.toEqual([]);
expect(authFetchMock).toHaveBeenCalledWith("/api/hazards/active/category/FLOOD%2F..%2F");
```

- [x] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-disaster-aware.test.ts`

预期：契约模块尚不存在；当前 `response.json() as T` 会接受错误结构。

- [x] **Step 3: 实现 DisasterAware 契约**

`parseHazardTypes` 对每条记录验证 `type_id` 和 `type_name` 为字符串，`type_icon` 可选字符串。`parseActiveHazards` 对每条记录验证全部现有 `ActiveHazard` 必填字段：`app_ID`、`hazard_ID`、`org_ID` 为有限数字；`latitude` 与 `longitude` 为有限数字；`update_User` 与 `areabrief_url` 是字符串或 `null`；`roles` 是数组；其余声明字段为字符串。顶层不为数组或任一记录不符合时抛出 `HazardContractError`。

```ts
const activeHazardStringKeys = [
  "app_IDs",
  "autoexpire",
  "category_ID",
  "charter_Uri",
  "comment_Text",
  "create_Date",
  "creator",
  "end_Date",
  "glide_Uri",
  "hazard_Name",
  "last_Update",
  "master_Incident_ID",
  "message_ID",
  "severity_ID",
  "snc_url",
  "start_Date",
  "status",
  "type_ID",
  "update_Date",
  "product_total",
  "uuid",
  "in_Dashboard",
  "description",
] as const;
```

- [x] **Step 4: 接入 Service 并保留降级语义**

删除 `responseJson<T>` 的泛型断言。新增 `readDisasterAwareJson(response)`：缺少 response 或 `!response.ok` 抛固定 `ServiceError("DisasterAware API request failed", "http", { status: response?.status })`；否则 `response.json()` 保存为 `unknown` 并传入明确解析器。`fetchHazardTypes`、`fetchHazardsActive`、`fetchActiveHazardsByCategory` 分别调用对应解析器，保留其 `try/catch`、固定日志事件和空数组返回。

```ts
return parseActiveHazards(await readDisasterAwareJson(await authFetch(path)));
```

- [x] **Step 5: 运行 GREEN 与既有回归测试**

运行：`pnpm exec vitest run tests/service-disaster-aware.test.ts tests/service-hazard-feed.test.ts tests/service-adapters.test.ts && pnpm run typecheck:client`

预期：DisasterAware 结构错误不离开 Service 层，现有 Hazard feed 和 adapter 回归通过。

### Task 4: 文档状态、全量验证与整体复核

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/superpowers/specs/2026-09-11-hazard-http-boundary-types-design.md`
- Modify: `docs/superpowers/plans/2026-09-11-hazard-http-boundary-types.md`

**Interfaces:**

- 不新增运行时接口；优化清单将“Hazard/HTTP”前端边界范围标记为已完成，跨语言契约同步保持后续项。

- [x] **Step 1: 更新完成状态与实际测试证据**

在优化清单的当前判断、优先级矩阵和已完成优化项中，把本批实现明确为“Hazard/HTTP 前端边界已完成”；保留“跨语言模型同步与 Python 契约测试统一门禁”待治理。设计稿状态改为“已实施并通过验证”，实施计划复选框与执行记录仅在实际完成后更新。

- [x] **Step 2: 执行项目质量门禁**

依次运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:contracts
pnpm run typecheck:server
pnpm run test:services
pnpm run test:component
pnpm run build
git diff --check
```

预期：所有命令退出码为 0。另运行 `pnpm test`；若仍因沙箱禁止监听 `0.0.0.0` 导致 BFF 测试出现 `EPERM`，记录该环境限制与已通过的非监听测试，不能宣称全量测试通过。

- [x] **Step 3: 最终整体复核**

检查所有 `requestJson` 调用点均处理 `unknown`，所有 Hazard Service 成功响应都经过解析器；检查 diff 不含凭据、响应正文、构建产物或 `.superpowers/sdd/progress.md`。复核失败时定位根因并修复后仅重跑受影响命令，再执行 `git diff --check`。

## 执行记录（2026-09-11）

- 已复核全部 `requestJson` 调用点：授权端点本地解析授权响应；Hazard feed、USGS、NASA EONET 与 GDACS 分别进入对应解析器。DisasterAware 的成功 `Response.json()` 先保存为 `unknown`，再由类型或活动灾害解析器处理。
- `pnpm exec vitest run tests/service-disaster-aware.test.ts` 通过（1 个文件、15 项测试）。Task 3 复核建议的顶层非数组 service 降级已有等价覆盖：类型端点收到对象根响应时，`fetchHazardTypes()` 返回空数组并记录固定日志事件。
- 质量门禁中 lint、格式检查、三个类型检查、Service 测试（14 个文件、167 项）、组件测试（12 个文件、51 项）和构建通过；命令显示 Node engine warning（当前 `v24.16.0`，项目声明范围为 `>=20.19 <21`）。`pnpm test` 因沙箱禁止 BFF 监听 `0.0.0.0` 失败，74 个 BFF 测试中 40 项通过、34 项均报 `EPERM`。
- `git diff --check` 通过；未发现本批产品差异中的凭据、响应正文、构建产物或 `.superpowers/sdd/progress.md` 变更。
