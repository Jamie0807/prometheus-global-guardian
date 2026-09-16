# 源码中文注释统一 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为项目全部已跟踪的代码、测试与可执行配置文件提供准确的中文职责说明，并将英文注释翻译为中文。

**Architecture:** 变更按前端与 TypeScript 基础设施、BFF 与测试、Python 分析服务三个互不重叠的目录组执行。每组先根据代码确认职责，再只修改注释；最终进行全局英语注释扫描和项目验证。

**Tech Stack:** TypeScript、React、Express、Python、ESLint、Prettier、Vitest、pytest。

## Global Constraints

- 仅处理 Git 已跟踪的 `.ts`、`.tsx`、`.js`、`.cjs` 和 `.py` 文件。
- 不修改逻辑、类型、字符串、UI 文案、API 或测试断言。
- TypeScript 系列用 `/** ... */`，Python 用模块 docstring 写入文件职责。
- 保留 ESLint 与工具链所需指令，技术标识符保持原状。

---

### Task 1: 前端与 TypeScript 基础设施注释

**Files:**

- Modify: `src/**/*.ts`, `src/**/*.tsx`, `shared/logging.ts`, `vite.config.ts`, `vitest*.ts`, `playwright.config.ts`, `eslint.config.js`, `commitlint.config.cjs`

**Interfaces:**

- Consumes: 各文件现有模块导出和调用关系。
- Produces: 不改变运行行为的中文职责与行内注释。

- [ ] 为每个文件的首个代码语句前添加中文职责说明。
- [ ] 将可见英文自然语言注释逐句改为中文，保留指令与技术标识符。
- [ ] 执行 `pnpm run format:check` 与 `pnpm run typecheck:client`。

### Task 2: Express BFF 与 TypeScript 测试注释

**Files:**

- Modify: `server.ts`, `server/**/*.ts`, `tests/**/*.ts`, `tests/**/*.tsx`

**Interfaces:**

- Consumes: BFF 路由、服务边界和测试用例。
- Produces: 不改变运行行为的中文职责与行内注释。

- [ ] 为每个文件的首个代码语句前添加中文职责说明。
- [ ] 翻译英语自然语言注释，保留工具指令与技术标识符。
- [ ] 执行 `pnpm run typecheck:server` 与相关 Vitest 测试。

### Task 3: Python 分析服务注释

**Files:**

- Modify: `python-analytics-service/**/*.py`

**Interfaces:**

- Consumes: FastAPI 应用、分析模块和 pytest/unittest 用例。
- Produces: 不改变运行行为的中文模块 docstring 与行内注释。

- [ ] 为每个文件添加准确的中文模块 docstring；包初始化文件使用解释包职责的 docstring。
- [ ] 翻译英语自然语言注释，保留 Python、FastAPI、Pandas 等技术标识符。
- [ ] 执行 Python 服务测试。

### Task 4: 全局审查与验证

**Files:**

- Verify: 全部目标文件

**Interfaces:**

- Consumes: 前三项的注释变更。
- Produces: 注释扫描记录和项目验证结果。

- [ ] 扫描目标文件的英文自然语言注释，并逐条审查剩余结果。
- [ ] 执行 `pnpm run lint`、`pnpm run format:check`、`pnpm test`、`pnpm run typecheck:client`、`pnpm run typecheck:server`、`pnpm run build` 和 `git diff --check`。
