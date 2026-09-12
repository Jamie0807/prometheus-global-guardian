# README 收尾梳理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用准确、精炼的根 README 和 Python Analytics README 说明当前架构、运行方式、质量门禁与项目边界。

**Architecture:** 根 README 是中英双语的项目入口，说明完整三服务架构和开发路径。Python README 是中文为主的服务手册，说明 FastAPI 的职责、配置、API 分组与测试入口；两份文档共享事实，但不重复实现细节。

**Tech Stack:** Markdown、pnpm、Docker Compose、Vite、Express、FastAPI、GitHub Actions。

## Global Constraints

- 只修改 `README.md` 和 `python-analytics-service/README.md`；不改变产品代码、接口、Docker、CI 或部署策略。
- 根 README 保留中英双语；Python README 保持中文为主。
- 项目当前未部署；Docker Compose 仅说明本地完整栈启动。
- 不将 JSON 报告、状态治理、质量门禁以外的能力写成已完成，也不把 HTML 报告写为当前行为。
- 不自动暂存、提交、推送或修改工作区内其他既有改动。

---

### Task 1: 重写根 README

**Files:**

- Modify: `README.md`

**Consumes:** `package.json` 脚本、`docker-compose.yml`、`.github/workflows/quality.yml`、`docs/PROJECT_OPTIMIZATION_BACKLOG.md`、`src/App.tsx` 和状态 Provider。

**Produces:** 一份中英双语项目入口，包含一致的架构、运行、配置、安全、测试与当前状态说明。

- [ ] **Step 1: 建立双语章节骨架**

将根 README 收敛为英文和中文两部分，各自使用相同章节：项目概览、能力、架构、运行要求、快速启动、配置与安全、测试与 CI、Docker、本地状态和目录结构。保留语言锚点，并在开头提示项目当前未部署。

- [ ] **Step 2: 依据真实运行边界编写内容**

准确记录以下事实：浏览器通过 Express BFF 访问授权、灾害和 AI 路由；浏览器直接访问 FastAPI 的 `/api/v1/*`；`MapStateProvider` 持有灾害、筛选、样式、来源元信息和刷新；`UIStateProvider` 持有页面与弹窗状态；报告下载为 JSON；秘密只驻留服务端。

- [ ] **Step 3: 编写可执行命令与环境限制**

列出 `pnpm install`、`pnpm dev`、`pnpm run test:services`、`pnpm run test:component`、`pnpm run test:python`、`pnpm run build` 和 `docker compose up --build`。说明 GitHub Actions 分别执行 Node/BFF 基线和 Python 测试；说明受限沙箱运行 `pnpm test` 时 BFF 监听 `0.0.0.0` 会报 `EPERM`，不能据此判断产品回归。

- [ ] **Step 4: 验证根 README**

运行：

```bash
pnpm exec prettier --check README.md
rg -n "HTML report|HTML reports|MapStateProvider|UIStateProvider|pnpm run test:python" README.md
git diff --check -- README.md
```

预期：格式与 diff 检查通过；检索结果不含旧 HTML 报告描述，并包含当前状态域和 Python 测试入口。

### Task 2: 重写 Python Analytics README

**Files:**

- Modify: `python-analytics-service/README.md`

**Consumes:** `python-analytics-service/app/main.py`、`security.py`、`requirements.txt`、根目录 `scripts/test-python.sh`、Dockerfile 与质量工作流。

**Produces:** 中文为主的 FastAPI 服务手册，包含服务边界、启动、配置、路由分组、测试与目录结构。

- [ ] **Step 1: 建立服务文档骨架**

使用章节：服务职责与边界、快速启动、配置与管理接口、请求约定、API 分组、分析语义、测试、目录结构与当前限制。说明 Express BFF 不代理 Analytics，`/health` 公开，`/metrics` 和 `/cache/clear` 使用 `X-Analytics-Admin-Token`。

- [ ] **Step 2: 同步当前测试和运行说明**

以 `pnpm run test:python` 作为首选入口，说明当前 39 项 unittest 覆盖应用工厂、API 契约、路由及结果语义；将 `test_service.py` 和 `test_pivot_table.py` 标注为手工/打印式脚本。保留本地与 Docker 启动命令、CORS、日志等级和令牌不使用 `VITE_` 前缀的约束。

- [ ] **Step 3: 以路由分组代替实现清单**

保留根信息、健康检查、管理接口、基础分析、质量与统一模型、四维透视五类路由表；说明请求统一使用 `hazards`、坐标使用 `[longitude, latitude]`、非法输入在 Pydantic 边界返回 422。

- [ ] **Step 4: 验证 Python README**

运行：

```bash
pnpm exec prettier --check python-analytics-service/README.md
rg -n "pnpm run test:python|39 项|X-Analytics-Admin-Token|/api/v1" python-analytics-service/README.md
git diff --check -- python-analytics-service/README.md
```

预期：格式与 diff 检查通过；检索结果包含当前测试入口、管理员令牌和 API 前缀。

### Task 3: 交叉核对与收尾验证

**Files:**

- Modify: `README.md`
- Modify: `python-analytics-service/README.md`

**Consumes:** Task 1 和 Task 2 的文档。

**Produces:** 两份术语、端口、变量、命令和状态一致的 README。

- [ ] **Step 1: 交叉核对关键事实**

核对 Node `>=20.19 <21`、pnpm `10.15.1`、Python `3.13`、Vite `5173`、Express `8080`、FastAPI `8001`、Analytics 浏览器直连、JSON 报告、未部署状态和管理令牌规则在两份文档中没有冲突。

- [ ] **Step 2: 执行文档质量门禁**

运行：

```bash
pnpm run format:check
git diff --check
git diff -- README.md python-analytics-service/README.md
```

预期：格式和 diff 检查通过，最终差异仅涉及两份 README 的事实性梳理。
