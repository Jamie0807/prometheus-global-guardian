# 文档与测试基线核验实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用当前代码和实际验证结果更新测试基线，并确认所有持续维护文档与项目现状一致。

**Architecture:** 文档事实由三个权威来源提供：`package.json` 定义本地命令，`.github/workflows/quality.yml` 定义 CI，测试工具输出定义数量。先采集这些事实，再最小化更新说明文档；历史计划和设计只保留，不重写。

**Tech Stack:** Markdown、pnpm、Vitest、Node 原生测试、Playwright、Python unittest、GitHub Actions YAML。

## Global Constraints

- 只修改持续维护文档和本次规格/计划；不改写 `docs/superpowers/` 与 `.superpowers/` 中既有历史档案。
- 测试数量只能引用本次实际命令的最终摘要。
- 文档任务不新增应用测试；使用格式检查、差异检查和命令/CI 交叉核验作为验证。
- BFF 端口绑定若受沙箱限制，记录为环境限制，不视为代码回归。
- 未获得明确指令不得提交、合并或推送。

---

### Task 1: 建立当前测试事实

**Files:**
- Read: `package.json`
- Read: `.github/workflows/quality.yml`
- Read: `vitest.config.ts`
- Read: `vitest.component.config.ts`
- Read: `playwright.config.ts`
- Read: `scripts/test-python.sh`

**Interfaces:**
- Consumes: 测试脚本、测试配置与 CI 工作流。
- Produces: 每个测试入口的真实数量、执行范围、CI 归属和已知环境限制。

- [ ] **Step 1: 确认命令与 CI 的静态边界**

Run: `node -e "const p=require('./package.json'); console.log(p.scripts)" && sed -n '1,130p' .github/workflows/quality.yml`

Expected: 输出 `test:bff`、`test:services`、`test:component`、`test:e2e`、`test:python`、`test:baseline`，并显示 Node 基线与 Python 分别由 CI job 执行。

- [ ] **Step 2: 执行可独立运行的测试组并记录最终摘要**

Run: `pnpm run test:services && pnpm run test:component && pnpm run test:python`

Expected: 每个测试工具输出通过数量；若任一组失败，先定位原因并停止文档数量更新。

- [ ] **Step 3: 执行 BFF 与 E2E 入口并区分代码失败和环境限制**

Run: `pnpm run test:bff && pnpm run test:e2e`

Expected: 输出 BFF、Playwright 的结果；若 BFF 仅因 `listen EPERM` 失败，记录为沙箱端口限制并继续，其他失败停止并定位原因。

### Task 2: 更新测试基线说明

**Files:**
- Modify: `docs/TESTING_BASELINE.md`

**Interfaces:**
- Consumes: Task 1 的真实测试结果与脚本边界。
- Produces: 可由开发者和 CI 使用的当前测试基线说明。

- [ ] **Step 1: 以实际结果替换测试数量和日期**

Edit: 将“当前数量”替换为本次测试工具实际输出的 BFF、Service、组件、E2E 与 Python 数量，并注明 Node 总数只含 `test:baseline` 所执行的测试。

- [ ] **Step 2: 校正命令职责与覆盖描述**

Edit: 按 `package.json` 和测试配置描述 BFF、Service、组件、E2E、Python 与完整 Node 基线；明确 `typecheck:contracts` 属于完整 Node 基线，Python 在 CI 中独立执行。

- [ ] **Step 3: 记录可复现的环境限制**

Edit: 仅在实际重现时说明受限沙箱的 BFF 端口绑定限制，并保持本机与 CI 的完整验证建议。

### Task 3: 核验并最小更新其他当前说明文档

**Files:**
- Read/Modify when stale: `README.md`
- Read/Modify when stale: `python-analytics-service/README.md`
- Read/Modify when stale: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Read/Modify when stale: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1 的测试事实、代码中的服务入口和环境变量、CI 配置。
- Produces: 与当前分支一致的持续维护文档审阅结论。

- [ ] **Step 1: 逐项比对 README 与 Python README**

Run: `rg -n 'test:|Python 3.13|Node|VITE_|ANALYTICS_|Docker|BFF|FastAPI|177|59|39' README.md python-analytics-service/README.md package.json python-analytics-service/app .github/workflows/quality.yml`

Expected: 找到服务拓扑、配置、测试数量和运行入口的每项证据；仅修改不一致的陈述。

- [ ] **Step 2: 比对优化清单与 AGENTS 约束**

Run: `rg -n '测试|CI|worktree|TDD|提交|Node|Python|部署|状态' docs/PROJECT_OPTIMIZATION_BACKLOG.md AGENTS.md package.json .github/workflows/quality.yml`

Expected: 质量基线、当前不部署判断和协作约束与脚本、CI、项目规则一致；仅更新失效事实及最近核对日期。

- [ ] **Step 3: 输出历史档案检查结论**

Run: `git ls-files 'docs/superpowers/**' '.superpowers/**' | wc -l`

Expected: 只记录历史档案被保留，不编辑它们。

### Task 4: 文档验证与复核

**Files:**
- Verify: `docs/TESTING_BASELINE.md`
- Verify: `README.md`
- Verify: `python-analytics-service/README.md`
- Verify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Verify: `AGENTS.md`

**Interfaces:**
- Consumes: 所有已更新文档。
- Produces: 可审阅的、格式正确且与代码一致的文档改动。

- [ ] **Step 1: 执行文档格式检查**

Run: `pnpm run format:check`

Expected: 退出码 0；若失败，只格式化本次修改的 Markdown 文件后重试。

- [ ] **Step 2: 执行差异与事实复核**

Run: `git diff --check && git diff -- docs/TESTING_BASELINE.md README.md python-analytics-service/README.md docs/PROJECT_OPTIMIZATION_BACKLOG.md AGENTS.md`

Expected: 无空白错误，且差异只体现已证实的当前事实。

- [ ] **Step 3: 最终状态检查**

Run: `git status --short`

Expected: 仅出现本次规格、计划和确认需要更新的持续维护文档；不包含历史档案改动或生成物。
