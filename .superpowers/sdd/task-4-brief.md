### Task 4: 文档状态、全量验证与整体复核

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/superpowers/specs/2026-09-11-hazard-http-boundary-types-design.md`
- Modify: `docs/superpowers/plans/2026-09-11-hazard-http-boundary-types.md`

**Interfaces:**

- 不新增运行时接口；优化清单将“Hazard/HTTP”前端边界范围标记为已完成，跨语言契约同步保持后续项。

- [ ] **Step 1: 更新完成状态与实际测试证据**

在优化清单的当前判断、优先级矩阵和已完成优化项中，把本批实现明确为“Hazard/HTTP 前端边界已完成”；保留“跨语言模型同步与 Python 契约测试统一门禁”待治理。设计稿状态改为“已实施并通过验证”，实施计划复选框与执行记录仅在实际完成后更新。

- [ ] **Step 2: 执行项目质量门禁**

依次运行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:contracts
pnpm run typecheck:server
pnpm run test:services
pnpm run test:component
pnpm run build
git diff --check
```

预期：所有命令退出码为 0。另运行 `pnpm test`；若仍因沙箱禁止监听 `0.0.0.0` 导致 BFF 测试出现 `EPERM`，记录该环境限制与已通过的非监听测试，不能宣称全量测试通过。

- [ ] **Step 3: 最终整体复核**

检查所有 `requestJson` 调用点均处理 `unknown`，所有 Hazard Service 成功响应都经过解析器；检查 diff 不含凭据、响应正文、构建产物或 `.superpowers/sdd/progress.md`。复核失败时定位根因并修复后仅重跑受影响命令，再执行 `git diff --check`。
