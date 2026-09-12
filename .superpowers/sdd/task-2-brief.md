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

- [ ] **Step 1: 写 BFF 与公开源失败测试**

在 `tests/service-hazard-feed.test.ts` 保留现有有效 BFF fixture，新增 `hazards` 不是数组、`meta.primary` 不在 `disasteraware | usgs | nasa-eonet | gdacs`、`meta.sources.0.count` 为负数以及 hazard 缺少 `geometry.coordinates` 的断言，全部要求抛出 `{ code: "invalid_response" }` 且错误文本不含 fixture 数据。在 `tests/service-adapters.test.ts` 增加 USGS、NASA、GDACS 的顶层非对象返回 `[]`，以及每个来源包含一条有效和一条缺少 id/geometry/有限坐标的记录时只返回有效记录。

```ts
expect(() => parseHazardFeed({ hazards: [], meta: { primary: "other" } })).toThrowError(
  expect.objectContaining({ code: "invalid_response", path: "meta.primary" }),
);
expect(adaptUSGSResponse({ features: [validFeature, { id: "bad" }] })).toHaveLength(1);
```

- [ ] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-adapters.test.ts tests/service-hazard-feed.test.ts`

预期：解析器导入尚不存在，且现有 `fetchHazardFeed` 会直接返回损坏 BFF JSON，因此新断言失败。

- [ ] **Step 3: 实现共享守卫与 BFF 契约**

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

- [ ] **Step 4: 在现有适配器实现公开源逐条契约**

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

- [ ] **Step 5: 接入 BFF service 并运行 GREEN**

将 `fetchHazardFeed` 改为 `return parseHazardFeed(await requestJson(url, { signal }))`；不改变查询构造和信号传递。运行：`pnpm exec vitest run tests/service-adapters.test.ts tests/service-hazard-feed.test.ts && pnpm run typecheck:client`。

预期：公开源 adapter、BFF service 和类型检查全部通过。
