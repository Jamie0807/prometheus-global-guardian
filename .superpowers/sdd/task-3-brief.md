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

- [ ] **Step 1: 写 DisasterAware 失败与兼容测试**

新增 `tests/service-disaster-aware.test.ts`，mock `getAccessToken`、`authorize` 和 `authFetch`。有效类型返回 `[{ type_id: "FLOOD", type_name: "Flood" }]`；`type_icon` 缺失允许。活动灾害使用完整 `ActiveHazard` fixture，验证 `latitude: 0`、`longitude: 0` 和 `update_User: null` 均保留。类型数组非数组、活动项的 `app_ID` 字符串化、非有限经纬度、缺少 `roles` 数组都应降级为 `[]`，并验证 `fetchActiveHazards("FLOOD/../")` 仍调用 `%2F` 编码后的 URL。

```ts
await expect(fetchHazardsActive("FLOOD/../")).resolves.toEqual([]);
expect(authFetchMock).toHaveBeenCalledWith("/api/hazards/active/category/FLOOD%2F..%2F");
```

- [ ] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-disaster-aware.test.ts`

预期：契约模块尚不存在；当前 `response.json() as T` 会接受错误结构。

- [ ] **Step 3: 实现 DisasterAware 契约**

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

- [ ] **Step 4: 接入 Service 并保留降级语义**

删除 `responseJson<T>` 的泛型断言。新增 `readDisasterAwareJson(response)`：缺少 response 或 `!response.ok` 抛固定 `ServiceError("DisasterAware API request failed", "http", { status: response?.status })`；否则 `response.json()` 保存为 `unknown` 并传入明确解析器。`fetchHazardTypes`、`fetchHazardsActive`、`fetchActiveHazardsByCategory` 分别调用对应解析器，保留其 `try/catch`、固定日志事件和空数组返回。

```ts
return parseActiveHazards(await readDisasterAwareJson(await authFetch(path)));
```

- [ ] **Step 5: 运行 GREEN 与既有回归测试**

运行：`pnpm exec vitest run tests/service-disaster-aware.test.ts tests/service-hazard-feed.test.ts tests/service-adapters.test.ts && pnpm run typecheck:client`

预期：DisasterAware 结构错误不离开 Service 层，现有 Hazard feed 和 adapter 回归通过。
