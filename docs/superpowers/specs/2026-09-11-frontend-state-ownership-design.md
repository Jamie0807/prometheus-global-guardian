# 前端状态归属梳理设计方案

日期：2026-09-11
状态：设计已确认，待实施。
需求级别：正式规格。

## 1. 目标

将当前集中在 `App.tsx`、并经由 `MapView` 回传的状态按领域重新归属，消除灾害数据、筛选、地图样式、刷新入口和弹窗开关的跨层 Props 转发。继续使用 React Context 与领域 Hook，不引入 Redux、Zustand 或其他外部状态库。

改造完成后，`App` 只负责应用组合、授权初始化和懒加载边界；地图业务状态与 UI 导航状态各自拥有唯一写入点。

## 2. 现状与范围

当前 `App` 同时保存 `disasters`、`filter`、`selectedStyle`、刷新回调、Analytics 页面状态及三个弹窗状态。`MapView` 自己通过 `useHazardData` 获取灾害数据，却又以 `onDataUpdate` 和 `onRefreshReady` 回传给 `App`，导致地图状态存在双向数据流。

本批覆盖：

- 灾害数据、数据源元信息、筛选条件、地图样式和刷新动作。
- 地图/Analytics 页面切换，以及保存报告、设置、AI 助手的打开状态。
- Header、MapView、StatusPanel、Analytics、保存报告、设置和 AI 助手的 Props 收敛。
- 相关组件和 Provider 的行为测试。

本批不覆盖：

- 地图实例、Marker、热力图、LOD、3D overlay 等 Mapbox 生命周期状态。
- Analytics 请求结果、AI 会话、通知、表单输入、图表 hover 或组件内部短暂状态。
- 报告下载格式、外部状态库、持久化、路由系统或 UI 视觉改版。

## 3. 方案

### 3.1 地图状态域

新增 `MapStateProvider`，由地图领域拥有以下公开状态与动作：

```ts
type MapState = {
  hazards: Hazard[];
  filter: string;
  mapStyle: string;
  sourceMeta: HazardFeedResponse["meta"] | null;
  setFilter(filter: string): void;
  setMapStyle(style: string): void;
  refresh(): Promise<void>;
};
```

Provider 复用并承接 `useHazardData` 的请求取消、同筛选去重、自动刷新、Worker 清洗与来源元信息逻辑。`MapView` 只消费已验证的地图领域状态，并继续保留 Mapbox 实例与图层 Hook；`StatusPanel` 直接读取筛选、总数和刷新动作；Analytics、AI 助手与报告弹窗直接读取同一份 `hazards`。

筛选变化仍取消旧请求，并由既有自动刷新路径加载新数据。Provider 不复制 `hazards` 到 `App`，也不暴露 Worker、AbortController 或 Mapbox 实例。

### 3.2 UI 导航与弹窗状态域

新增 `UIStateProvider`，使用判别式状态而不是多个可同时为真的布尔值：

```ts
type ActiveView = "map" | "analytics";
type ActiveModal = "save-report" | "settings" | "ai" | null;
```

Provider 提供 `openView`、`openModal`、`closeModal` 与 `closeView`。Header 只调用这些语义动作；Analytics 的关闭返回地图页；弹窗分别在提交、关闭按钮或既有 Escape 规则下关闭。为保持现有行为，Escape 只关闭保存报告和设置弹窗，不改变 AI 助手的关闭规则。

### 3.3 应用组合与 Props 收敛

`App` 的结构为：授权初始化 → `UIStateProvider` → `MapStateProvider` → Header / 主视图 / 弹窗。它不再保存灾害数据、筛选、地图样式、刷新 ref 或弹窗布尔值。

```text
App
├─ UIStateProvider
│  └─ MapStateProvider
│     ├─ Header (UI actions)
│     ├─ MapView / AnalyticsPage (领域状态)
│     ├─ StatusPanel (地图状态)
│     └─ SaveReportModal / SettingsModal / AIChatAssistant
```

现有组件只保留其领域必需 Props：局部表单、图表和会话状态继续在组件或专属 Hook 中维护。旧的 `onDataUpdate`、`onRefreshReady`、`filter`、`mapStyle` 等跨层 Props 在消费者完成迁移后删除。

## 4. 错误与兼容性

- 地图请求失败、取消、陈旧数据和来源状态继续沿用 `useHazardData` 的既有语义；Provider 不吞掉或重新解释错误。
- Context 只能在对应 Provider 内使用；缺失 Provider 时抛出明确的开发错误，防止静默回退到空数据。
- 组件对外展示、懒加载边界、授权失败降级与通知语义保持不变。
- 不引入新的网络请求、浏览器存储、运行时依赖或服务端接口。

## 5. 测试与验收

- 为 Provider 提供消费 Hook 的缺失 Provider 保护与状态动作测试。
- 更新 MapView 与 StatusPanel 测试，验证筛选和手动刷新仍进入地图数据域。
- 增加应用组合测试：Header 可打开 Analytics 和三个弹窗，关闭操作回到原有视图；Analytics、AI 和报告读取同一份地图灾害数据。
- 保留既有地图请求取消、自动刷新、Worker 清洗、Analytics、AI 和报告组件回归测试。
- 完成后运行 lint、格式、Service/组件测试、三项类型检查、Python 测试、构建和 `git diff --check`；当前沙箱中的 BFF `listen EPERM` 单独如实记录。
