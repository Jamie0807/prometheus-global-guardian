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
- [x] P0 Analytics 契约第一阶段：统一前端字段、4D 请求体和 Python Pydantic 模型，提交为 `fe07f08`。
- [x] P0 Analytics 契约第二阶段：增加 FastAPI `TestClient` HTTP 路由契约测试，覆盖五个 4D 路由的 2xx/422 行为；本阶段保持未提交。
- [x] 前端边界类型治理 Task 1：共享边界守卫和契约错误，任务级复核通过；实现保持未提交。
- [x] 前端边界类型治理 Task 2：统计、预测、风险契约及核心 UI 迁移，任务级复核通过；实现保持未提交。
- [x] 前端边界类型治理 Task 3：质量、4D 和第三方事件边界，任务级复核通过；实现保持未提交。
- [x] 前端边界类型治理 Task 4：受控规则、类型反例、回归与清单收口，最终整体复核通过；实现保持未提交。
- [x] 前端边界类型治理第二阶段 Task 1：服务信息、质量历史和 JSON 记录守卫；真实 snake_case 历史契约修复后经两轮任务级复核通过，49 项定向测试通过；实现保持未提交。
- [x] 前端边界类型治理第二阶段 Task 2：ETL 与统一模型响应契约；来源比较分数范围修复后经两轮任务级复核通过，59 项定向测试通过；实现保持未提交。
- [x] 前端边界类型治理第二阶段 Task 3：综合分析响应契约；52 个领域契约和 20 个 Service 测试通过，最终整体复核覆盖并通过；实现保持未提交。
- [x] 前端边界类型治理第二阶段 Task 4：Pivot 查询与汇总契约、类型反例和优化清单；任务级及最终整体复核通过，Service 测试 139 项通过；实现保持未提交。
- [x] Hazard/HTTP 边界类型治理 Task 1：通用 JSON `unknown` 边界、`invalid_response` 与授权响应契约；任务级复核通过，定向测试 13 项通过，客户端类型检查待后续 Hazard Service 迁移解除阻塞；实现保持未提交。
- [x] Hazard/HTTP 边界类型治理 Task 2：BFF Hazard feed 契约与公开源逐条解析；任务级复核通过，定向测试 14 项通过，客户端类型检查待 Task 3 清除旧泛型调用；实现保持未提交。
- [x] Hazard/HTTP 边界类型治理 Task 3：DisasterAware 类型与活动灾害响应契约；任务级复核通过，相关测试 29 项与客户端类型检查通过；最终复核跟踪“活动灾害顶层非数组服务降级”测试补强建议；实现保持未提交。
- [x] Hazard/HTTP 边界类型治理 Task 4：治理清单、规格和实施计划收口；最终复核修复 BFF GDACS 空描述兼容性，规格/计划/清单验证证据同步，最终复核无 Critical/Important；实现保持未提交。
- [x] 前端状态归属梳理 Task 1：MapStateProvider 收口灾害数据、筛选、地图样式、来源元信息和刷新；任务级复核无 Critical/Important，记录筛选取消后陈旧响应可见状态断言的 Minor，待最终复核确认。
- [x] 前端状态归属梳理 Task 2：UIStateProvider 收口页面与弹窗判别式状态，组件改为直接消费领域状态；复核发现的 ESLint/Prettier 问题已修复，定向 7 项测试、ESLint、Prettier 和 diff 检查通过；Analytics 返回地图和报告下载的组合回归由 Task 3 覆盖。
- [x] 前端状态归属梳理 Task 3：App 仅保留授权、Provider 组合和渲染选择；地图更新通知迁入地图状态域，组合测试覆盖真实状态域、Analytics 返回、报告表单保留与 JSON 下载、AI 草稿保留；最终复核问题已修复。
- [x] 前端状态归属梳理 Task 4：最终整体复核无 Critical/Important/Minor；lint、格式、三项类型检查、177 项 Service、59 项组件、39 项 Python、构建与 diff 检查通过。根级 BFF 测试仍受受限沙箱 `listen EPERM` 影响（74 项中 40 通过、34 受端口限制失败）。

## 复核记录

实现复核：兼容 facade 保留在 `src/api`，组件已迁移到 Service 入口；Service 测试 17 个用例、BFF 测试 29 个用例全部通过。`pnpm run lint` 通过且无 error，`pnpm run format:check`、客户端/服务端类型检查、`pnpm run build` 和 `git diff --check` 均通过。子智能体在本轮因平台并发额度不可用，改由主会话按同一计划完成实现和本地复核。

第二阶段复核：Python `unittest` 共 17 项通过，其中 7 项通过 FastAPI `TestClient` 验证 HTTP 路由；根目录格式、Lint、双端类型检查和 build 通过，提权后 `pnpm test` 的 BFF 29 项与 Service 21 项全部通过。剩余跨语言共享契约、Python 测试统一 CI 接入和算法边界覆盖仍是后续工作。

前端边界类型治理第二阶段最终复核：8 个其余 Analytics 接口均已迁移到 `unknown` 后运行时契约解析；最终复核无 Critical/Important。lint、格式检查、合同/客户端/服务端类型检查、Service 139 项、组件 51 项和构建通过；根目录 `pnpm test` 的 34 个 BFF 用例在当前沙箱因禁止监听 `0.0.0.0` 报 `EPERM`，与本次改动无关。
