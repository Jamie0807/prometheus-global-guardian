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

## 2026-09-15 监控交互、分析与可读报告

- [x] Task 1：首页布局和筛选控件；任务级规格与质量复核通过，组件 70/70、客户端类型检查和 Node 20 E2E 冒烟 1/1 通过。
- [x] Task 2：Mapbox 聚合与单点 Popup；异步展开回调的清理后失效保护补齐，任务级规格与质量复核通过，组件 74/74、客户端类型检查和 Prettier 通过。
- [x] Task 3：分析响应诊断与路由回归。以页面当前 100 条数据和 Docker Python 3.13 服务实测统计、预测、风险接口均返回可解析的 200 成功响应；新增代表性灾害的三条核心 FastAPI 路由成功信封回归。固定跨语言响应样本仍保留为 P2。
- [x] Task 4：AI 首包等待态与 HTML 报告。首个非空分片前不创建助手消息；报告改为安全、可打印的 HTML，Service 179/179 与组件 75/75 通过。
- [x] Task 5：项目文档、协作规则与完整验证。README、优化清单、规格与英文提交主题规则已同步；BFF 74/74、Python 40/40、E2E 1/1、类型检查、构建、格式和 lint 通过。

前端边界类型治理第二阶段最终复核：8 个其余 Analytics 接口均已迁移到 `unknown` 后运行时契约解析；最终复核无 Critical/Important。lint、格式检查、合同/客户端/服务端类型检查、Service 139 项、组件 51 项和构建通过；根目录 `pnpm test` 的 34 个 BFF 用例在当前沙箱因禁止监听 `0.0.0.0` 报 `EPERM`，与本次改动无关。

## 2026-09-19 统一灾害事件与图层注册表

- [x] Task 1：共享事件模型、图层注册表和跨语言样本；17/17 定向测试、客户端/服务端类型检查通过，任务级复核 Approved，Minor 仅为注册表完整性测试可增强。
- [x] Task 2：四个 BFF 数据源 canonical 适配；canonical 测试 4/4、服务测试 215/215，任务级复核与修复后复核均 Approved；Node 24 engine warning 作为环境 Minor 保留。
- [x] Task 3：浏览器 Hazard 契约、Worker 和地图转换；服务/适配器/地图测试 32/32、MapView 17/17、客户端类型检查通过，任务级复核与修复后复核均 Approved；Worker 缺少独立运行时测试作为非阻塞建议保留。
- [x] Task 4：Analytics 输入和 Python 跨语言契约；TS 41/41、Python 55/55、服务测试 234/234，修复后任务级复核 Approved；canonical 显式 null 在两端统一拒绝，字段省略保持兼容。
- [x] Task 5：质量检查和 AI 灾害上下文；BFF 88/88、服务 235/235、组件 84/84、Python 56/56，修复后任务级复核 Approved；旧 source fallback 和 prompt 敏感样本清洗已验证。
- [x] Task 6：文档、格式清单和完整验收；仅修改允许的文档/配置文件，BFF 88/88、Service 235/235、组件 84/84、E2E 1/1、Python 56/56，类型检查、Lint、格式、构建和 diff 检查通过；最终整体复核 Approved。

## 2026-09-19 数据源健康检查与新鲜度

- [x] Task 1：5 分钟进程内健康注册表；注册表测试 10/10、服务端类型检查、定向 ESLint 和 diff 检查通过，任务级复核 Approved；未来时间戳、无效日期和固定窗口参数作为非阻塞 Minor 记录。
- [x] Task 2：BFF 来源加载与 `meta.sources[]` 健康快照；修复公共源 HTTP 200 错误形状后 BFF 92/92、健康注册表 10/10、类型检查、Lint、格式和 diff 检查通过，修复后复核 Approved；Node 24 engine warning 为环境提示。
- [x] Task 3：事实文档同步与完整验收；BFF 92/92、Service 235/235、组件 84/84、E2E 1/1、Python 56/56，Node 全基线、类型、Lint、格式、构建及 diff 检查通过。实现子智能体因平台 usage limit 中断，文档任务由主会话接手完成；任务 1/2 已独立复核，最终整轮独立复核受同一额度限制，主会话完成差异与门禁验收。

## 2026-09-23 持久化运维

- [x] Task 1：备份工件与保留窗口纯逻辑；提交 `7159e9f..938601f`，任务级复核通过。
- [x] Task 2：PostgreSQL 备份生成与七天清理命令；提交 `99bb2e1..aa4f705`，任务级复核通过。
- [x] Task 3：恢复演练与数据库健康检查；提交 `8781584..c26c392`，三轮任务级复核收敛后通过，定向测试 27/27。
- [x] Task 4：运维手册、测试基线和优化清单更新；提交 `37a9174`，格式检查和差异检查通过。
- [x] Task 5：最终整体验证与代码复核；客户端/服务端/契约类型检查、构建、格式、lint、Service 272/272、持久化定向 30/30 及隔离 Docker 全流程通过，最终复核问题已修正。

## 2026-09-24 运行单元与共享包架构治理

- [x] Task 1：建立 pnpm workspace 和共享包骨架；新增 `@pgg/contracts`、`@pgg/hazard-domain`、架构检查器基础入口和边界测试，任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 2：迁移四个跨语言 JSON 契约到 `packages/contracts/`；内容哈希保持一致，TypeScript 47/47、Python 57/57、格式检查和差异检查通过，任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 3：迁移灾害领域实现到 `packages/hazard-domain/`，旧 `shared/hazards/` 保留兼容 re-export；受影响服务测试 84/84、组件测试 31/31、类型检查、lint、格式检查、架构检查和构建通过，任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 4：扩展 `check:architecture`，加入共享包依赖方向、兼容入口和元数据错误检查，并接入 baseline 与 CI；架构测试 9/9、架构检查、类型检查、格式检查和 lint 通过，任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 5：README、优化清单和测试基线已对齐第一阶段实际结构；Task 5 阶段的架构检查、lint、格式、三项类型检查、Service 287/287（单 worker）、组件 108/108、Python 57/57、构建及差异检查通过。最终复核又补强了根 BFF 扫描和 TypeScript AST 导入解析，最新架构边界测试 14/14、四个定向测试文件 64/64、架构检查、格式和差异检查通过。BFF 全量测试受本机 `argon2` 段错误阻断，E2E 受全局 pnpm 与 Node 20 版本冲突阻断，证据及分类见 `task-5-report.md`。临时 `.venv` 链接已移除；第二阶段 Web/BFF/Python 物理迁移及兼容入口移除仍待完成，所有实现保持未提交。

## 2026-09-24 Web 运行单元物理迁移

- [x] Task 1：新增 `apps/web` 入口、Vite root/output、根 `src` 清理和 Web 依赖方向的迁移前 RED 测试；任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 2：将根 `index.html` 与 `src/` 迁移到 `apps/web/`，更新 Vite 根输出、共享领域包导入、TypeScript/ESLint/type-test 范围和 lockfile；客户端类型检查、构建、lint、格式及差异检查通过，任务级复核 Spec ✅、Task quality Approved；架构扫描与测试导入留给后续任务；实现保持未提交。
- [x] Task 3：将 34 个 Service/组件测试文件中的 168 处浏览器实现引用迁移到 `apps/web/src`，保留根 tests、BFF 路径和测试命令；组件 108/108、契约类型检查、lint、格式和差异检查通过，任务级复核 Spec ✅、Task quality Approved；Service 剩余 Prisma 生成文件和 Task 4 架构门禁阻塞已记录；实现保持未提交。
- [x] Task 4：扩展 `check:architecture` 扫描 `apps/web`，拒绝服务端/Python/数据库/共享包内部路径并检查根 `src` 残留；架构边界 36/36、架构检查、服务端类型检查、完整构建和差异检查通过，任务级复核 Spec ✅、Task quality Approved；兼容 re-export 测试仍有既有断言覆盖不足的 Minor，已记录待最终复核；实现保持未提交。
- [x] Task 5：同步 README、项目规格、测试基线和待优化清单，完成 Web 迁移整体验收；lint、格式、三项类型检查、架构 36/36、组件 108/108、Service 310/310 已收集用例和构建通过；E2E/BFF 收集受未设置 `DATABASE_URL` 阻断，本机 Python 受依赖缺失阻断，均已记录；最终复核发现并修复 Vite 根 `.env` 读取的 `envDir` 回归，复核最终 Ready to merge；实现保持未提交。

## 2026-09-25 聊天历史与上下文压缩

- [x] Task 1：移除前端长期记忆入口、管理组件、服务和样式，新增按钮/管理区域不渲染回归测试；组件测试 109/109、客户端类型检查、lint、格式检查和差异检查通过；任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 2：移除 BFF 长期记忆注入，保留同会话摘要与 48 KiB 裁剪，固定 `conversationSummary` 契约并接入上下文测试；上下文 3/3、Service 328/328、Provider Node 测试 21/21、类型检查、lint、格式检查和差异检查通过；二次任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 3：同步 README 与当前项目规格，删除当前文档中的长期记忆确认、记忆建议和 `/api/ai/memories*` 表述，补充聊天记录自动保存、同会话摘要压缩与跨会话隔离；文档检索、Prettier 和差异检查通过；任务级复核 Spec ✅、Task quality Approved；实现保持未提交。
- [x] Task 4：完成引用扫描、定向测试、类型检查、lint、格式检查、组件测试、构建和差异检查；核心定向测试通过，`test:unit` 的 4 项数据库测试因缺少 `DATABASE_URL` 阻塞，已如实记录；Task quality Approved，最终复核备注摘要持久化缺少数据库动态证据；实现保持未提交。
- [x] 最终复核修正：摘要纳入 48 KiB 预算，补齐创建/切换/删除/重载会话竞态保护，更新 API 概览 catch-all 并增加 deferred 回归测试；BFF 4/4、组件 14/14、Service 329/329、组件 115/115、类型检查、lint、格式和差异检查通过；修正任务级复核无 Critical/Important，CAS 与数据库动态回归保留为后续边界；实现保持未提交。
- [x] 最终复核收口：增加会话列表刷新 generation，覆盖新建、删除及连续迟到刷新；最新组件测试 17/17、全量组件 118/118、Service 329/329、Provider Node 21/21、上下文 4/4、类型检查、lint、格式、构建和差异检查通过；最终整体复核 Approved，无 Critical/Important；数据库动态回归、摘要 CAS和README历史测试数字作为后续边界。

## 2026-09-25 Workflow 结构化结果显示修复

- [x] 修复 BFF 仅读取 Workflow `outputs.result` 导致偶发只显示标题的问题；现在合并摘要、风险等级、关键发现、行动建议、来源和限制字段，并覆盖 JSON/SSE 两条路径；新增回归测试 2 项，BFF 定向测试 43/43、Service 329/329、服务端类型检查、lint、格式、构建和差异检查通过；Docker `web` 镜像已重建并健康启动。

## 2026-09-25 Workflow 结果可读性修复

- [x] 按字段类型规范化 Workflow 结构化结果：行动建议统一从 1 编号并清除上游自带编号，隐藏 `type`、`message`、`recommendation` 等内部键；关键发现仅展示标题及中文灾害/严重程度标签，过滤 sourceId、layerId、timestamp 等原始事件元数据；新增 3 项回归测试，ai-stream 测试 14/14、Service 329/329、服务端类型检查、lint、格式检查和 diff 检查通过；Docker `web` 已重建并通过 `/health` 验证。
- [x] 继续修复 Workflow 完整 `result` 与结构化字段重复渲染、建议保留上游序号以及关键发现重复的问题：结构化字段存在时只保留 `result` 概述，结构化章节由 BFF 重建；关键发现按用户可见文本去重；新增 3 项回归测试，ai-stream 测试 17/17、Service 329/329、lint、格式检查和 diff 检查通过；Docker `web` 已再次重建并通过 `/health` 验证。
- [x] 定位并修复前端独立 `<li>` 导致不同列表共享序号的问题：关键发现和优先行动建议现在分别渲染在 `<ul>` / `<ol>` 中；新增组件回归测试，组件 119/119、客户端类型检查、lint、格式检查和 diff 检查通过；Docker `web` 已重建并通过 `/health` 验证。

## 2026-09-26 Workflow 聚合统计口径修复

- [x] 修复灾害数量问答把 `recent` 代表样本（最多 8 条）误当作全量事件的问题：BFF 现在明确注入全量总数与各类型聚合数量，要求 Workflow 统计时使用 `byType`，而 `recent` 仅用于展示代表事件；Provider 回归测试 22/22、Service 329/329、lint、格式、客户端/服务端类型检查和 diff 检查通过。
