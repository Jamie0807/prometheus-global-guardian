# 地图自动刷新与请求竞态保护实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让地图灾害数据在 5 分钟自动刷新、页面可见性变化和并发手动刷新时保持单一、可取消且不会被旧结果覆盖的请求生命周期。

**Architecture:** 将网络请求、序号保护、worker 结果保护和刷新定时器统一收敛到 `useHazardData`。服务层只接受并转发可选 `AbortSignal`；MapView 保持组合职责，继续把手动刷新函数暴露给 StatusPanel。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、React Testing Library。

## 全局约束

- 刷新间隔固定使用 `config.ui.refreshInterval`，当前值为 300000 毫秒。
- 只影响地图灾害数据请求，不改 AI、Analytics 或 BFF 的生命周期。
- 同筛选条件请求必须复用同一个 Promise；筛选变化、卸载和隐藏期间的自动请求必须可取消。
- 仅最新、仍挂载的请求可更新 React 状态或调用 `onDataUpdate`。
- 不执行 Git 提交，除非用户再次明确要求。

---

### Task 1: 让灾害请求支持调用方取消

**Files:**

- Modify: `src/services/hazards/hazardService.ts:24-29`
- Modify: `src/services/http/httpClient.ts:37-86`
- Modify: `tests/service-hazard-feed.test.ts:35-48`
- Modify: `tests/service-http.test.ts:63-83`

**Interfaces:**

- Consumes: `requestJson<T>(url, init?, options?)` 的内部超时控制器。
- Produces: `fetchHazardFeed(filter?: string, signal?: AbortSignal): Promise<HazardFeedResponse>`。

- [ ] **Step 1: 写入失败的 service 测试**

在 `tests/service-http.test.ts` 添加一个 pending fetch 测试：调用方 controller abort 后，fetch 收到的 signal 变为 `aborted`，`requestText` 保持抛出 `AbortError`，并且 fetch 只调用一次。再在 `tests/service-hazard-feed.test.ts` 验证第二个 `signal` 参数被作为 request init 传入服务层：

```ts
const controller = new AbortController();
const request = requestText("/api/test", { signal: controller.signal }, { retries: 2 });
controller.abort();
await expect(request).rejects.toMatchObject({ name: "AbortError" });
expect(fetchMock).toHaveBeenCalledTimes(1);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm run test:services -- tests/service-hazard-feed.test.ts`

Expected: 失败，原因是 HTTP 客户端尚未监听调用方 signal，或中止被转换为 timeout。

- [ ] **Step 3: 以最小改动实现 signal 转发**

在 HTTP 客户端为每个请求保留超时 controller，并为调用方 signal 注册一次性 listener，调用方取消时 abort 内部 controller。在 catch 中，如果调用方 signal 已中止则直接重新抛出原 `AbortError`，不创建 `ServiceError`，finally 中移除 listener。将服务函数签名改为：

```ts
export async function fetchHazardFeed(
  filter?: string,
  signal?: AbortSignal,
): Promise<HazardFeedResponse> {
  const params = new URLSearchParams();
  if (filter && filter !== "ALL") params.set("type", filter);
  const query = params.toString();
  return requestJson<HazardFeedResponse>(`/api/hazards${query ? `?${query}` : ""}`, { signal });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm run test:services -- tests/service-hazard-feed.test.ts`

Expected: `service-http` 与 `service-hazard-feed` 全部通过。

### Task 2: 为地图数据 Hook 加入请求控制和可见性刷新

**Files:**

- Modify: `src/features/map/hooks/useHazardData.ts:1-48`
- Test: `tests/component/map-view.test.tsx:113-227`

**Interfaces:**

- Consumes: `fetchHazardFeed(filter, signal)`、`config.ui.refreshInterval`、现有 hazard worker。
- Produces: 保持 `useHazardData` 的 `{ disasters, refresh, sourceMeta }` 返回接口，`refresh(): Promise<void>` 可由 MapView 手动调用。

- [ ] **Step 1: 写入失败的组件测试**

在 `tests/component/map-view.test.tsx` 使用 deferred Promise 和 fake timers 添加以下行为测试：

```ts
it("deduplicates matching manual refresh requests", async () => {
  const onRefreshReady = vi.fn();
  render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} onRefreshReady={onRefreshReady} />);
  await waitFor(() => expect(onRefreshReady).toHaveBeenCalled());
  const refresh = onRefreshReady.mock.calls.at(-1)?.[0] as () => void;
  refresh();
  refresh();
  expect(mapMocks.fetchHazardFeed).toHaveBeenCalledTimes(1);
});
```

再测试筛选从 `ALL` 变为 `FLOOD` 时第一个 signal 被中止，旧请求最后 resolve 也不调用 `onDataUpdate`；测试隐藏文档后不触发周期、恢复可见立刻触发一次刷新，并在卸载后中止当前 signal。

- [ ] **Step 2: 运行组件测试确认失败**

Run: `pnpm run test:component -- tests/component/map-view.test.tsx`

Expected: 至少一个新测试失败，体现重复请求、未中止或隐藏后仍触发刷新。

- [ ] **Step 3: 实现私有请求控制器**

在 `useHazardData` 增加 `AbortController`、进行中请求、请求筛选条件、递增序号、挂载标志和 interval 引用。按以下骨架实现：

```ts
const startRefresh = useCallback(async () => {
  if (inFlightRef.current?.filter === filter) return inFlightRef.current.promise;
  inFlightRef.current?.controller.abort();
  const controller = new AbortController();
  const requestId = ++requestIdRef.current;
  const promise = fetchHazardFeed(filter, controller.signal).then(async (response) => {
    if (!isCurrent(requestId)) return;
    const cleaned = await cleanHazards(response.hazards, requestId);
    if (!isCurrent(requestId)) return;
    setSourceMeta(response.meta);
    setDisasters(cleaned);
    onDataUpdate(cleaned);
  });
  inFlightRef.current = { filter, controller, promise };
  return promise.finally(() => clearMatchingInFlight(promise));
}, [filter, onDataUpdate]);
```

保留现有空数据语义：成功空响应更新 `sourceMeta` 和 `disasters` 为空数组；`AbortError` 不清空已有状态，其他失败沿用当前不更新状态的行为。

- [ ] **Step 4: 实现定时器与可见性监听**

在 Hook effect 中：组件挂载并且页面可见时创建 interval；`visibilitychange` 到 hidden 时清除 interval 并仅中止自动刷新；回到 visible 时调用 `refresh()`，在其完成后重新创建 interval。effect cleanup 清除 interval、移除监听、递增序号、终止 controller、terminate worker。

- [ ] **Step 5: 运行组件测试确认通过**

Run: `pnpm run test:component -- tests/component/map-view.test.tsx`

Expected: MapView 组件测试全部通过，涵盖初始加载、去重、取消、过期响应和可见性周期。

### Task 3: 收尾文档与全量验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md:389-393`
- Verify: `tests/service-hazard-feed.test.ts`
- Verify: `tests/component/map-view.test.tsx`

**Interfaces:**

- Consumes: 前两项的 `fetchHazardFeed` signal 接口和 `useHazardData` 生命周期。
- Produces: 待优化清单记录该 P1 已完成及自动刷新范围。

- [ ] **Step 1: 更新优化清单**

从剩余优化矩阵移除“实现自动刷新与请求竞态保护”，加入已完成项目，并在该 P1 段落记录 5 分钟周期、隐藏暂停、恢复刷新、取消、去重和旧结果丢弃；保留 AI 与 Analytics 为后续独立范围。

- [ ] **Step 2: 检查文档格式与差异**

Run: `pnpm exec prettier --check docs/PROJECT_OPTIMIZATION_BACKLOG.md docs/superpowers/specs/2026-09-09-map-refresh-race-protection-design.md docs/superpowers/plans/2026-09-09-map-refresh-race-protection.md && git diff --check`

Expected: 两个命令均返回 0。

- [ ] **Step 3: 运行全量 Node 基线**

Run: `pnpm run test:baseline`

Expected: lint、格式、客户端与服务端类型检查、BFF/Service/组件/E2E 测试和构建全部返回 0。

- [ ] **Step 4: 运行 Python 回归测试**

Run: `docker compose run --rm analytics python -m unittest discover -s tests -p 'test_*.py'`

Expected: Python unittest 全部通过。

## 计划自检

- 规格覆盖：Task 1 覆盖 signal 传递；Task 2 覆盖去重、取消、序号、Worker、隐藏与恢复；Task 3 覆盖待办与完整验证。
- 占位符检查：无 TBD、TODO 或未定义的后续实现描述。
- 类型一致性：`fetchHazardFeed(filter, signal)` 由 Task 1 产生并被 Task 2 消费；`useHazardData` 对外接口保持不变。
