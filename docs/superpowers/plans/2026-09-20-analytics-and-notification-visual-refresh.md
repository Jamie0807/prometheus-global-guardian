# 分析面板与通知按钮视觉统一实施计划

> **执行要求：** 实施时使用 `subagent-driven-development`（推荐）或 `executing-plans`，逐项完成并复核；每项步骤使用复选框跟踪。

**目标：** 让所有分析页签与首页通知按钮遵循首页地图的深蓝玻璃视觉系统，同时保留数据状态的语义色与既有交互。

**架构：** 在分析页根元素上定义局部 CSS 主题变量，分析组件以这些变量绘制背景、表面、描边、正文、弱文本和强调色；共享可视化组件只在分析页面实际使用的表面上消费这些变量。通知中心继续使用标题栏的 `.header-action` 样式，只把彩色 emoji 铃铛替换为线性 SVG。

**技术栈：** React 19、TypeScript、Vite、CSS、Vitest、Testing Library、Playwright。

## 全局约束

- 分析页主题限定在 `.analytics-page` 内，避免影响地图首页和其他弹窗。
- 海军蓝面板、浅蓝描边和青蓝强调色必须与 `src/index.css` 现有状态面板、图例及标题栏按钮保持一致。
- 正常状态使用青蓝；警告与高风险使用小面积琥珀状态提示，珊瑚仅用于失败/严重故障；分析图表使用蓝青色阶，卡片维持低对比蓝灰描边。
- 通知按钮保留 unread count、点击开关、通知数据和红色未读徽标行为。
- 不改数据处理、页面路由、分析接口和通知状态管理。
- 先添加并运行失败的定向测试，再实现；不执行 `git add`、提交、推送或创建 PR。
- 计划和进度记录使用中文。

## 文件职责

- `src/features/analytics/AnalyticsPage.tsx`：分析功能根容器，提供主题作用域。
- `src/features/analytics/styles.ts`、`src/index.css`：分析主题令牌和页面布局样式；首页通用按钮规则保持原样。
- `src/features/analytics/components/` 与 `components/tabs/`：分析各区块、标签页和结果视图的消费端。
- `src/components/DataVisualization.tsx`、`ChartsPanel.tsx`、`DataQualityMonitor.tsx`：分析页使用的指标、图表和质量视图表面。
- `src/components/NotificationCenter.tsx`：首页通知触发按钮图标。
- `tests/component/analytics-page.test.tsx`、`tests/component/localized-auxiliary-ui.test.tsx`、`tests/e2e/app-smoke.spec.ts`：主题作用域、图标语义和端到端视觉令牌验证。

---

### Task 1: 验证分析页主题作用域

**文件：**

- 修改：`tests/e2e/app-smoke.spec.ts`
- 测试：`tests/e2e/app-smoke.spec.ts`

**接口：**

- 输入：首页“打开数据分析面板”按钮。
- 输出：分析页根元素 `.analytics-page`，其计算样式包含分析强调色 `#67e8f9`，主题只作用于该根元素及其子树。

- [x] **步骤 1：添加主题作用域的失败断言**

在现有首页 E2E 中，于 AI 助手流程之前打开分析页并添加以下断言：

```ts
await page.getByRole("button", { name: "打开数据分析面板" }).click();
const analyticsPage = page.locator(".analytics-page");
await expect(analyticsPage).toBeVisible();
expect(
  await analyticsPage.evaluate((element) =>
    getComputedStyle(element).getPropertyValue("--analytics-accent").trim(),
  ),
).toBe("#67e8f9");
```

- [x] **步骤 2：运行测试确认因缺少主题作用域失败**

运行：

```bash
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e -- tests/e2e/app-smoke.spec.ts
```

预期：失败信息指向 `.analytics-page` 不存在或主题令牌为空，不是页面加载或 fixture 错误。

### Task 2: 统一分析页及所有标签页的视觉主题

**文件：**

- 修改：`src/features/analytics/AnalyticsPage.tsx`
- 修改：`src/features/analytics/styles.ts`
- 修改：`src/features/analytics/components/AnalyticsHeader.tsx`
- 修改：`src/features/analytics/components/AnalyticsSummaryGrid.tsx`
- 修改：`src/features/analytics/components/AnalyticsControlPanel.tsx`
- 修改：`src/features/analytics/components/AnalyticsTabs.tsx`
- 修改：`src/features/analytics/components/tabs/OverviewTab.tsx`
- 修改：`src/features/analytics/components/tabs/AnalyticsChartsTab.tsx`
- 修改：`src/features/analytics/components/tabs/AnalyticsQualityTab.tsx`
- 修改：`src/features/analytics/components/tabs/PredictionsTab.tsx`
- 修改：`src/features/analytics/components/tabs/RiskTab.tsx`
- 修改：`src/components/DataVisualization.tsx`
- 修改：`src/components/ChartsPanel.tsx`
- 修改：`src/components/DataQualityMonitor.tsx`
- 修改：`src/index.css`
- 测试：`tests/e2e/app-smoke.spec.ts`
- 回归：`tests/component/analytics-page.test.tsx`

**接口：**

- 消费：`.analytics-page` 作用域中的 CSS 自定义属性。
- 提供：所有分析页子树共用的背景、面板、嵌套表面、边框、正文、弱文本、青蓝强调和焦点颜色。

- [x] **步骤 1：在分析页根元素建立 CSS 主题令牌**

在 `AnalyticsPage.tsx` 的根节点增加 `className="analytics-page"`，将 `styles.ts` 中根背景改为 `var(--analytics-page-bg)`。在 `src/index.css` 新增以下主题规则，并将实际面板外观放入 `.analytics-surface`、`.analytics-surface--inset`、`.analytics-heading`、`.analytics-action`、`.analytics-tab` 样式类；组件保留布局内联样式，但删除这些共用表面的装饰性内联样式。

```css
.analytics-page {
  --analytics-page-bg: linear-gradient(145deg, rgba(7, 19, 37, 0.98), rgba(10, 29, 49, 0.94));
  --analytics-surface: linear-gradient(145deg, rgba(7, 19, 37, 0.94), rgba(10, 29, 49, 0.88));
  --analytics-surface-raised: rgba(13, 37, 61, 0.9);
  --analytics-surface-inset: rgba(3, 12, 28, 0.82);
  --analytics-border: rgba(125, 211, 252, 0.3);
  --analytics-border-soft: rgba(148, 193, 225, 0.13);
  --analytics-text: #e8f3ff;
  --analytics-muted: #91b8d1;
  --analytics-accent: #67e8f9;
  --analytics-accent-glow: rgba(56, 189, 248, 0.18);
}
```

面板类使用 `color: var(--analytics-text)`、`border: 1px solid var(--analytics-border)` 和首页相同的 inset 高光；按钮与标签页用青蓝 hover/focus/selected 态。

- [x] **步骤 2：替换分析组件的装饰性黑灰样式**

保持布局、文案和状态条件不变，将共享容器转换成上一阶段定义的样式类，将动态文字、折线与分布条的装饰色改为 CSS 变量。覆盖总览、图表、预测、风险、数据质量、统计卡、分布条、Python 分析控制区及质量监控表面。风险/在线状态颜色和灾害类型色表在本轮增量中调整为统一语义色和无红绿配对的分类色。共享 `DataVisualization` 默认值使用带后备色的 CSS 变量，确保组件脱离 `.analytics-page` 时仍能显示，例如：

```tsx
color = "var(--analytics-accent, #4CAF50)";
```

分析页打开后，图表标签页、预测、风险和数据质量标签页均需使用 `.analytics-surface` 或 `.analytics-surface--inset`；页面专属样式由 `.analytics-page` 作用域约束，禁止新增无作用域的全局颜色覆盖。

- [x] **步骤 3：运行定向组件和 E2E 验证**

运行：

```bash
pnpm run test:component -- tests/component/analytics-page.test.tsx
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e -- tests/e2e/app-smoke.spec.ts
pnpm run typecheck:client
```

预期：分析页现有五个标签页切换和边界数据显示通过；浏览器计算样式读取到主题令牌。

#### 补充修复：恢复灾害类别分布进度条填充

- [x] 在 `tests/component/data-visualization.test.tsx` 添加 49.8% 进度条测试，并确认旧实现把 CSS 变量与 `dd` 后缀拼成无效颜色，导致填充颜色为空。
- [x] `ProgressBar` 改为直接使用有效的 `backgroundColor`，约束进度宽度范围，并为轨道补充 `progressbar` 无障碍状态。
- [x] 验证组件测试、首页分析面板 E2E、客户端类型检查、lint、格式检查、构建和 `git diff --check`。

### Task 3: 统一首页通知铃铛图标

**文件：**

- 修改：`src/components/NotificationCenter.tsx`
- 测试：`tests/component/localized-auxiliary-ui.test.tsx`

**接口：**

- 输入：既有 unread count 和 `isOpen` 状态。
- 输出：现有按钮内的装饰性线性 SVG 铃铛；按钮的可访问名称、未读徽标和开合行为不变。

- [x] **步骤 1：添加图标一致性的失败断言**

在“为通知删除操作提供中文无障碍名称”相邻测试中，打开通知中心后断言触发按钮内存在 `aria-hidden="true"` 的 SVG 图标：

```ts
const trigger = screen.getByRole("button", { name: /通知/ });
expect(trigger.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
```

- [x] **步骤 2：运行组件测试确认铃铛 SVG 断言失败**

运行：

```bash
pnpm run test:component -- tests/component/localized-auxiliary-ui.test.tsx
```

预期：失败信息指出当前按钮没有装饰性 SVG。

- [x] **步骤 3：使用标题栏线性图标风格替换 emoji**

在 `.notification-trigger` 按钮内加入 `viewBox="0 0 24 24"` 的描边铃铛 SVG，设置 `fill="none"`、`stroke="currentColor"`、圆角线帽与线连接、`aria-hidden="true"`；保留“通知”文本、`aria-expanded`、`onClick` 和红色徽标。

- [x] **步骤 4：运行通知组件测试**

运行：

```bash
pnpm run test:component -- tests/component/localized-auxiliary-ui.test.tsx
```

预期：SVG 断言与现有删除通知、开合、未读状态相关断言通过。

### Task 4: 整体质量复核

**文件：**

- 检查：本计划列出的实现与测试文件。
- 验证：客户端类型、组件和端到端测试、格式、lint 与构建。

**接口：**

- 消费：任务 1–3 的主题样式和图标调整。
- 提供：代码差异、测试结果与格式检查的交付证据。

- [x] **步骤 1：复核差异范围与语义颜色**

检查 `git status --short` 和 `git diff --check`；搜索分析页中的 `#4CAF50` 与 `#1a1a1a`，确认剩余值仅服务于有意保留的业务语义、CSS 变量后备值或通用非分析 UI。

- [x] **步骤 2：运行项目配置的验证命令**

运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm test
pnpm run test:component
PATH=/private/tmp/prometheus-pnpm-node20:$PATH pnpm run test:e2e
pnpm run test:python
pnpm run build
git diff --check
```

预期：所有命令通过；若失败，先判断是代码、测试、配置还是环境问题并记录原因。

- [x] **步骤 3：复核交付范围**

确认差异只包含分析页主题、通知铃铛、相关测试及本次 Spec/Plan 文档；不暂存、不提交、不推送、不创建 PR。

### Task 5: 更新分析面板标识与状态配色

**文件：**

- 修改：`src/features/analytics/components/AnalyticsHeader.tsx`
- 修改：`src/features/analytics/components/AnalyticsSummaryGrid.tsx`
- 修改：`src/features/analytics/components/AnalyticsControlPanel.tsx`
- 修改：`src/features/analytics/components/tabs/OverviewTab.tsx`
- 修改：`src/features/analytics/components/tabs/PredictionsTab.tsx`
- 修改：`src/features/analytics/components/tabs/RiskTab.tsx`
- 修改：`src/components/DataVisualization.tsx`
- 修改：`src/components/DataQualityMonitor.tsx`
- 修改：`src/components/ChartsPanel.tsx`
- 修改：`src/index.css`
- 验证：`pnpm run typecheck:client`、`pnpm run lint`、`pnpm run format:check`、`pnpm run build`、`git diff --check`

**接口：**

- 分析页根节点提供局部状态色 CSS 变量：`--analytics-state-normal`、`--analytics-state-warning`、`--analytics-state-danger`。
- `AnalyticsHeader` 提供装饰性线性 SVG 主标识，不改变标题可访问名称或关闭按钮行为。
- `ChartsPanel` 分类色表仅供分析标签页使用，不扩展到地图 UI。

- [x] **步骤 1：确认状态和类别色的使用范围**

检查 `AnalyticsHeader`、摘要卡、总览、预测、风险、质量监控与 `DataVisualization` 中的颜色用途。在线/低风险/完成状态映射为 `var(--analytics-state-normal)`，提醒映射为 `var(--analytics-state-warning)`，离线/高风险/失败映射为 `var(--analytics-state-danger)`；只在 `.analytics-page` 作用域提供新变量。

- [x] **步骤 2：替换主标识并集中分析页状态色**

在 `AnalyticsHeader.tsx` 中以 `aria-hidden="true"` 的描边 SVG 替换标题 emoji。为 `.analytics-page` 增加 normal `#67e8f9`、warning `#fbbf24`、danger `#fb7185` 令牌；将摘要、总览、预测、风险、质量组件中的红绿硬编码改为状态令牌，保留原有文字、图标和数据条件。

- [x] **步骤 3：替换灾害类别色表**

将 `ChartsPanel.tsx` 的类别颜色改成蓝青色阶，并检查 `PredictionsTab.tsx` 中各灾种图表使用的颜色，确保分类颜色统一在蓝青系。

- [x] **步骤 4：运行允许的客户端质量检查**

运行 `pnpm run typecheck:client`、`pnpm run lint`、`pnpm run format:check`、`pnpm run build` 与 `git diff --check`。当前任务的交付不包含数据或交互逻辑变更。

### Task 6: 复核增量变更范围

- [x] 检查分析页状态色令牌只由 `.analytics-page` 提供，通知徽标、地图和其他弹窗没有受到分析色表影响。
- [x] 检查标题可访问名称仍为“数据分析”，标题图标为装饰性 SVG，分类图表有足够区分且没有红绿配对。
- [x] 检查 `git diff --check` 与 `git status --short`，确认不暂存、不提交、不推送、不创建 PR。

### Task 7: 进一步统一分析图标与首页配色

**文件：**

- 新增：`src/features/analytics/components/AnalyticsIcon.tsx`
- 修改：`src/features/analytics/components/AnalyticsHeader.tsx`
- 修改：`src/features/analytics/components/AnalyticsTabs.tsx`
- 修改：`src/features/analytics/components/AnalyticsControlPanel.tsx`
- 修改：`src/features/analytics/components/AnalyticsSummaryGrid.tsx`
- 修改：`src/features/analytics/components/tabs/OverviewTab.tsx`
- 修改：`src/features/analytics/components/tabs/PredictionsTab.tsx`
- 修改：`src/features/analytics/components/tabs/RiskTab.tsx`
- 修改：`src/components/ChartsPanel.tsx`
- 修改：`src/components/DataQualityMonitor.tsx`
- 修改：`src/components/DataVisualization.tsx`
- 修改：`src/index.css`
- 验证：客户端类型、lint、格式、构建和差异检查

**接口：**

- `AnalyticsIcon` 接收 `name` 与可选 `size`，输出 `aria-hidden` 的描边 SVG；`chart` 图标复用 `src/components/Header.tsx` 中数据分析按钮的路径。
- `.analytics-page` 提供蓝色阶图表令牌；状态色只用于数值、标签、图标和提示文字，不用于外围卡片的大面积彩色描边。

- [x] **步骤 1：创建与首页导航一致的图标组件**

增加 `AnalyticsIcon`，定义 `chart`、`trend`、`forecast`、`warning`、`check`、`close`、`map`、`refresh` 和 `analysis` 图标名；统一 `viewBox="0 0 24 24"`、`stroke="currentColor"`、`strokeWidth={2}`、圆角线帽/连接和 `aria-hidden="true"`。其中 `chart` 的路径复用首页数据分析导航按钮。

- [x] **步骤 2：替换主要分析标题和标签中的 emoji**

更新 `AnalyticsHeader`、`AnalyticsTabs`、`AnalyticsControlPanel`、`AnalyticsSummaryGrid`、`OverviewTab`、`PredictionsTab`、`RiskTab` 和 `ChartsPanel` 中作为标题标识的 emoji，改用 `AnalyticsIcon`；文案、按钮名称和切换行为保持不变。

- [x] **步骤 3：收敛高饱和度分类与风险卡片装饰**

将图表类别调为蓝青同色阶；4D 统计与预测卡片使用共享浅蓝/青蓝强调令牌和中性蓝灰边框。风险卡片外围改用分析边框令牌；高风险继续用琥珀小标签，珊瑚仅用于失败/严重故障提示。

- [x] **步骤 4：运行前端质量检查并复核作用范围**

运行客户端类型检查、lint、格式检查、构建和 `git diff --check`；搜索分析页可见标题，确认其不再以 emoji 作图标，并确认首页导航和地图颜色没有新增差异。

### Task 8: 补齐剩余图标并统一通知与图表详情面板

**文件：**

- 修改：`src/features/analytics/components/AnalyticsIcon.tsx`
- 修改：`src/features/analytics/components/tabs/OverviewTab.tsx`
- 修改：`src/features/analytics/components/tabs/PredictionsTab.tsx`
- 修改：`src/components/ChartsPanel.tsx`
- 修改：`src/components/NotificationCenter.tsx`
- 修改：`src/components/ChartDrilldownModal.tsx`
- 修改：`src/index.css`
- 验证：客户端类型、lint、格式、构建和差异检查

- [x] **步骤 1：替换圈出的剩余 emoji 标识**

为预测卡片中的地震、火山、风暴、洪水、野火类别，以及建议、时间、稳定性和说明增加统一线框 SVG；图表点击提示改用线框信息图标。

- [x] **步骤 2：统一通知中心视觉**

将通知面板改为海军蓝玻璃底、浅蓝描边、浅色正文和青蓝标题；成功/信息状态使用青蓝线框图标，警告/失败继续用小型琥珀/珊瑚图标。按钮保留现有操作行为。

- [x] **步骤 3：统一图表详情弹窗**

将灰黑弹窗、绿色标题/总数、橙色数值及绿色关闭按钮改为海军蓝玻璃面板、浅蓝描边、青蓝数值与交互态；严重程度色只留在小标签中，并保留可读对比度。

- [x] **步骤 4：运行前端质量检查并复核窄屏样式**

运行客户端类型检查、lint、格式检查、构建和 `git diff --check`；搜索本轮范围内剩余的标题 emoji 与绿/橙色硬编码，确认通知及图表弹窗行为未改动。通过本地页面查看首页、通知面板、分析面板与图表详情弹窗；响应式窄屏规则已检查。
