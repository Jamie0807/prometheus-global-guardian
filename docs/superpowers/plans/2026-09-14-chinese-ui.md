# 全量中文界面与品牌更新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将全部本地前端可见静态文案改为简体中文，移除 Header Logo，并将产品标题改为“全球灾害监控平台”，同时保持协议、枚举值和用户交互不变。

**Architecture:** 展示文案仅在前端组件、展示配置和下载内容中转换；灾害类型 `type_id`、Mapbox 样式值、API 数据和外部内容维持原样。Header、地图首页、弹窗和下载输出分别在所属模块完成中文化，测试通过用户可见中文文字验证行为。

**Tech Stack:** React 19、TypeScript、Vite、Vitest、React Testing Library、Playwright。

## Global Constraints

- 本次只处理浏览器端静态可见文字、Logo 和文档/测试；不改变 API、外部数据、类型 ID、Mapbox 样式值、环境变量、Provider 名称或后端代码。
- 页面唯一主标题必须为“全球灾害监控平台”，Header 不保留 Logo 图片、Logo alt 或布局占位。
- `src/config/displayedTypes.ts` 的 `type_id` 保持英文枚举，只有 `type_name` 中文化。
- 外部事件标题、描述、来源、地名和第三方组件返回内容不翻译。
- 新增或变更公开 UI 行为使用 TDD：先更新失败的组件/E2E 断言，再最小修改实现使其通过。
- 不提交、合并或推送，除非用户明确要求。

---

### Task 1: 建立中文化展示常量并收口首页 Header

**Files:**

- Modify: `index.html`
- Modify: `src/components/Header.tsx`
- Modify: `src/config/displayedTypes.ts`
- Modify: `src/components/LegendPanel.tsx`
- Test: `tests/e2e/app-smoke.spec.ts`
- Test: `tests/component/app-state-ownership.test.tsx`

**Interfaces:**

- Consumes: 现有 `UIStateContext` 的视图/弹窗动作、`displayedTypes` 的 `type_id` 和 `type_name`。
- Produces: 无 Logo 的中文 Header、中文页面元数据和可供筛选/图例复用的中文灾害展示名称。

- [x] **Step 1: 先更新 Header 与 E2E 可见文字断言（RED）**

将现有 Header 标题断言改为 `全球灾害监控平台`；将 AI、数据分析、保存报告和设置按钮的 aria-label 断言改为中文；增加 `page.title()` 等于 `全球灾害监控平台` 的断言。运行：

```bash
pnpm run test:component -- --runInBand
pnpm run test:e2e
```

预期：因旧英文文案和 Logo 仍存在而失败；E2E 若被现有工具链环境阻塞，记录精确根因。

- [x] **Step 2: 最小实现 Header、HTML 元数据和灾害类型展示名中文化（GREEN）**

在 `Header.tsx` 删除 Logo 图片及其包装节点，使用单一中文标题；中文化按钮文案和 aria-label。将 `index.html` 的 `lang` 改为 `zh-CN`、`title` 改为 `全球灾害监控平台`。将 `displayedTypes` 的 `type_name` 改为：干旱、地震、极端高温、洪水、事件、滑坡、人为灾害、风暴、龙卷风、热带气旋、海啸、火山喷发、野火、冬季风暴；将图例标题改为“灾害类型”。不修改任何 `type_id`。

- [x] **Step 3: 运行定向验证**

运行：

```bash
pnpm run test:component
pnpm run test:e2e
pnpm run typecheck:client
```

预期：组件测试通过；E2E 在可用浏览器环境中通过，若被已知本地 pnpm/Node 环境阻塞则记录；类型检查通过。

### Task 2: 中文化地图首页、状态面板与地图 Popup

**Files:**

- Modify: `src/components/StatusPanel.tsx`
- Modify: `src/features/map/MapView.tsx`
- Modify: `src/features/map/utils/hazardPopupContent.ts`
- Test: `tests/component/status-panel.test.tsx`
- Test: `tests/component/map-view.test.tsx`
- Test: `tests/component/hazard-popup-content.test.tsx`

**Interfaces:**

- Consumes: `MapStateContext` 的 filter、refresh 和 hazards；`displayedTypes` 的中文 `type_name`；Popup 的 DOM 安全渲染接口。
- Produces: 保持原有 filter value、刷新和地图控制行为的中文监控界面与 Popup。

- [x] **Step 1: 将状态面板、地图控制和 Popup 测试改为中文断言（RED）**

将状态面板断言更新为“实时监控”“灾害总数”“按类型筛选”“全部灾害”“刷新数据”以及中文灾害选项；保留 `FLOOD` 等 select value 断言。将地图控制 title 断言改为“显示标记”“显示热力图”。为 Popup 添加“类型”“严重程度”“说明”“平台”“全球灾害监控平台”的文本断言。运行三个定向组件测试，预期旧实现失败。

- [x] **Step 2: 最小实现中文静态文案（GREEN）**

将 `StatusPanel.tsx`、`MapView.tsx` 和 `hazardPopupContent.ts` 中本地静态文字改为对应中文；Popup 平台值使用“全球灾害监控平台”。不得更改 Popup 使用 `textContent` 的安全渲染方式、筛选值、地图样式值、数据字段或 Worker 行为。

- [x] **Step 3: 运行定向组件测试与客户端类型检查**

运行：

```bash
pnpm run test:component
pnpm run typecheck:client
```

预期：组件测试和客户端类型检查通过。

### Task 3: 中文化弹窗、错误页、图表辅助界面和下载内容

**Files:**

- Modify: `src/components/SettingsModal.tsx`
- Modify: `src/components/SaveReportModal.tsx`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `src/components/ChartCustomizationModal.tsx`
- Modify: `src/components/ChartDrilldownModal.tsx`
- Modify: `src/components/CustomChartTooltip.tsx`
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: `src/components/MapError.tsx`
- Modify: `src/utils/dataExport.ts`
- Test: `tests/component/app-state-ownership.test.tsx`
- Test: `tests/component/ui-state-context.test.tsx`
- Test: `tests/component/error-boundary.test.tsx`

**Interfaces:**

- Consumes: UI modal state、Mapbox style values、报告下载 API 与既有数据导出结构。
- Produces: 中文弹窗、中文辅助与错误界面、中文下载标题，不改变下载行为、样式值、键盘交互或 API 数据。

- [x] **Step 1: 用用户可见中文文案改写现有组件测试（RED）**

更新报告取消/下载、地图设置、地图样式、Header 弹窗 aria-label 和错误边界断言为中文；对下载工具补充中文列头或“没有可导出的数据”的测试（若现有测试基础设施适用）。运行定向测试，预期原文案导致失败。

- [x] **Step 2: 最小实现弹窗和辅助组件中文化（GREEN）**

中文化设置样式显示名、关于信息、报告字段、AI 输入提示、图表自定义/下钻/tooltip、错误页和 Mapbox 配置提示。修正报告下载说明以反映当前 JSON 下载行为，不将其写为 HTML。下载 CSV 的本地标题、列名和未知值回退改为中文；文件扩展名、结构化字段和值保持不变。外部机构名、命令、文件路径、`.env`、Mapbox 和 `DisasterAWARE` 保持原样。

- [x] **Step 3: 运行定向组件和 Service 测试**

运行：

```bash
pnpm run test:component
pnpm run test:services
pnpm run typecheck:client
```

预期：所有相关测试通过；任何下载格式断言变化均有对应测试保护。

### Task 4: 全量可见文案扫描、质量验证与复核

**Files:**

- Modify if needed: `src/**/*.tsx`
- Modify if needed: `src/**/*.ts`
- Modify if needed: `tests/component/**/*.tsx`
- Modify if needed: `tests/e2e/app-smoke.spec.ts`

**Interfaces:**

- Consumes: Tasks 1--3 的中文化 UI 与测试。
- Produces: 无本地静态英文残留、可审阅的质量证据和范围明确的最终差异。

- [x] **Step 1: 扫描残留英文并分类**

运行针对 UI 源文件的 `rg`，将每个英文结果分为技术标识、外部内容、保留的 `en-US` 资源或待翻译的本地可见文本。对待翻译项逐一修改；不以全局替换改动协议和数据。

- [x] **Step 2: 执行完整前端质量门禁**

运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:contracts
pnpm run test:services
pnpm run test:component
pnpm run build
git diff --check
```

预期：所有可运行命令通过；若 BFF/E2E 受现有环境限制，说明原因而非归因为中文化回归。

- [x] **Step 3: 执行浏览器可见性复核**

在可用 Playwright 环境运行 `pnpm run test:e2e`；核验页面标题、无 Logo、中文 Header、中文状态面板、筛选、图例和关键模态入口。若本地环境阻塞，保存精确错误并以组件测试和静态文案扫描补充证据。

- [x] **Step 4: 最终任务级复核**

审阅 diff，确认不含 API/枚举/环境变量/外部数据的误翻译，不含未经确认的生成物，且所有本地可见文案均为中文。记录测试命令与实际输出；不提交。
