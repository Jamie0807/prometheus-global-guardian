# 分析页面拆分设计规格

## 背景

`src/components/AnalyticsPage.tsx` 当前约 3176 行，同时承担页面布局、Python 分析服务编排、缓存与重试、Tab 状态、数据转换以及大量结果展示。虽然 Analytics API 已统一到 `src/services/analytics/`，页面内部仍缺少清晰的状态、转换和展示边界。

## 目标

- 将分析功能迁移到 `src/features/analytics/`，采用与地图模块一致的 feature-first 结构。
- 将 `AnalyticsPage.tsx` 缩减为不超过 300 行的页面组合入口。
- 将服务调用、缓存、重试和自动分析收口到专用 Hook。
- 将灾害类型统计、强度序列和数据哈希等转换提取为可单测的纯函数。
- 将统计概览、图表、预测、风险和数据质量五个 Tab 拆为显式组件。
- 保持现有视觉、文案、请求顺序、缓存、重试和交互行为不变。

## 非目标

- 不修改 Analytics API 契约或 Python 服务实现。
- 不重写自动刷新、卸载清理、竞态控制或重试策略；相关生命周期治理继续作为独立待办。
- 不引入 Context、状态机或新的状态管理依赖。
- 不进行国际化、视觉改版或业务文案调整。
- 不继续拆分已经独立的 `ChartsPanel`、`ChartDrilldownModal` 和 `DataQualityMonitor`。

## 目录设计

```text
src/features/analytics/
├── AnalyticsPage.tsx
├── styles.ts
├── types.ts
├── components/
│   ├── AnalyticsControlPanel.tsx
│   ├── AnalyticsHeader.tsx
│   ├── AnalyticsSummaryGrid.tsx
│   ├── AnalyticsTabs.tsx
│   ├── PredictionStatusBadge.tsx
│   └── tabs/
│       ├── AnalyticsChartsTab.tsx
│       ├── AnalyticsQualityTab.tsx
│       ├── OverviewTab.tsx
│       ├── PredictionsTab.tsx
│       └── RiskTab.tsx
├── hooks/
│   └── useAnalyticsData.ts
└── utils/
    └── analyticsTransforms.ts
```

为保持既有引用兼容，`src/components/AnalyticsPage.tsx` 保留为薄转发入口，仅重新导出 feature 页面。现有 `ChartsPanel` 和 `DataQualityMonitor` 继续复用。

## 组件边界

- `AnalyticsPage`：组合页头、摘要、分布、控制面板、Tab 导航和当前 Tab；只保留 `activeTab` 这一项页面展示状态。
- `AnalyticsHeader`：展示服务状态和关闭操作。
- `AnalyticsSummaryGrid`：展示四个摘要指标和灾害类型分布。
- `AnalyticsControlPanel`：展示离线、加载、完成状态以及重连和重新分析操作。
- `AnalyticsTabs`：根据已有分析结果决定 Tab 可见性，并输出用户选择。
- `OverviewTab`、`PredictionsTab`、`RiskTab`：接收显式数据 Props，只负责展示。
- `AnalyticsChartsTab`、`AnalyticsQualityTab`：分别包装现有图表与数据质量组件，保持页面边界一致。
- `PredictionStatusBadge`：复用预测状态展示语义。

## 状态与数据流

`useAnalyticsData(hazards)` 负责以下状态：

- Python 服务状态。
- 统计、预测、风险、4D 趋势和 4D 风险结果。
- 加载状态、重试次数、是否已分析和最近数据哈希。

Hook 暴露 `checkServiceStatus()`、`runAnalysis()` 和 `resetAndRunAnalysis()`。首次挂载检查健康状态；服务在线且存在灾害数据时自动分析。主统计、预测和风险请求继续使用 `Promise.all`，随后按现有顺序执行 4D 透视、趋势和风险评分。缓存命中、一次自动重试和重新分析按钮的既有行为保持不变。

## 纯转换

`analyticsTransforms.ts` 提供：

- `buildHazardsByType(hazards)`：优先读取顶层 `type`，其次读取 `properties.type`，缺失时归为“未分类”。
- `buildIntensitySeries(hazards)`：过滤无有效强度的数据，并保留原始数据编号。
- `buildAnalyticsDataHash(hazards)`：保持现有 `数量_首条ID_末条ID` 规则。

纯转换不得触发请求、通知或 React 状态更新。

## 测试策略

- 为三项纯转换新增单元测试，覆盖空数组、类型回退、无效强度过滤和哈希规则。
- 为 Hook 新增组件测试，Mock Service 与通知边界，验证服务检查、主请求并行结果、4D 后续结果、缓存和手动重跑。
- 为页面组合新增组件测试，验证五个 Tab 的可见性与切换，并确保现有 `AnalyticsPage` 导入路径仍可用。
- 运行项目完整质量门禁，包括 ESLint、Prettier、前后端类型检查、单元测试、组件测试、E2E 和构建。

## 验收标准

- `src/features/analytics/AnalyticsPage.tsx` 不超过 300 行。
- 原 `src/components/AnalyticsPage.tsx` 仅作为兼容转发入口。
- 本次迁移的主统计、预测、风险和 4D 分析链路只由 `useAnalyticsData.ts` 调用 `analyticsService`；复用的 `ChartsPanel` 和 `DataQualityMonitor` 保持其既有独立请求边界。
- 三项纯转换都有自动化测试。
- 五个现有 Tab、请求顺序、缓存、重试、通知和页面视觉行为保持不变。
- README 项目结构与项目待优化清单同步更新。
- 不自动执行 Git 提交。
