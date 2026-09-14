# 状态面板可用性与数据提示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新平台标题，令灾害筛选在离线或主源故障时仍可用，并移除首页数据源状态横幅。

**Architecture:** `DISPLAYED_TYPES` 作为状态面板和图例共享的展示类型单一来源。`MapView` 保持数据加载和 `sourceMeta` 接口不变，只停止渲染运行诊断信息；CSS 负责统计卡和刷新按钮的视觉对齐。

**Tech Stack:** React 19、TypeScript、Vitest、Testing Library、Playwright、Vite。

## Global Constraints

- 标题文本必须精确为“实时全球环境灾害监控平台与可视化平台”。
- 筛选 option 的可见文字用中文，提交给地图状态的 value 保持英文 `type_id`。
- 不改变 BFF 的主源、备用源、缓存、鉴权或请求边界行为。
- 不在地图页面渲染任何数据源状态、备用数据、缓存或过期时间提示。
- 先运行失败测试，再写最小实现；只修改本次需求涉及的文件。

---

### Task 1: 标题与状态面板筛选的可靠性

**Files:**

- Modify: `index.html`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/StatusPanel.tsx`
- Modify: `src/index.css`
- Test: `tests/component/status-panel.test.tsx`
- Test: `tests/e2e/app-smoke.spec.ts`

**Interfaces:**

- Consumes: `DISPLAYED_TYPES: Array<{ type_id: string; type_name: string }>` 和 `useMapState().setFilter(filter: string)`。
- Produces: 固定的中文筛选 option；选择项继续传递稳定的 `type_id`。

- [x] **Step 1: 写入标题、固定筛选项与布局的失败断言**

在 `tests/component/status-panel.test.tsx` 删除 `fetchHazardTypes` mock，断言首次渲染即有“洪水”“地震”和全部 14 个筛选项，且 select 不会 disabled；断言统计元素拥有用于间距的 class。更新 `tests/e2e/app-smoke.spec.ts`，断言 `page.title()` 和新 Header 标题。运行：

```bash
pnpm run test:component -- tests/component/status-panel.test.tsx
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e
```

预期：旧标题和网络依赖的筛选实现导致断言失败。

- [x] **Step 2: 实现标题和静态筛选项**

将 `index.html` 与 `Header.tsx` 改为精确标题。删除 `StatusPanel.tsx` 中 `fetchHazardTypes`、认证健康检查和加载状态，直接映射 `DISPLAYED_TYPES`。将 `.total-count` 改为使用 `gap: 12px`，将 `.btn` 加上 `justify-content: center`，保留 Header 按钮的图标与文字间距。

- [x] **Step 3: 运行定向验证**

运行：

```bash
pnpm run test:component -- tests/component/status-panel.test.tsx
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e
pnpm run typecheck:client
```

预期：目标测试、E2E 和客户端类型检查通过。

### Task 2: 移除地图运行状态横幅

**Files:**

- Modify: `src/features/map/MapView.tsx`
- Test: `tests/component/map-view.test.tsx`

**Interfaces:**

- Consumes: `useMapState().sourceMeta` 与 `HazardFeedResponse["meta"]`。
- Produces: 数据元信息继续供状态管理使用，但 MapView 不产生可见诊断横幅。

- [x] **Step 1: 写入状态横幅不会显示的失败断言**

将 `tests/component/map-view.test.tsx` 中 success、备用源和 stale 的状态文字断言替换为：使用对应元数据完成加载后，`queryByRole("status")` 为 `null`，且页面不含“暂无可用灾害数据”。运行：

```bash
pnpm run test:component -- tests/component/map-view.test.tsx
```

预期：旧 MapView 仍渲染 `role="status"`，测试失败。

- [x] **Step 2: 最小实现移除可见状态分支**

从 `MapView.tsx` 删除 `sourceMeta` 解构、状态横幅、空数据提示和仅为它们服务的 `getSourceStatusLabel`。不要修改地图容器、热力图切换、图层 hooks 或 MapStateContext。

- [x] **Step 3: 运行定向验证**

运行：

```bash
pnpm run test:component -- tests/component/map-view.test.tsx
pnpm run typecheck:client
```

预期：MapView 测试和类型检查通过。

### Task 3: 全量复核

**Files:**

- Modify if needed: 本计划中列出的文件
- Test: `tests/component/**/*.tsx`
- Test: `tests/e2e/app-smoke.spec.ts`

**Interfaces:**

- Consumes: Tasks 1--2 的行为变更。
- Produces: 可审阅的质量证据，不含无关后端或生成物改动。

- [x] **Step 1: 审阅文案与回归范围**

使用 `rg` 检查旧标题、“数据可能已过期”“已显示备用数据”“暂不可用”和“暂无可用灾害数据”是否仍由地图 UI 渲染；保留测试 fixture、服务端日志和后端协议中的技术状态。

- [x] **Step 2: 执行完整质量门禁**

运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run test:unit
pnpm run test:component
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e
pnpm run build
git diff --check
```

预期：所有命令通过；构建保留已知的 Mapbox vendor chunk 大小提示但不产生错误。

- [x] **Step 3: 最终复核**

检查 `git status --short`，确认仅包含本设计文档、计划、标题、状态面板、MapView、样式和相关测试。记录验证输出；未经用户明确要求，不提交。
