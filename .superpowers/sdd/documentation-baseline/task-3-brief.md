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
