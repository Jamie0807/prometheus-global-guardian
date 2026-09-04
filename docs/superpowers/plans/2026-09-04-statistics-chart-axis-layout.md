# 统计概览图表坐标与数据一致性实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复统计概览折线图的 X 轴标签裁剪，并确保图形只使用真实灾害强度数据。

**Architecture:** 在 `src/utils` 中提取 X 轴标签抽样和灾害强度读取函数。图表根据数据量生成最多 8 个首尾均匀分布的标签索引；统计概览优先读取标准 `magnitude`，缺失强度的记录不再使用随机值，并展示有效数据量。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、Prettier、ESLint。

## Global Constraints

- 折线只使用真实的数值强度，不用随机数填充缺失值。
- 缺失强度的记录从强度图中排除，但 X 轴编号保留原始灾害记录编号。
- 数据量不超过 8 条时显示全部 X 轴标签。
- 数据量超过 8 条时最多显示 8 个标签，并保留首尾标签。
- 首个和末个标签不能因居中定位和溢出裁剪而显示不完整。
- 本次修改不自动执行 Git commit。

---

### Task 1: 提取并测试 X 轴标签抽样规则

**Files:**

- Create: `src/utils/chartLabels.ts`
- Modify: `src/components/DataVisualization.tsx`
- Create: `tests/component/data-visualization.test.tsx`

**Interfaces:**

- Produces: `getXAxisLabelIndexes(totalPoints: number, maxLabels?: number): number[]`。

- [x] **Step 1: Write the failing test**

测试大数据量最多返回 8 个索引且保留首尾，小数据量返回全部索引。

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/data-visualization.test.tsx`

Expected: FAIL because `getXAxisLabelIndexes` has not been exported yet。

- [x] **Step 3: Implement the minimal pure function**

使用首尾均匀插值计算索引，并通过去重保证索引稳定、升序且不越界。

- [x] **Step 4: Run the focused test and verify it passes**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/data-visualization.test.tsx`

Expected: PASS。

### Task 2: 将抽样规则接入折线图布局

**Files:**

- Modify: `src/components/DataVisualization.tsx`
- Test: `tests/component/data-visualization.test.tsx`

**Interfaces:**

- Consumes: `getXAxisLabelIndexes`。
- Produces: 大数据量折线图只渲染抽样后的 X 轴标签，标签容器固定高度并隐藏溢出内容。

- [x] **Step 1: Add the rendering assertion**

渲染 846 个点的 `LineChart`，断言 X 轴只出现 8 个 `#数字` 标签；渲染 4 个点时断言 4 个标签全部出现。

- [x] **Step 2: Run the focused test and verify the rendering assertion fails**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/data-visualization.test.tsx`

Expected: FAIL because the existing threshold logic renders more than 8 labels for 846 个点。

- [x] **Step 3: Replace the threshold branches with the shared indexes**

让 JSX 使用 `getXAxisLabelIndexes(points.length)`，并为标签区域增加稳定高度和 `overflow: hidden`。

- [x] **Step 4: Run component tests**

Run: `pnpm run test:component`

Expected: all component tests PASS。

### Task 3: 对齐真实灾害强度数据

**Files:**

- Create: `src/utils/hazardMetrics.ts`
- Modify: `src/components/AnalyticsPage.tsx`
- Create: `tests/service-hazard-metrics.test.ts`

**Interfaces:**

- Produces: `getHazardIntensity(hazard): number | null`，按 `magnitude`、兼容字段顺序读取数值强度。
- Produces: 统计概览的有效强度数据序列和 `有效强度数据：有效数 / 总数` 提示。

- [x] **Step 1: Write failing tests**

覆盖标准 `magnitude` 优先级、零值保留、兼容字段和无强度时返回 `null`。

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run tests/service-hazard-metrics.test.ts`

Expected: FAIL because `getHazardIntensity` has not been implemented。

- [x] **Step 3: Implement the numeric intensity reader**

读取真实数值字段，跳过空字符串、非数字和严重程度文字，不生成随机值。

- [x] **Step 4: Connect the reader to `AnalyticsPage`**

使用 `useMemo` 构建有效强度序列，保留原始记录编号，并渲染有效数据量提示。

- [x] **Step 5: Run the focused test and client typecheck**

Run: `pnpm exec vitest run tests/service-hazard-metrics.test.ts`, `pnpm run typecheck:client`

Expected: PASS。

### Task 4: Run project quality checks

**Files:**

- Verify: `src/components/DataVisualization.tsx`
- Verify: `tests/component/data-visualization.test.tsx`

- [x] **Step 1: Run formatting and static checks**

Run: `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck:client`。

- [x] **Step 2: Check the diff for whitespace errors**

Run: `git diff --check`。

- [x] **Step 3: Confirm the working tree remains uncommitted**

Run: `git status --short` and report the changed files without creating a commit。
