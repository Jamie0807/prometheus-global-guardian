# 最小 CI 门禁与 Python 测试入口 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 GitHub Actions 中阻止未通过 Node/BFF 或 Python 自动化测试的 Pull Request 和 `main` 推送，并提供统一的 Python 测试命令。

**Architecture:** 新增一个只读权限的质量工作流，使用独立并行任务运行 Node/BFF 基线与 Python unittest。根目录 `test:python` 脚本封装现有 Python 测试发现命令，文档以该脚本作为本地和 CI 的统一入口；`test:baseline` 继续只覆盖 Node 测试。

**Tech Stack:** GitHub Actions、Node.js 20.19.0、pnpm 10.15.1、Python 3.13、unittest、Playwright。

## Global Constraints

- 工作流仅在 `pull_request` 和推送到 `main` 时触发，且权限固定为 `contents: read`。
- Node 使用 `.nvmrc` 的 20.19.0，pnpm 使用 `packageManager` 的 10.15.1，Python 使用 3.13。
- Node 安装必须使用 `pnpm install --frozen-lockfile`；Python 从 `python-analytics-service/requirements.txt` 安装依赖。
- `test:python` 运行 `python-analytics-service/tests/test_*.py` 的 unittest 发现命令，并保持在 `test:baseline` 外。
- Node/BFF 任务失败时，仅上传 `test-results` 和 `playwright-report`，保留 7 天。
- 不改变产品逻辑、部署流程、Python 依赖版本或现有 `test:baseline` 步骤。

---

## 文件结构

- 创建 `.github/workflows/quality.yml`：声明最小质量门禁、版本、缓存、并行任务和失败诊断工件。
- 修改 `package.json`：公开 `test:python` 脚本，供本地与 CI 共用。
- 修改 `README.md`：将 Python 测试示例改为统一入口，并说明 CI 的两个检查任务。
- 修改 `python-analytics-service/README.md`：以根目录入口描述 Python 测试与 26 项测试范围。
- 修改 `docs/TESTING_BASELINE.md`：列出 Python 测试命令，校正当前测试数量，并说明 CI 覆盖边界。

### Task 1: 提供 Python 测试入口

**Files:**

- Modify: `package.json:20-31`
- Modify: `README.md:310-322`
- Modify: `python-analytics-service/README.md`
- Modify: `docs/TESTING_BASELINE.md:7-29`

**Interfaces:**

- Consumes: `python-analytics-service/tests/test_api_contract.py`、`test_api_routes.py`、`test_result_semantics.py` 中现有 unittest 用例。
- Produces: `pnpm run test:python`，在仓库根目录运行 `python -m unittest discover -s tests -p 'test_*.py'`。

- [ ] **Step 1: 记录当前直接命令的测试结果**

Run: `cd python-analytics-service && python -m unittest discover -s tests -p 'test_*.py'`

Expected: 退出状态为 0，并显示 `Ran 26 tests` 和 `OK`。

- [ ] **Step 2: 添加根目录脚本**

在 `package.json` 的 `scripts` 中加入：

```json
"test:python": "cd python-analytics-service && python -m unittest discover -s tests -p 'test_*.py'"
```

不要修改既有的 `test:baseline` 字符串。

- [ ] **Step 3: 使用统一入口验证 Python 测试**

Run: `pnpm run test:python`

Expected: 退出状态为 0，并显示 `Ran 26 tests` 和 `OK`。

- [ ] **Step 4: 更新测试文档**

将根目录 README 的 Python 测试代码块替换为：

```bash
pnpm run test:python
```

在 Python 服务 README 的测试章节使用同一命令，并说明它从仓库根目录执行、不需要启动服务、当前覆盖 API 契约、路由和结果语义的 26 项测试。

在 `docs/TESTING_BASELINE.md`：

- 向命令表新增 `pnpm run test:python`，类型为 Python API 测试，职责为运行分析服务的 unittest 测试集。
- 将 React 组件数量从 19 更新为 21，根目录基线合计从 120 更新为 122。
- 将独立 Python 数量从 22 更新为 26，描述为 API 契约、FastAPI 路由与结果语义测试，并注明它不计入 Node 基线。
- 将“Python 契约测试接入统一命令”和“CI/CD 中的自动执行”从未纳入范围中删除，改为说明 CI 对 `test:baseline` 与 `test:python` 分别强制执行。

- [ ] **Step 5: 检查变更格式**

Run: `pnpm exec prettier --check package.json README.md python-analytics-service/README.md docs/TESTING_BASELINE.md`

Expected: 所有四个文件显示已格式化。

### Task 2: 建立最小 GitHub Actions 质量门禁

**Files:**

- Create: `.github/workflows/quality.yml`

**Interfaces:**

- Consumes: `.nvmrc`、`package.json#packageManager`、`pnpm-lock.yaml`、`python-analytics-service/requirements.txt` 与 Task 1 产出的 `pnpm run test:python`。
- Produces: 名为 `Quality Gate` 的工作流；`frontend-bff` 与 `python` 两个并行任务均成为 PR 和 `main` 推送的必过检查。

- [ ] **Step 1: 创建工作流定义**

创建 `.github/workflows/quality.yml`：

```yaml
name: Quality Gate

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  frontend-bff:
    name: Frontend and BFF baseline
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.15.1
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm run test:baseline
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: |
            test-results
            playwright-report
          if-no-files-found: ignore
          retention-days: 7

  python:
    name: Python analytics tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.15.1
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
      - uses: actions/setup-python@v5
        with:
          python-version: "3.13"
          cache: pip
          cache-dependency-path: python-analytics-service/requirements.txt
      - run: python -m pip install --upgrade pip
      - run: python -m pip install -r python-analytics-service/requirements.txt
      - run: pnpm run test:python
```

- [ ] **Step 2: 验证 YAML 与工作流约束**

Run: `pnpm exec prettier --check .github/workflows/quality.yml && rg -n "pull_request|branches: \[main\]|contents: read|test:baseline|test:python|retention-days: 7" .github/workflows/quality.yml`

Expected: Prettier 通过；搜索结果包含两种触发事件、只读权限、两个测试命令和 7 天工件保留期。

- [ ] **Step 3: 验证本地可运行的任务命令**

Run: `pnpm run test:python && pnpm run test:baseline`

Expected: 两个命令均以退出状态 0 完成；Python 输出 `Ran 26 tests` 与 `OK`，Node 基线完成 lint、格式、类型、单元、组件、E2E 和构建。

### Task 3: 整体验证与提交准备

**Files:**

- Verify: `.github/workflows/quality.yml`
- Verify: `package.json`
- Verify: `README.md`
- Verify: `python-analytics-service/README.md`
- Verify: `docs/TESTING_BASELINE.md`

**Interfaces:**

- Consumes: Tasks 1–2 的工作流、脚本与文档。
- Produces: 可审阅的最小 CI 门禁变更与本地验证证据。

- [ ] **Step 1: 执行完整本地验证**

Run: `pnpm run test:python && pnpm run format:check && pnpm run test:baseline && git diff --check`

Expected: 所有命令退出状态为 0；Python 显示 `Ran 26 tests` 与 `OK`；无 diff 空白错误。

- [ ] **Step 2: 审查暂存前改动范围**

Run: `git status --short && git diff -- .github/workflows/quality.yml package.json README.md python-analytics-service/README.md docs/TESTING_BASELINE.md`

Expected: 仅包含工作流、Python 测试入口和对应文档变更；不包含依赖目录、缓存、构建产物或无关文件。

- [ ] **Step 3: 在用户明确要求时提交**

先校验提交信息：

```bash
printf '%s\\n' 'ci: add quality gate and python tests' | pnpm exec commitlint
```

仅在用户明确要求提交时，暂存 Task 1–2 的功能文件并使用 `pnpm commit` 创建 Conventional Commit；设计和计划文档按用户确认的提交范围决定是否一并暂存。
