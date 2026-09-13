# 项目规格书实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于当前 `main` 分支代码、配置和验证入口，生成一份可持续维护的项目规格书，准确说明架构、边界、运行方式和工程规则。

**Architecture:** 将 `docs/PROJECT_SPEC.md` 作为当前工程事实的单一入口，覆盖系统总览、运行单元、模块分层、数据与安全边界、质量门禁和开发规则。历史 `docs/superpowers/` 与 `.superpowers/` 继续保留当时的决策记录，不被改写为当前状态。

**Tech Stack:** Markdown、Mermaid、Vite、React、TypeScript、Express、FastAPI、pnpm、Docker Compose、GitHub Actions、Vitest、Playwright、Python unittest。

## Global Constraints

- 不创建或使用新的 Git worktree；在当前工作区完成文档工作。
- `docs/PROJECT_SPEC.md` 的所有事实必须能追溯到当前代码、配置、测试脚本、CI 或现有已核验的持续维护文档。
- 规格书描述当前状态，不把历史计划中的未实施方案写成现状。
- 不修改应用代码、依赖、Docker、CI、测试和既有历史计划/设计。
- 不新增未经代码证实的部署、监控、外部依赖或安全能力。
- 文档须同时面向新开发者、维护者和技术评审；使用中文，必要的命令、路径和标识符保持原样。

---

### Task 1: 采集运行单元、构建和部署事实

**Files:**

- Read: `package.json`
- Read: `vite.config.ts`
- Read: `server.ts`
- Read: `Dockerfile`
- Read: `docker-compose.yml`
- Read: `.github/workflows/quality.yml`
- Read: `python-analytics-service/Dockerfile`
- Read: `python-analytics-service/requirements.txt`

**Interfaces:**

- Consumes: 根配置、容器配置与 CI 工作流。
- Produces: 服务拓扑、端口、构建/启动路径、运行时和自动化质量事实。

- [ ] **Step 1: 提取 Node、pnpm、Python、构建和测试入口**

Run: `node -e "const p=require('./package.json'); console.log(JSON.stringify({engines:p.engines,packageManager:p.packageManager,scripts:p.scripts},null,2))" && cat .nvmrc`

Expected: 得到项目声明的运行时与所有根命令，不从 README 推断。

- [ ] **Step 2: 核验本地服务拓扑和容器边界**

Run: `sed -n '1,240p' vite.config.ts && sed -n '1,260p' server.ts && cat Dockerfile && cat docker-compose.yml`

Expected: 确认浏览器、Express BFF、FastAPI、端口、反向代理和容器构建上下文。

- [ ] **Step 3: 核验 CI 的触发与质量步骤**

Run: `cat .github/workflows/quality.yml`

Expected: 确认 Node 和 Python job、运行版本、依赖安装、浏览器安装和命令。

### Task 2: 采集模块、领域边界与数据流事实

**Files:**

- Read: `src/App.tsx`
- Read: `src/features/map/state/MapStateContext.tsx`
- Read: `src/state/UIStateContext.tsx`
- Read: `src/services/`
- Read: `server/`
- Read: `contracts/`
- Read: `python-analytics-service/app/`
- Read: `python-analytics-service/analytics/`

**Interfaces:**

- Consumes: 前端状态域、Service 边界、BFF 路由、跨语言契约与 Python 应用分层。
- Produces: 可绘制的逻辑架构、模块职责、数据流和不可跨越的边界。

- [ ] **Step 1: 归纳前端组合和状态归属**

Run: `sed -n '1,260p' src/App.tsx && rg -n 'createContext|Provider|use.*State|activeView|activeModal' src/features/map src/state`

Expected: 明确 App、地图状态域、UI 状态域与局部组件状态的职责。

- [ ] **Step 2: 归纳浏览器、BFF 和 Python 的请求边界**

Run: `rg -n 'fetch\(|apiClient|VITE_PYTHON_API_URL|router|app\.(get|post)|APIRouter|include_router' src/services server python-analytics-service/app`

Expected: 确认浏览器到 BFF、浏览器到 Python、BFF 到外部 Provider 的路径与职责。

- [ ] **Step 3: 核验共享契约和解析策略**

Run: `find contracts -maxdepth 2 -type f -print && rg -n 'unknown|parse|Contract|analytics-hazard-data' src/services tests python-analytics-service/tests`

Expected: 明确 JSON fixture、TypeScript 运行时解析、Python Pydantic 和跨语言测试的关系。

### Task 3: 采集安全、可靠性和 AI 会话治理事实

**Files:**

- Read: `server/security/`
- Read: `server/ai/`
- Read: `src/services/http/`
- Read: `src/services/ai/`
- Read: `src/utils/aiAssistant.ts`
- Read: `python-analytics-service/app/core/`
- Read: `python-analytics-service/security.py`

**Interfaces:**

- Consumes: BFF 安全中间件、Provider 路由、流式会话状态、HTTP 错误契约和 Python 管理边界。
- Produces: 密钥、鉴权、限流、错误、日志、SSE 和取消语义的准确规则。

- [ ] **Step 1: 核验 BFF 安全与外部访问控制**

Run: `rg -n 'authorization|allowlist|rate|timeout|sanitize|redact|token|cors' server server.ts`

Expected: 描述已实现的入口保护和明确的运行范围，不扩大为生产网关能力。

- [ ] **Step 2: 核验流式会话状态机与 Provider 策略**

Run: `rg -n 'AbortController|cancel|retry|stream|SSE|provider|history' src/services/ai src/utils/aiAssistant.ts server/ai tests/ai-stream.test.ts tests/component/ai-chat-assistant.test.tsx`

Expected: 描述取消、失败终态、隔离、重试、历史预算与 Provider 降级的实际行为。

- [ ] **Step 3: 核验 Python 错误、日志、管理和 CORS 规则**

Run: `rg -n 'LOG_LEVEL|request_id|admin|CORS|error|exception|metrics|cache' python-analytics-service/app python-analytics-service/security.py python-analytics-service/log_config.py`

Expected: 描述公开与管理接口边界、日志分级、错误语义和配置来源。

### Task 4: 撰写并复核项目规格书

**Files:**

- Create: `docs/PROJECT_SPEC.md`
- Read: `README.md`
- Read: `python-analytics-service/README.md`
- Read: `docs/TESTING_BASELINE.md`
- Read: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Read: `AGENTS.md`

**Interfaces:**

- Consumes: Tasks 1--3 的代码事实与已有持续维护文档。
- Produces: 一份当前工程规格书，作为开发、维护和技术评审入口。

- [ ] **Step 1: 写入规格书结构与系统总览**

Create `docs/PROJECT_SPEC.md` with: 项目定位、非目标、当前状态、术语、系统上下文、Mermaid 拓扑图、技术栈和目录地图。

- [ ] **Step 2: 写入运行单元与架构约束**

Document: 前端、Express BFF、FastAPI、外部数据源、AI Provider、构建和 Docker 边界；说明浏览器不能接收服务端密钥，Python 分析请求不经 BFF。

- [ ] **Step 3: 写入模块分层与领域规则**

Document: React feature/state/UI 责任，Service 的 `unknown` 解析边界，BFF 路由和安全责任，Python app/core/routes/schemas/services/analytics 分层，跨语言契约和测试责任。

- [ ] **Step 4: 写入质量、开发和演进规则**

Document: 根命令、测试层级、CI、已知受限环境、TDD、worktree、子智能体、提交规则、当前不部署状态、遗留风险和后续原则。

- [ ] **Step 5: 执行格式与事实复核**

Run: `pnpm exec prettier --write docs/PROJECT_SPEC.md && pnpm run format:check && git diff --check`

Expected: 规格书格式正确，无差异空白错误；逐节交叉核验命令、端口、模块和安全描述。
