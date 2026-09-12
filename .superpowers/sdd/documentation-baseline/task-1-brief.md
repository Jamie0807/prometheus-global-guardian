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
