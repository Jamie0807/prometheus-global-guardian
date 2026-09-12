# README 恢复式完善实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 恢复根 README 的完整项目说明，并逐条同步当前代码事实。

**Architecture:** 从 `b6a2b8d:README.md` 恢复中英双语章节和有价值内容，再以当前 `main` 的配置、路由、测试、状态域和 Python 服务为准修订。

**Tech Stack:** Markdown、pnpm、Docker Compose、Vite、Express、FastAPI。

## Global Constraints

- 只修改根目录 `README.md` 与本任务规格/计划记录。
- 不改动 `python-analytics-service/README.md`、产品代码、Docker 或 CI。
- 继续保留中英双语，不写入真实凭据、部署承诺或失真功能。
- 不自动提交或暂存。

---

### Task 1: 恢复并修正完整根 README

**Files:**

- Modify: `README.md`

**Consumes:** `b6a2b8d:README.md`、`package.json`、`docker-compose.yml`、`.github/workflows/quality.yml`、`src/App.tsx`、BFF 与 FastAPI 路由。

**Produces:** 完整、双语、与当前代码一致的项目 README。

- [ ] **Step 1: 恢复旧版结构与有效信息**

从 `git show b6a2b8d:README.md` 读取原始完整文档，恢复目录、能力、架构、服务拓扑、技术栈、运行、配置、测试、Docker、AI、API、数据源、安全、运行说明和目录章节。删除仅描述历史实施过程的内容。

- [ ] **Step 2: 修正所有当前事实**

将报告改为 JSON；将状态职责更新为 `MapStateProvider`、`UIStateProvider` 和精简后的 App；测试数量更新为 Service 177、组件 59、Python 39；说明未部署、Docker 仅本地启动、BFF 沙箱 `EPERM` 限制。核对端口为 5173、8080、8001，且浏览器直接请求 `/api/v1/*`。

- [ ] **Step 3: 验证文档**

运行：

```bash
pnpm run format:check
rg -n "HTML report|HTML reports|MapStateProvider|UIStateProvider|pnpm run test:python|listen EPERM" README.md
git diff --check
```

预期：格式和 diff 检查通过，检索不含旧 HTML 报告且包含当前状态域、Python 测试和环境限制。

### Task 2: 独立复核

**Files:** 无修改。

- [ ] **Step 1: 对照规格复核**

逐项检查中英一致性、旧信息恢复范围、当前事实、敏感配置边界、测试命令和非部署表述。分类报告 Critical、Important、Minor；发现 Critical 或 Important 时由实现者修复后重审。
