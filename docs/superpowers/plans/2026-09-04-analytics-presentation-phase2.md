# Analytics 展示一致性第二阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**目标：** 在第一阶段结果归一化的基础上，为 Analytics 展示建立可扩展的中英文文案资源，并用组件测试验证质量面板的用户可观察行为。

**架构：** 保留 `analyticsPresentation.ts` 作为外部结果归一化边界，将状态、风险、质量问题和建议文案集中到按 locale 选择的资源对象中。Analytics 页面默认使用中文资源，未来切换语言时只需传入 locale，不改变 Python API 契约。组件测试通过 mock Analytics Service 隔离网络，只验证质量面板的加载、中文展示和异常分数降级。

**技术栈：** React 19、TypeScript、Vitest、React Testing Library、FastAPI 结果契约。

## 全局约束

- 不改变既有 `/api/v1/*` 路径和 Python 响应兼容字段。
- 外部结果在进入 React JSX 前必须经过 `unknown` 边界校验和有限值/范围归一化。
- 默认界面继续使用中文，英文资源只作为展示适配层的可测试能力。
- 不引入新的状态管理库或完整 i18n 依赖，不重写 `AnalyticsPage.tsx`。
- 不自动执行 `git add`、`git commit`、push 或创建 PR；提交需等待用户明确要求。

## 任务 1：抽取 Analytics 文案资源

**文件：**

- 修改：`src/services/analytics/analyticsPresentation.ts`
- 测试：`tests/service-analytics-presentation.test.ts`

- [x] 增加 `AnalyticsLocale = "zh-CN" | "en-US"` 和按 locale 组织的状态、风险等级、趋势、严重程度及质量文案资源。
- [x] 让 `getPredictionDisplay`、`getRiskLevelLabel`、`getTrendLabel`、`formatRiskRecommendation` 和 `localizeAnalyticsMessage` 接受可选 locale，默认 `zh-CN`，保持现有调用方兼容。
- [x] 增加中英文核心状态和建议测试，确保缺失/异常输入仍返回稳定降级文本。
- [x] 运行 `pnpm exec vitest run tests/service-analytics-presentation.test.ts`，6 项测试通过。

## 任务 2：补充数据质量组件测试

**文件：**

- 新增：`tests/component/data-quality-monitor.test.tsx`

- [x] mock `assessDataQuality` 和 `getQualityThresholds`，构造包含英文问题、建议、通过状态和异常分数的返回值。
- [x] 验证质量报告加载后展示中文状态、总分和五维百分比。
- [x] 验证英文问题和建议展示为中文，负数、超范围、NaN 不以异常百分比形式出现。
- [x] 运行 `pnpm run test:component`，5 项组件测试通过。

## 任务 3：文档与验证

**文件：**

- 修改：`README.md`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- 修改：`docs/TESTING_BASELINE.md`

- [x] 在项目结构和测试清单中加入第二阶段计划及质量组件测试。
- [x] 将 P1 条目标记为“第二阶段已完成”，保留算法校准、移动端视觉回归和完整页面覆盖为后续项。
- [x] 执行 `pnpm run lint`、`pnpm run format:check`、`pnpm run typecheck:client`、`pnpm run typecheck:server`、`pnpm run build`、`pnpm test`、`pnpm run test:component`、`pnpm run test:e2e` 和 Python 全量测试。
- [x] 执行 `git diff --check`，确认新阶段改动保持未提交，等待用户下一次明确提交指令。
