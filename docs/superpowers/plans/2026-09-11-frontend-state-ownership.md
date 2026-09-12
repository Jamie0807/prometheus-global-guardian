# 前端状态归属梳理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 React Context 与领域 Hook 让地图状态和 UI 导航状态各自拥有唯一归属，消除 `App.tsx` 的数据中转和双向地图回调。

**Architecture:** `MapStateProvider` 承接灾害数据、筛选、地图样式、来源元信息与刷新生命周期；`UIStateProvider` 用页面与弹窗判别式状态管理应用导航。Mapbox、Analytics 请求、AI 会话与组件局部交互状态保留在既有专属 Hook 或组件中。

**Tech Stack:** React 19、TypeScript 5、Vitest、React Testing Library、现有 Mapbox Hook 与 Service 层。

## Global Constraints

- 不引入 Redux、Zustand、React Query 或其他运行时依赖。
- 不改变 BFF、FastAPI、外部数据源、报告格式、Mapbox 生命周期或视觉样式。
- `MapStateProvider` 只公开已验证的领域数据和语义动作，不公开 Worker、AbortController、Mapbox 实例或请求序号。
- `UIStateProvider` 使用 `"map" | "analytics"` 与 `"save-report" | "settings" | "ai" | null`；Escape 仅关闭保存报告和设置弹窗。
- Context 消费 Hook 在 Provider 缺失时抛出明确错误；不以空数据静默降级。
- 保留未提交的 `.superpowers/sdd` 过程记录；未经用户再次明确要求，不自动暂存或提交。

---

### Task 1: 建立地图状态域并迁移地图消费者

**Files:**

- Create: `src/features/map/state/MapStateContext.tsx`
- Create: `tests/component/map-state-context.test.tsx`
- Modify: `src/features/map/hooks/useHazardData.ts`
- Modify: `src/features/map/MapView.tsx`
- Modify: `src/components/StatusPanel.tsx`
- Modify: `src/types/index.ts`
- Modify: `tests/component/map-view.test.tsx`
- Modify: `tests/component/status-panel.test.tsx`

**Consumes:** `fetchHazardFeed`, `HazardFeedResponse`, `useHazardData` 的既有取消、自动刷新与 Worker 清洗语义。

**Produces:**

```ts
export type MapStateValue = {
  hazards: Hazard[];
  filter: string;
  mapStyle: string;
  sourceMeta: HazardFeedResponse["meta"] | null;
  setFilter(filter: string): void;
  setMapStyle(mapStyle: string): void;
  refresh(): Promise<void>;
};

export function MapStateProvider({ children }: PropsWithChildren): JSX.Element;
export function useMapState(): MapStateValue;
```

- [ ] **Step 1: 写地图 Context 的失败测试**

在 `tests/component/map-state-context.test.tsx` 创建一个消费 `useMapState()` 的探针组件。测试未包裹 Provider 时抛出 `useMapState must be used within MapStateProvider`；包裹 Provider 后点击按钮调用 `setFilter("FLOOD")`，断言探针渲染 `FLOOD`。Mock `useHazardData` 返回稳定的 `hazards`、`sourceMeta` 和 `refresh`。

```tsx
expect(() => render(<MapStateProbe />)).toThrow("useMapState must be used within MapStateProvider");
render(
  <MapStateProvider>
    <MapStateProbe />
  </MapStateProvider>,
);
await user.click(screen.getByRole("button", { name: "filter-flood" }));
expect(screen.getByText("FLOOD")).toBeInTheDocument();
```

- [ ] **Step 2: 运行失败测试确认 RED**

运行：`pnpm exec vitest run tests/component/map-state-context.test.tsx`

预期：失败，原因是 `MapStateContext` 尚不存在。

- [ ] **Step 3: 实现地图 Context 与数据 Hook 收口**

在 `MapStateContext.tsx` 持有 `filter` 初始值 `"ALL"`、`mapStyle` 初始值 `"dark-v11"`，调用 `useHazardData(filter)` 并用 `useMemo` 暴露完整 `MapStateValue`。消费 Hook 采用 `undefined` 默认 Context 并明确抛错。

```tsx
const MapStateContext = createContext<MapStateValue | undefined>(undefined);

export function useMapState(): MapStateValue {
  const value = useContext(MapStateContext);
  if (!value) throw new Error("useMapState must be used within MapStateProvider");
  return value;
}
```

将 `useHazardData(filter, onDataUpdate)` 改为 `useHazardData(filter)`，删除成功请求后的 `onDataUpdate(cleaned)`，保留取消、请求序号、Worker、自动刷新和 `sourceMeta` 更新。删除 `MapViewProps`；`MapView` 用 `useMapState()` 取得 `filter`、`mapStyle`、`hazards`、`sourceMeta`。`StatusPanel` 用同一 Hook 取得 `filter`、`setFilter`、`refresh` 与 `hazards.length`，删除四个输入 Props。

- [ ] **Step 4: 更新地图和状态面板测试**

为 MapView 测试增加 `renderMapView()`，统一以 `<MapStateProvider><MapView /></MapStateProvider>` 渲染；删除旧的 `filter`、`mapStyle`、`onDataUpdate` 与 `onRefreshReady` 参数断言。为 StatusPanel 测试 mock `useMapState`，验证 select 调用 `setFilter("FLOOD")`，刷新按钮调用 `refresh()`，总数读取 `hazards.length`。

```tsx
vi.mock("../../src/features/map/state/MapStateContext", () => ({
  useMapState: () => ({ hazards: [{ id: "hazard-1" }], filter: "ALL", setFilter, refresh }),
}));
await user.click(screen.getByRole("button", { name: "Refresh Data" }));
expect(refresh).toHaveBeenCalledOnce();
```

- [ ] **Step 5: 运行地图域 GREEN 验证**

运行：

```bash
pnpm exec vitest run tests/component/map-state-context.test.tsx tests/component/map-view.test.tsx tests/component/status-panel.test.tsx
pnpm run typecheck:client
```

预期：地图 Context、MapView 和 StatusPanel 测试通过；客户端类型检查无错误。

### Task 2: 建立 UI 导航与弹窗状态域

**Files:**

- Create: `src/state/UIStateContext.tsx`
- Create: `tests/component/ui-state-context.test.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/components/SaveReportModal.tsx`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `src/features/analytics/AnalyticsPage.tsx`
- Modify: `src/features/analytics/types.ts`
- Modify: `tests/component/ai-chat-assistant.test.tsx`
- Modify: `tests/component/analytics-page.test.tsx`

**Consumes:** Task 1 的 `useMapState()`；现有弹窗关闭、Analytics 返回地图和 AI 会话取消语义。

**Produces:**

```ts
export type ActiveView = "map" | "analytics";
export type ActiveModal = "save-report" | "settings" | "ai" | null;

export type UIStateValue = {
  activeView: ActiveView;
  activeModal: ActiveModal;
  openView(view: ActiveView): void;
  closeView(): void;
  openModal(modal: Exclude<ActiveModal, null>): void;
  closeModal(): void;
  closeEscapableModal(): void;
};
```

- [ ] **Step 1: 写 UI 状态的失败测试**

在 `tests/component/ui-state-context.test.tsx` 使用探针显示 `activeView` 与 `activeModal`。验证初始为 `map` / `null`，`openView("analytics")` 切换页面，`openModal("ai")` 打开 AI，`closeEscapableModal()` 不关闭 AI；重新打开 `settings` 后，该动作将其关闭。另验证 Provider 外消费抛 `useUIState must be used within UIStateProvider`。

```tsx
await user.click(screen.getByRole("button", { name: "open-ai" }));
await user.click(screen.getByRole("button", { name: "escape" }));
expect(screen.getByText("ai")).toBeInTheDocument();
```

- [ ] **Step 2: 运行失败测试确认 RED**

运行：`pnpm exec vitest run tests/component/ui-state-context.test.tsx`

预期：失败，原因是 `UIStateContext` 尚不存在。

- [ ] **Step 3: 实现 UI Context 与消费者迁移**

在 `UIStateContext.tsx` 使用两个 `useState` 保存 `activeView` 和 `activeModal`，动作使用 `useCallback`。`closeView()` 固定设为 `"map"`；`closeEscapableModal()` 只在当前值为 `"save-report"` 或 `"settings"` 时设为 `null`。

Header 删除四个回调 Props，直接调用 `useUIState().openView` 与 `openModal`。SettingsModal 使用 `useUIState` 的 `activeModal`、`closeModal` 和 Task 1 的 `mapStyle`、`setMapStyle`；SaveReportModal 使用 UI/地图状态，保留 JSON 下载，将原仅记录日志的 `onDownload` 改为组件内安全日志；AIChatAssistant 使用 UI 状态和地图 `hazards`，关闭时调用 `closeModal`，确保既有 `useAIChatSession` 仍接到关闭动作。AnalyticsPage 使用地图 `hazards` 和 `closeView`，删除 `AnalyticsPageProps`。

- [ ] **Step 4: 迁移现有组件测试**

为 Analytics 与 AI 测试新增 `renderWithAppState()`，使用 `UIStateProvider` 与 mock 的 `MapStateProvider` 依赖。原 AI 测试保持关闭时终止流与晚到 chunk 隔离断言；原 Analytics 测试保持传入的灾害数据会触发分析 Hook 的断言。添加 SettingsModal 测试，选择 `light-v11` 后验证 `setMapStyle("light-v11")` 被调用。

- [ ] **Step 5: 运行 UI 域 GREEN 验证**

运行：

```bash
pnpm exec vitest run tests/component/ui-state-context.test.tsx tests/component/ai-chat-assistant.test.tsx tests/component/analytics-page.test.tsx
pnpm run typecheck:client
```

预期：UI 判别状态、Analytics 和 AI 原有行为测试通过；客户端类型检查无错误。

### Task 3: 重组 App 并验证跨域消费

**Files:**

- Modify: `src/App.tsx`
- Create: `tests/component/app-state-ownership.test.tsx`
- Modify: `tests/component/map-view.test.tsx`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Consumes:** Task 1 的 `MapStateProvider` / `useMapState` 和 Task 2 的 `UIStateProvider` / `useUIState`。

**Produces:** `App` 只执行授权初始化、Provider 组合、懒加载与渲染选择，不维护业务数据、刷新 ref、地图样式或弹窗布尔值。

- [ ] **Step 1: 写应用状态归属失败测试**

在 `tests/component/app-state-ownership.test.tsx` mock MapView、AnalyticsPage、保存报告、设置和 AI 助手为可观察的轻量组件，并 mock `authorize` 成功。渲染 `App` 后依次点击 Header 的 Analytics、Save Report、Settings、AI 按钮，验证每次打开正确消费者；Analytics 关闭按钮返回 MapView。MapView mock 读取 `useMapState().hazards`，AI 与报告 mock 同样读取并显示数量，断言三处均为同一个初始数量。

```tsx
expect(screen.getByTestId("map-hazard-count")).toHaveTextContent("1");
await user.click(screen.getByRole("button", { name: "Open Analytics Dashboard" }));
expect(screen.getByTestId("analytics-hazard-count")).toHaveTextContent("1");
```

- [ ] **Step 2: 运行失败测试确认 RED**

运行：`pnpm exec vitest run tests/component/app-state-ownership.test.tsx`

预期：失败，原因是 App 尚未提供两个状态域，或消费者仍要求旧 Props。

- [ ] **Step 3: 最小化重组 App**

将授权 `useEffect` 留在 `App`。创建只供内部使用的 `AppContent`，它从两个 Context 读取 `activeView`、`activeModal`，渲染 Header、MapView 或 AnalyticsPage，以及三个弹窗；`App` 用 Provider 嵌套 `AppContent`。

```tsx
export default function App() {
  useAuthorization();
  return (
    <UIStateProvider>
      <MapStateProvider>
        <AppContent />
      </MapStateProvider>
    </UIStateProvider>
  );
}
```

删除 `App` 中的 `disasters`、`filter`、`selectedStyle`、`refreshDataRef`、四个可见性 state、数据更新回调和全局 Escape effect。Escape 监听由 `AppContent` 使用 `closeEscapableModal` 保留原有行为。不得改变 Header 文案、懒加载组件、ErrorBoundary 或授权失败时的日志行为。

- [ ] **Step 4: 更新优化清单并运行组件回归**

将 `docs/PROJECT_OPTIMIZATION_BACKLOG.md` 的“前端状态归属梳理”更新为阶段完成：地图与 UI 状态已按 Provider 归属；组件局部状态与跨实例持久化仍不在范围内。运行：

```bash
pnpm exec vitest run tests/component/app-state-ownership.test.tsx tests/component/map-view.test.tsx tests/component/status-panel.test.tsx tests/component/ai-chat-assistant.test.tsx tests/component/analytics-page.test.tsx
pnpm run test:component
```

预期：状态归属测试和全量组件测试通过。

### Task 4: 整体验证与复核

**Files:** 无新增或修改文件。

**Consumes:** Tasks 1–3 的实现和测试。

**Produces:** 完整验证记录；不自动提交。

- [ ] **Step 1: 执行全量质量门禁**

运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run test:services
pnpm run test:component
pnpm run typecheck:client
pnpm run typecheck:contracts
pnpm run typecheck:server
pnpm run test:python
pnpm run build
git diff --check
```

另运行 `pnpm test`。如果当前沙箱继续禁止绑定 `0.0.0.0`，记录 BFF `EPERM` 与已经通过的子集，不将其误称为产品回归。

- [ ] **Step 2: 最终代码复核**

逐项确认：`App.tsx` 未保留地图数据、筛选、样式、刷新 ref 或可见性布尔状态；状态 Context 没有泄露请求/Mapbox 实现细节；地图取消与自动刷新测试仍通过；Analytics、AI 和报告使用同一 `hazards`；未新增外部依赖或服务端改动。
