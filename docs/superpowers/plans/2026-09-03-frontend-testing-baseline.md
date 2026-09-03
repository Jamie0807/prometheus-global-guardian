# 前端测试体系与测试基线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking progress.

**Goal:** 建立覆盖 Service、React 组件和关键浏览器流程的前端测试体系，并固化可重复执行的测试基线命令。

**Architecture:** 保留现有 Node 原生 BFF 测试和 Node 环境的 Service Vitest 测试；新增独立的 jsdom Vitest 配置运行 React Testing Library 组件测试；新增 Playwright 生产构建冒烟测试，通过路由 mock 隔离外部灾害源、Mapbox 和 AI provider。`test:baseline` 统一编排质量门禁，不改变业务 API。

**Tech Stack:** TypeScript、React 19、Vitest 3、React Testing Library、jsdom、Playwright、pnpm。

## 全局约束

- 使用 pnpm 10.15.1 和 `.nvmrc` 要求的 Node.js 20.19.x。
- 新测试必须验证用户可观察行为，不测试 React 私有实现细节。
- 单元测试和组件测试不得依赖真实 DisasterAware、Mapbox、Python Analytics 或模型服务。
- E2E 测试使用本地 Express 生产服务和 Playwright 路由 mock，保证离线可重复执行。
- 不自动执行 git commit；只有用户明确要求时才使用 `pnpm commit`。
- 所有计划、进度、README 和基线说明使用中文；代码中的现有英文 UI 文案保持不变。

---

### 任务 1：建立测试配置和命令边界

**文件：**

- 修改：`package.json`
- 修改：`pnpm-lock.yaml`
- 修改：`vitest.config.ts`
- 新增：`vitest.component.config.ts`
- 新增：`tests/component/setup.ts`

- [x] **步骤 1：安装测试依赖**：加入 `@testing-library/jest-dom`、`@testing-library/react`、`@testing-library/user-event`、`jsdom` 和 `@playwright/test`。
- [x] **步骤 2：增加命令**：保留 `test:bff` 和 `test:services`，新增 `test:unit`、`test:component`、`test:e2e`、`test:baseline`；`test:unit` 串联 BFF 与 Service 测试。
- [x] **步骤 3：配置组件测试环境**：`vitest.component.config.ts` 使用 `jsdom`、`tests/component/setup.ts` 引入 `@testing-library/jest-dom/vitest`，只匹配 `tests/component/**/*.test.tsx`。
- [x] **步骤 4：运行配置验证**：执行 `pnpm run test:unit` 和 `pnpm run test:component`，确认命令边界清晰且组件测试能被独立发现。

### 任务 2：增加 React 组件行为测试

**文件：**

- 新增：`tests/component/status-panel.test.tsx`
- 测试对象：`src/components/StatusPanel.tsx`

- [x] **步骤 1：先写失败测试**：mock `fetchHazardTypes` 和 `checkHealth`，覆盖灾害类型加载、筛选变更回调、刷新按钮回调和加载期间控件禁用。
- [x] **步骤 2：运行组件测试确认失败**：执行 `pnpm run test:component -- tests/component/status-panel.test.tsx`，先处理 Node 20 与 jsdom 版本兼容问题。
- [x] **步骤 3：仅在测试暴露真实问题时修改组件**：优先保持现有行为；本次未修改组件业务代码。
- [x] **步骤 4：运行组件测试确认通过**：执行 `pnpm run test:component`，确认测试至少覆盖一个加载态和两个用户交互。

### 任务 3：建立 Playwright 浏览器冒烟测试

**文件：**

- 新增：`playwright.config.ts`
- 新增：`tests/e2e/app-smoke.spec.ts`
- 修改：`.gitignore`（忽略 Playwright 报告和测试结果）

- [x] **步骤 1：配置本地服务**：使用 `pnpm run build && PORT=4174 pnpm start` 作为 `webServer`，访问专用测试端口 `http://127.0.0.1:4174`，生产服务启动前不访问外部真实凭据。
- [x] **步骤 2：先写浏览器失败断言**：验证首页标题、Active Monitoring、Total Hazards、Filter by Type 和 AI 助手入口存在；通过 `page.route` mock `/api/authorize`、`/api/hazards` 和 `/api/hazards/types`。
- [x] **步骤 3：运行 Playwright 确认失败或环境缺失**：执行 `pnpm run test:e2e`，已安装项目锁定的 Chromium 并通过测试。
- [x] **步骤 4：完成关键交互断言**：选择灾害类型后确认筛选回调驱动的 UI 状态，点击 AI 助手后确认助手面板出现；AI 请求通过 mock，不调用真实 provider。
- [x] **步骤 5：验证稳定性**：Playwright 冒烟测试已连续通过，并在完整基线中再次通过。

### 任务 4：固化测试基线和项目文档

**文件：**

- 新增：`docs/TESTING_BASELINE.md`
- 修改：`README.md`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- 修改：`package.json`

- [x] **步骤 1：定义基线命令**：`test:baseline` 依次执行 lint、format check、客户端和服务端类型检查、unit、component、e2e 和 build；任一步失败立即退出。
- [x] **步骤 2：记录当前基线**：记录 BFF 29 项、Service 17 项、组件 3 项、E2E 1 项、Node/工具版本和已知非阻塞 warning。
- [x] **步骤 3：更新 README**：分开说明单元测试、组件测试、E2E 测试和完整基线命令，明确当前测试不覆盖真实第三方服务。
- [x] **步骤 4：更新优化清单**：把“前端测试体系”和“测试基线建设”更新为已完成，并记录后续仍待建设的视觉回归、Python 算法测试和 API 契约测试。
- [x] **步骤 5：运行完整基线**：执行 `pnpm run test:baseline`、`git diff --check`，确认文档、命令和实际输出一致。

## 验收标准

- `pnpm run test:unit` 通过 BFF 和 Service 测试。
- `pnpm run test:component` 能在 jsdom 中运行 React Testing Library 测试。
- `pnpm run test:e2e` 能启动本地服务并通过至少一个首页关键流程。
- `pnpm run test:baseline` 统一执行所有质量门禁并在失败时退出。
- README 和 `docs/TESTING_BASELINE.md` 明确测试边界、命令和当前基线数量。
- 不依赖真实第三方 API，不产生未忽略的构建或 Playwright 临时文件。
