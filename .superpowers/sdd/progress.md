# P0：统一 API 和 Service 层

## 全局约束

- 计划和进度记录使用中文。
- 使用子智能体驱动开发：每个任务由独立实现子智能体完成，并经过任务级复核。
- 不自动执行 `git add`、`git commit` 或 push；提交必须等待用户明确要求。
- 保留当前工作区中与本任务无关的既有未提交变更。

## 进度

- [x] 计划复核：已确认采用兼容迁移方案。
- [x] 项目治理：已新增 `AGENTS.md`、Prettier、commitlint、`pnpm commit`、Husky 和 pnpm 锁文件。
- [x] 任务 0：已补充 BFF 可测试工厂、服务端 DisasterAware 凭据和 token 刷新测试。
- [x] 任务 1：统一 HTTP 客户端和错误契约，7 个 Service 测试通过。
- [x] 任务 2：迁移鉴权和灾害数据服务；浏览器不再读取 DisasterAware 凭据或真实 token。
- [x] 任务 3：迁移 Python Analytics 服务；保留原有导出并增加格式化测试。
- [x] 任务 4：迁移 AI 服务和剩余调用方；网络/Demo 在 Service，UI helper 在 utils。
- [x] 任务 5：收口兼容层、文档和完整回归验证。

## 复核记录

实现复核：兼容 facade 保留在 `src/api`，组件已迁移到 Service 入口；Service 测试 17 个用例、BFF 测试 29 个用例全部通过。`pnpm run lint` 通过且无 error，`pnpm run format:check`、客户端/服务端类型检查、`pnpm run build` 和 `git diff --check` 均通过。子智能体在本轮因平台并发额度不可用，改由主会话按同一计划完成实现和本地复核。
