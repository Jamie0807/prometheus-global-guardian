# 分析页面拆分实施计划

> **供智能体执行：** 必须使用 `subagent-driven-development` 或 `executing-plans` 逐项实施，并采用测试先行。步骤使用复选框跟踪。

**目标：** 将 3176 行分析页面拆成 feature-first 模块，同时保持五个 Tab、分析请求、缓存重试和视觉交互不变。

**架构：** 页面组合、远程数据状态、纯转换和 Tab 展示分层。现有 Analytics Service、ChartsPanel 和 DataQualityMonitor 继续作为稳定依赖，不重写业务协议。

**技术栈：** React 19、TypeScript 5、Vite、Vitest、Testing Library、Recharts。

## 全局约束

- 计划、进度和说明使用中文。
- 只做结构拆分，不改变现有业务行为和视觉样式。
- 不新增生产依赖，不修改 Analytics API 或 Python 服务。
- 所有 Analytics 请求仍通过 `src/services/analytics/analyticsService.ts`。
- 新增生产代码前必须先编写并运行失败测试。
- 子智能体不得执行 `git add`、`git commit` 或修改 Git 历史。
- 最终必须执行项目完整质量门禁。

---

### 任务 1：建立分析类型与纯转换边界

**文件：**

- 新建：`src/features/analytics/types.ts`
- 新建：`src/features/analytics/styles.ts`
- 新建：`src/features/analytics/utils/analyticsTransforms.ts`
- 新建：`tests/component/analytics-transforms.test.tsx`
- 修改：`src/components/AnalyticsPage.tsx`

**接口：**

- 输出 `AnalyticsPageProps`、`AnalyticsRecord`、`PivotTrendRecord`、`PivotRiskRecord`、`PredictionSummary`、`RiskRecommendation`、`ServiceStatus` 和 `AnalyticsTab`。
- 输出 `buildHazardsByType`、`buildIntensitySeries` 和 `buildAnalyticsDataHash`。
- 转换输入统一使用 `AnalyticsHazard[]`，其中 `AnalyticsHazard` 保持页面当前对 `Hazard` 扩展字段的兼容。

- [x] 新增转换测试，覆盖空数组、顶层类型、properties 类型、“未分类”、无效强度过滤、原始编号和数据哈希。
- [x] 运行 `pnpm exec vitest run tests/component/analytics-transforms.test.tsx --config vitest.component.config.ts`，确认因模块不存在而失败。
- [x] 提取类型、样式和三个纯函数，并让原页面改用新模块。
- [x] 再次运行定向测试，确认通过。
- [x] 运行 `pnpm run typecheck:client` 和 `pnpm run lint`。

### 任务 2：提取分析数据编排 Hook

**文件：**

- 新建：`src/features/analytics/hooks/useAnalyticsData.ts`
- 新建：`tests/component/use-analytics-data.test.tsx`
- 修改：`src/components/AnalyticsPage.tsx`

**接口：**

- `useAnalyticsData(hazards)` 返回服务状态、五类分析结果、`loading`、`checkServiceStatus`、`runAnalysis` 和 `resetAndRunAnalysis`。
- Hook 内保持主请求 `Promise.all`、4D 顺序调用、一次自动重试、数据哈希缓存和既有通知文案。

- [x] Mock Analytics Service 和通知模块，新增服务健康检查与分析结果测试。
- [x] 新增相同数据命中缓存、无数据提示和手动重新分析测试。
- [x] 运行 `pnpm exec vitest run tests/component/use-analytics-data.test.tsx --config vitest.component.config.ts`，确认因 Hook 不存在而失败。
- [x] 将服务状态与分析编排迁移到 Hook，页面改为消费 Hook 返回值。
- [x] 再次运行定向测试，确认通过。
- [x] 运行全部组件测试和客户端类型检查。

### 任务 3：拆分页面骨架和五个 Tab

**文件：**

- 新建：`src/features/analytics/AnalyticsPage.tsx`
- 新建：`src/features/analytics/components/AnalyticsHeader.tsx`
- 新建：`src/features/analytics/components/AnalyticsSummaryGrid.tsx`
- 新建：`src/features/analytics/components/AnalyticsControlPanel.tsx`
- 新建：`src/features/analytics/components/AnalyticsTabs.tsx`
- 新建：`src/features/analytics/components/PredictionStatusBadge.tsx`
- 新建：`src/features/analytics/components/tabs/AnalyticsChartsTab.tsx`
- 新建：`src/features/analytics/components/tabs/AnalyticsQualityTab.tsx`
- 新建：`src/features/analytics/components/tabs/OverviewTab.tsx`
- 新建：`src/features/analytics/components/tabs/PredictionsTab.tsx`
- 新建：`src/features/analytics/components/tabs/RiskTab.tsx`
- 修改：`src/components/AnalyticsPage.tsx`
- 新建：`tests/component/analytics-page.test.tsx`

**接口：**

- `AnalyticsPage` 只持有 `activeTab` 并组合 Header、Summary、Control、Tabs 和 Tab 内容。
- 各 Tab 只通过显式 Props 接收数据，不直接导入 Service。
- 兼容入口默认重新导出 `src/features/analytics/AnalyticsPage.tsx`。

- [x] 新增页面组合测试，验证兼容入口、结果就绪后的五个 Tab 以及 Tab 切换。
- [x] 运行页面测试，确认拆分模块尚不存在时失败。
- [x] 逐段迁移页头、摘要、控制区域、Tab 导航和 Tab 内容，不改 JSX 文案或样式值。
- [x] 确认 feature 页面不超过 300 行，兼容入口仅保留重新导出。
- [x] 运行页面测试、全部组件测试和客户端类型检查。

### 任务 4：更新文档并执行完整验收

**文件：**

- 修改：`README.md`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`

- [x] 在 README 项目结构中加入 `src/features/analytics/` 及其职责。
- [x] 将“P0：分析页面拆分”更新为已完成，记录实际目录、测试和验收结果。
- [x] 运行 `pnpm run lint`。
- [x] 运行 `pnpm run format:check`。
- [x] 运行 `pnpm test`。
- [x] 运行 `pnpm run test:component`。
- [x] 运行 `pnpm run test:e2e`。
- [x] 运行 `pnpm run typecheck:client` 和 `pnpm run typecheck:server`。
- [x] 运行 `pnpm run build` 和 `git diff --check`。
- [x] 检查 `git status --short`，确认没有缓存、构建产物或无关文件进入改动。
