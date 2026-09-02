# 项目待优化清单

## 文档目的

本文档从企业级工程项目的视角，记录 Prometheus Global Guardian 当前最值得优化的方向。重点关注可维护性、架构边界、运行稳定性和交付质量，而不是学习型说明。

## 当前判断

项目已经具备比较完整的产品能力：实时灾害可视化、多源灾害数据聚合、基于 Mapbox 的地理空间渲染、数据分析看板、AI 助手集成，以及 Python 分析服务。

当前主要问题不是功能不够，而是功能已经长起来了，但工程组织方式还比较接近原型项目：

- 前端 UI、Express BFF、Python 分析服务都放在仓库根目录，包边界不够清晰。
- 大组件同时承担渲染、数据请求、数据转换、状态协调和副作用。
- API 已开始收敛到 `src/services`，但 `src/api` 兼容入口和部分旧组件仍需继续迁移。
- 地图渲染逻辑是项目亮点，但目前集中在一个组件里，后续维护和讲解成本较高。
- TypeScript 前端和 Python 分析服务都有分析逻辑，但服务边界还不够明确。
- 前端、BFF 和 Python 服务之间仍存在两套灾害数据字段约定，部分 Analytics/4D 请求当前不能按前端意图执行。
- BFF 已经具备认证、代理和 AI 路由能力，但公开代理、请求体、频率和错误边界还没有形成安全契约。
- 质量门禁已覆盖 BFF、Service、lint、格式、类型检查和 build；React 组件、E2E、Python 核心算法和 API 契约测试仍待补齐。

## 开发与交付约束

后续每个需求都遵循以下项目级约束：

- 新增或重构的前端、BFF 代码统一使用 TypeScript；Python 分析服务继续使用 Python，不新增同职责 JavaScript 文件。
- 涉及 AI provider、BFF 或服务端请求时，先确认 TypeScript、测试和构建配置完整，敏感凭据只能由服务端读取。
- 每个需求开始前使用 Superpowers 流程完成上下文探索、方案设计、测试策略和验证；涉及新功能或行为变化时遵循测试驱动开发。
- 每个需求完成后同步更新本文档，记录状态、实现内容、验证结果和遗留风险。

## 优先级矩阵

| 优先级 | 优化领域                          | 状态   | 影响                                                   | 建议时机 |
| ------ | --------------------------------- | ------ | ------------------------------------------------------ | -------- |
| P0     | 地图模块拆分                      | 待开始 | 提升核心模块可维护性和性能可信度                       | 第一批   |
| P0     | 分析页面拆分                      | 待开始 | 降低最大组件维护成本                                   | 第一批   |
| P0     | API / Service 层统一              | 已完成 | 提升稳定性和排查效率                                   | 第一批   |
| P0     | AI 助手智能路由                   | 已完成 | 由 LLM 判断普通模型与 RAG 工作流调用边界               | 第一批   |
| P0     | BFF TypeScript 化                 | 已完成 | 统一项目技术栈，降低 JavaScript 与 TypeScript 混用成本 | 第一批   |
| P0     | 统一灾害数据与 Analytics API 契约 | 待开始 | 修复分析字段丢失、4D 请求 422 和筛选参数失效           | 第一批   |
| P0     | BFF 代理暴露面与请求边界治理      | 待开始 | 防止任意上游代理、请求体耗尽、鉴权滥用和敏感头转发     | 第一批   |
| P0     | 地图外部数据输出安全              | 待开始 | 防止灾害源文本通过 Mapbox Popup 注入 HTML              | 第一批   |
| P0     | 报告下载闭环                      | 待开始 | 让“Save Report”从表单提交真正产出符合承诺的报告文件    | 第一批   |
| P1     | 前端状态归属梳理                  | 待开始 | 降低耦合和无效重渲染                                   | 第二批   |
| P1     | Python 服务结构整理               | 待开始 | 提升后端服务可维护性                                   | 第二批   |
| P1     | Python API 契约与分析可靠性       | 待开始 | 让请求模型、缓存指标、错误语义和算法结果可验证         | 第二批   |
| P1     | 外部数据源时效性与韧性            | 待开始 | 提升刷新稳定性、降级可见性和数据新鲜度                 | 第二批   |
| P1     | AI 流式会话生命周期治理           | 待开始 | 支持取消、输入限额、断流处理和成本控制                 | 第二批   |
| P1     | 前端测试体系                      | 进行中 | 覆盖组件行为、页面交互和视觉回归，降低前端改动风险     | 第二批   |
| P1     | 测试基线建设                      | 进行中 | 提升交付信心                                           | 第二批   |
| P1     | CI/CD 与质量门禁接入              | 待开始 | 让本地校验在合并前可重复执行                           | 第二批   |
| P2     | 仓库 / 包结构调整                 | 待开始 | 长期可扩展性                                           | 后续     |
| P2     | 依赖清理                          | 待开始 | 构建和依赖治理                                         | 后续     |
| P2     | 可观测性和错误上报                | 待开始 | 生产可用性                                             | 后续     |
| P2     | 可访问性与多语言界面              | 待开始 | 提升键盘、读屏、移动端和双语使用体验                   | 后续     |
| P2     | 前端包体积预算与分包治理          | 待开始 | 降低 Mapbox、deck.gl 和图表依赖对首屏的影响            | 后续     |
| P2     | 前端边界类型治理                  | 待开始 | 减少 `any`，让 API 响应变化尽早暴露                    | 后续     |

## 已完成优化项

| 优化项                | 状态   | 结果                                                                                    |
| --------------------- | ------ | --------------------------------------------------------------------------------------- |
| Docker 一键启动前后端 | 已完成 | 通过 Docker Compose 同时启动 Web / Express BFF 和 Python FastAPI 分析服务               |
| AI 助手 BFF 化改造    | 已完成 | 通过 Express BFF 统一封装 ai-workflow 与火山方舟模型调用，前端只消费 `/api/ai/chat`     |
| AI BFF TypeScript 化  | 已完成 | 服务端源码统一为 TypeScript，编译到 `dist-server` 后由生产环境启动                      |
| API / Service 层统一  | 已完成 | 增加统一 HTTP 错误契约，完成鉴权、灾害、Analytics、AI Service 拆分，并保留 API 兼容入口 |

### Docker 一键启动前后端

已落地 Docker Compose 编排能力：

- `docker-compose.yml` 编排 `web` 和 `analytics` 两个服务。
- 根目录 `Dockerfile` 使用多阶段构建，先构建前端产物，再启动 Express 服务。
- `python-analytics-service/Dockerfile` 使用 Python 3.13 运行 FastAPI 分析服务。
- `.dockerignore` 排除本地依赖、构建产物和环境变量文件。
- `.env.example` 增加 Docker 场景下 `VITE_PYTHON_API_URL` 的说明。
- README 已补充 Docker 启动、停止、日志查看和健康检查说明。
- README 英文和中文的“本地开发”章节已集中说明前端开发模式和 Docker 全栈一键启动方式，避免启动命令分散。

验证结果：

- `docker compose build` 可以完成镜像构建。
- `docker compose up -d` 可以启动前端、BFF 和 Python 分析服务。
- `http://localhost:8080` 返回 Web 首页。
- `http://localhost:8001/health` 返回 Python 服务健康状态。
- `pnpm run build` 通过。
- `pnpm run lint` 退出码为 0，但仍保留既有 warning。

### AI 助手 BFF 化改造

已将 AI 助手从“前端直连模型服务”调整为“前端调用项目 BFF，再由 BFF 按 `AI_PROVIDER` 调用 ai-workflow 或火山方舟”：

```text
AIChatAssistant
  -> POST /api/ai/chat
  -> Express BFF
  -> ai-workflow / Volcengine Ark Responses / Chat Completions API
```

已落地内容：

- `server/ai/ai-provider.ts` 统一读取服务端环境变量 `AI_PROVIDER`、`VOLCENGINE_WORKFLOW_API_URL`、`VOLCENGINE_WORKFLOW_API_KEY`、`VOLCENGINE_ARK_API_KEY`、`VOLCENGINE_ARK_MODEL`、`VOLCENGINE_ARK_API_URL`、`VOLCENGINE_ARK_TIMEOUT_MS`。
- `server/ai/ai-chat-route.ts` 新增 `POST /api/ai/chat`，负责请求校验、provider 调度、错误脱敏和 SSE 流式转发。
- `AI_PROVIDER=workflow` 时，BFF 调用已发布 ai-workflow 应用，按开始节点契约发送 `user_input`、`hazard_context`、`location` 和 `language`，并在 JSON Body 中发送 `stream: true`。
- Workflow provider 同时兼容 SSE 和普通 JSON：SSE 的 `complete.data.outputs.result` 会被转换成前端聊天流格式，普通 JSON 从 `data.outputs.result` 提取回答。
- 当 `VOLCENGINE_ARK_API_URL` 为 `https://ark.cn-beijing.volces.com/api/plan/v3` 时，BFF 自动拼接 `/responses` 并使用 Responses API 请求格式。
- BFF 将 Responses API 的流式增量转换成前端现有 Chat Completions 风格流，前端接口保持不变。
- System Prompt 构建逻辑迁移到 BFF，前端不再承担 provider 请求细节。
- `src/api/aiAssistant.ts` 默认请求 `/api/ai/chat`，未配置模型服务时继续保留 Demo 模式。
- 已删除前端 provider 配置文件 `src/api/aiProviderConfig.ts`，浏览器端不再读取模型服务 Key。
- BFF 增加模型服务响应超时保护，避免上游无响应时前端无限等待。
- Docker Compose 只在 `web` 服务运行时注入服务端 AI 环境变量，不作为前端 build args 注入。
- `.env.example` 和 README 已更新为服务端 AI 配置方式。
- 已新增 `pnpm test`、`tests/ai-provider.test.ts` 和 `tests/ai-stream.test.ts`，覆盖 provider 配置、请求体构造、Responses SSE 转换、Workflow SSE/JSON 结果转换。

验证结果：

- `pnpm test` 通过，当前 BFF 29 个测试和 Service 17 个测试全部通过。
- `pnpm run build` 通过，前端构建产物中未发现已配置的前端旧 Key。
- `pnpm run lint` 退出码为 0，但仍保留既有 warning。
- `docker compose up -d --build` 可以启动 Web / Express BFF 和 Python 分析服务。
- `http://localhost:8080` 返回 Web 首页。
- `http://localhost:8001/health` 返回 Python 服务健康状态。
- `AI_PROVIDER=workflow` 时，Docker 容器内确认 provider 为 workflow，协议为 workflow，并会在请求 Body 中发送 `stream: true`。
- 未配置所选 provider 必要参数时，`POST /api/ai/chat` 返回 503 配置缺失状态，前端会降级到 Demo 模式。

### AI BFF TypeScript 化

已完成 AI BFF 及其运行时依赖的 TypeScript 迁移：

- `server.ts`、`hazards-source.ts`、`server/env.ts` 和 `server/ai/*.ts` 替代原有服务端 JavaScript 文件。
- 新增 `tsconfig.server.json` 和 `tsconfig.server.test.json`，服务端使用 NodeNext ESM 和严格类型检查，输出到 `dist-server/`。
- Node 测试迁移为 TypeScript 源码，先编译再由 Node 执行编译产物。
- `pnpm run build` 同时完成前端和 BFF 构建，`pnpm start` 启动 `dist-server/server.js`。
- Docker runtime 镜像只复制 `dist/` 和 `dist-server/`，不在生产容器内运行未编译源码。
- 新增 `@types/express`，为 Express 请求、响应和 `rawBody` 中间件补充类型声明。

验证结果：

- `pnpm run typecheck:server` 通过。
- `pnpm test` 通过，当前 46 个测试全部通过。
- `pnpm run lint` 通过，保留既有 warning，无新增 error。
- `pnpm run build` 和 Docker Web 镜像构建通过。

遗留风险：

- 仓库其他历史 JavaScript 配置文件仍保留；本次只迁移服务端运行时和 AI BFF，避免扩大改动范围。
- 本机 Node 版本应遵循项目声明的 `>=20.19 <21`，以保持和 Docker runtime 一致。

## AI 助手智能路由计划

当前 AI 助手通过 BFF 中的 LLM Router 判断请求路径：

- 普通闲聊、通用解释和不需要知识库的问题调用火山方舟模型。
- 灾害专业知识、Guardian 规则、历史案例、应急预案和需要 RAG 检索的问题调用已发布 ai-workflow。
- 前端继续只请求 `/api/ai/chat`，不感知具体 provider。
- Router、火山方舟和 ai-workflow 统一由 BFF 编排，API Key 不进入浏览器。
- 已记录路由结果、失败降级策略和每条路径的耗时；后续需要用指标和业务样本持续校准误路由率。

### 实现状态

已完成智能路由和 provider 降级：

- `AI_PROVIDER=router` 为默认模式；`AI_PROVIDER=workflow` 和 `AI_PROVIDER=ark` 保留为强制单 provider 模式。
- `server/ai/ai-router.ts` 根据最新用户消息和实时灾害上下文，将知识库、Guardian 规则、历史案例、应急预案、灾害专业问题和实时态势分析路由到 ai-workflow，其余普通对话路由到火山方舟。
- router 模式下，目标 provider 在响应开始前发生配置缺失、超时、网络错误或非 2xx 响应时，BFF 会尝试另一个已配置 provider；已经开始流式输出后不拼接备用 provider 的结果。
- 每次请求输出结构化路由日志，包含路由原因、最终 provider、是否降级、尝试次数、状态和耗时，不记录用户消息、API Key 或模型响应内容。
- `.env.example`、Docker Compose 和 README 已统一为 router 默认配置，并保留单 provider 调试方式。

验证结果：

- `pnpm test` 通过，当前 BFF 29 个测试全部通过，其中 26 个覆盖路由、provider 和流式适配行为。
- `pnpm run typecheck:server` 通过。
- `pnpm run lint` 退出码为 0，仍保留项目既有 warning。

遗留风险：

- 当前 Router 使用 BFF 内的规则匹配，不额外消耗一次 LLM 请求；后续如需更复杂的语义分类，可替换为独立分类器，但需要重新评估延迟、成本和误路由风险。
- provider 在已经返回流式响应头后才发生的错误只能结束当前流，无法无缝切换到另一个 provider。

## 代码审计新增项（2026-09-03）

本节基于当前工作区全部 TypeScript、React、Python、配置和测试代码整理，包含未提交变更。它记录的是代码已经暴露出的具体缺口，不把已经完成的 API / Service、AI Router、BFF TypeScript 化和 Docker 基础能力重复列为待办。

## P0：统一灾害数据与 Analytics API 契约

### 代码依据

- `src/types/index.ts` 的 `Hazard` 使用顶层 `title`、`timestamp`、`severity`、`source` 和 `magnitude`。
- `src/services/analytics/analyticsService.ts` 的 `formatHazards` 仍主要读取 `h.properties.*`，会把现有扁平数据转换成默认标题、当前时间、`unknown` 严重性和空震级。
- 同一 Service 的 4D 方法发送 `{ data: formattedData }`，而 `python-analytics-service/main.py` 的 `AnalysisRequest` 要求 `hazards`。
- `AnalysisRequest` 没有声明 `time_dim`、`geo_dim`、`time_range`、`regions`、`types`、`severities` 和 `time_window`，这些参数即使传入也不会按接口说明生效。

### 风险

- 统计、预测、风险评估可能基于错误字段运行。
- 4D 透视、趋势和风险评分请求可能直接返回 422，或静默使用默认参数。
- 前后端字段变更无法由类型系统及时发现。

### 建议与验收

- 以一个明确的共享灾害输入契约为准，统一前端顶层 `Hazard`、Python `HazardData` 和原始数据源 adapter 的边界。
- 为 Analytics 请求和响应定义明确的 TypeScript 类型与 Pydantic 模型，禁止用 `data` / `hazards`、camelCase / snake_case 混用的隐式兼容。
- 为每个 4D 接口增加请求契约测试，验证筛选参数确实影响结果；为 `formatHazards` 增加扁平数据回归测试。
- 验收：真实 `Hazard` 的标题、时间、严重性、来源和震级完整到达 Python；4D 五个接口均能返回 2xx，并按请求参数执行。

## P0：BFF 代理暴露面与请求边界治理

### 代码依据

- `server.ts` 的通用 `app.use("/api", ...)` 会把任意 `/api` 路径和请求方法转发到 DisasterAware，并自动使用服务端 token。
- 原始请求体通过 `getRawBody(req)` 读取，没有大小上限；代理转发头部也没有严格白名单。
- `/api/authorize` 会强制刷新上游 token，`/api/ai/chat`、`/api/hazards` 和分析服务入口没有统一限流或滥用保护。
- Python 服务的 `/metrics`、`/cache/clear` 和分析接口可直接访问，CORS、方法和来源策略由静态配置决定。

### 建议与验收

- 对 DisasterAware 代理建立明确 allowlist，只开放产品实际使用的路径和 HTTP 方法；拒绝未知路径、危险方法和异常 query。
- 给 BFF、AI、认证和 Python 分析接口增加请求体/数组/字符串/查询数量限制、限流、超时和必要的来源或身份校验。
- 仅转发允许的请求头，禁止 cookie、代理头和客户端 authorization 影响上游请求；错误响应统一脱敏。
- `/metrics`、缓存管理和运维接口分离为受保护的内部入口；Compose 默认不直接暴露 Python 管理面。
- 验收：超限请求返回明确 4xx；未知代理路径不能访问上游；未授权用户不能清缓存或无限触发 provider / DisasterAware 请求。

## P0：地图外部数据输出安全

### 代码依据

- `src/components/MapView.tsx` 使用 `mapboxgl.Popup().setHTML()`，将灾害源返回的 `title`、`type`、`severity` 和 `description` 直接插入 HTML。
- 这些字段来自外部 DisasterAware、USGS、NASA 和 GDACS 数据，不是本地常量。

### 建议与验收

- 改用 DOM 节点和 `textContent`，或使用经过严格验证的 HTML sanitizer；不要把外部文本直接拼接到 Popup 模板。
- 增加包含标签、属性和恶意 URL 的 adapter / Popup 安全回归测试。
- 验收：外部字段中的 HTML、脚本和事件属性只能按纯文本展示，不能改变 Popup DOM 或执行代码。

## P1：统一请求体、数组长度和数值范围校验

当前仅综合分析接口截断 1000 条数据，其他分析接口和 BFF 没有统一限制；Python `coordinates` 也没有经纬度范围与长度校验，`quality/history` 的 `limit` 直接使用。应统一约束：请求体大小、灾害数组上限、字符串长度、坐标范围、时间窗口、分页 limit 和枚举值，并为边界返回稳定的 4xx 错误契约。

## P1：Python API 契约与分析可靠性

### 当前缺口

- `python-analytics-service/main.py` 将路由、Pydantic 模型、缓存、指标和业务调度放在同一文件。
- `cache_response` 装饰器已定义但没有应用到分析路由；`/metrics` 宣称的缓存命中率不能代表实际分析缓存状态。
- 多个接口把 `str(e)` 直接放入响应；算法模块大量捕获宽泛异常并返回空表、默认值或错误字典，调用方难以区分“无数据”“算法失败”和“输入无效”。
- `unified_model.py` 对部分灾害类型使用零阈值或估算 magnitude，当前结果的业务含义和置信度没有统一说明。
- 多个专用分析接口直接在 `async` 路由中执行 Pandas 和模型计算，可能阻塞 FastAPI 事件循环；当前只有综合分析使用线程池并行。

### 建议与验收

- 按 routes / schemas / services / core 拆分 FastAPI，统一错误码、日志字段、request id 和响应模型。
- 要么真正接入并验证缓存，要么删除虚假缓存指标；明确缓存键包含完整输入而不是仅长度、类型和首尾时间。
- 生产响应只返回稳定错误码和用户可理解的消息，详细异常写入受控日志。
- 为空数据、脏数据、缺少 magnitude、无时间序列和模型失败建立确定性测试，并对风险分数、置信度和阈值写出业务定义。
- 为 CPU 密集型分析统一使用线程池或任务队列，限制并发和单请求计算量，并用延迟/吞吐基准验证改造收益。

## P1：外部数据源时效性与韧性

`hazards-source.ts` 的 USGS、NASA、GDACS 请求没有独立 timeout、重试、缓存或 stale 数据策略；前端遇到 DisasterAware 为空时会并行请求公共源，但没有展示各源失败、最后成功时间和数据是否过期。建议增加按数据源的超时/重试/缓存、来源状态和新鲜度元数据，并验证单源故障、部分成功、重复事件和刷新竞态。

## P1：AI 流式会话生命周期治理

- `src/services/ai/aiAssistantService.ts` 直接使用浏览器 `fetch`，没有 `AbortController`；关闭面板或离开页面无法主动取消请求。
- `AIChatAssistant.tsx` 的发送流程没有统一的消息条数、单条长度、上下文大小和并发请求约束。
- 前端 SSE 解析忽略不完整尾部和 malformed chunk，分析页重试也没有请求序列号或卸载保护，旧请求可能覆盖新结果。

建议增加取消、请求序列号、最大上下文、断流重连策略和 provider 成本预算；验收需覆盖关闭面板、网络断开、重复点击、超长消息、旧响应晚到和流式半包。

## P1：前后端错误信息与调试信息分级

生产错误不应把内部异常文本、组件堆栈或上游细节交给用户：`server.ts`、Python 路由和 `ErrorBoundary` 当前仍存在直接回显路径。建议区分用户消息、结构化日志和开发诊断信息，并以 request id 关联日志；验收需确认生产响应不包含文件路径、依赖堆栈、凭据、完整上游响应和用户输入。

## P1：CI/CD 与质量门禁接入

仓库当前没有 `.github/workflows` 或等价 CI 配置；Python 的 `test_service.py` 依赖已运行服务并主要返回布尔值，`test_pivot_table.py` 是打印式脚本，均未进入 `pnpm test`。建议建立 Node 20.19 + pnpm 10.15.1、Python 3.13 的 CI 矩阵，执行 `pnpm run lint`、`pnpm run format:check`、两端 typecheck、`pnpm test`、pytest、build 和依赖/镜像扫描，并上传失败日志、截图或 trace。

## P2：运行时无关文件与仓库卫生

当前工作区可见未被构建使用的 `server 2.ts`，以及 `.superpowers/sdd/` 下的 review diff 和任务快照；根目录同时保留 `package-lock.json` 与 `pnpm-lock.yaml`。应明确哪些是提交资产、临时审查产物和个人本地文件，决定旧副本与双锁文件的保留策略，并在 `.gitignore`、README 和 CI 中固化规则。`server 2.ts` 和 review diff 不应被当作运行入口或项目结构组成部分。

## P2：依赖、镜像和配置持续审计

当前 Docker runtime 仍在镜像内重新安装 pnpm 和生产依赖，前端/BFF/测试依赖也共用一个 `package.json`，依赖大量使用 `^` 范围。建议增加 lockfile 一致性、依赖漏洞、许可证、容器镜像和 secret scanning；明确生产依赖边界并评估 pnpm store / 多阶段缓存策略。

## P2：可访问性与多语言界面

多个 Modal 使用自定义 div 和 inline style，缺少统一 `role="dialog"`、`aria-modal`、焦点陷阱、返回焦点和完整键盘行为；界面同时混用中英文，日期和错误消息也没有统一 locale。建议建立基础无障碍组件和 i18n 资源，覆盖键盘、读屏、移动端布局和中英文快照测试。

## P0：报告下载闭环

`SaveReportModal` 实际下载 JSON，界面提示却写成 HTML；`App.tsx` 的 `handleDownloadReport` 只记录日志。应明确报告格式、导出字段、编码、文件名、敏感数据处理和未来后端存储边界，并以下载内容测试和文档同步为验收标准。

## P1：统一灾害数据入口与来源级状态

当前 Express 已实现 `/api/hazards` 聚合入口，但 `MapView` 仍直接请求 USGS、NASA、GDACS，Service 层又把来源失败统一转换为空数组。建议让地图使用统一聚合入口，保留每个来源的成功/失败、请求耗时、最后成功时间、数据新鲜度和降级原因；验收需覆盖单源失败、部分成功、重复事件、过滤条件和旧数据保留策略。

## P1：实现自动刷新与请求竞态保护

`src/config/index.ts` 配置了 `refreshInterval`，但地图当前只在初始化或手动刷新时请求。地图数据、Analytics 重试和 AI 流式请求都缺少完整的 `AbortController`、卸载清理、请求序列号和过期结果保护。建议统一实现自动刷新、页面隐藏时暂停、手动刷新去重、请求取消和 stale response 丢弃，并为定时器与 Worker 增加生命周期测试。

## P2：前端包体积预算与分包治理

当前 `vite.config.ts` 手动配置了 React、Mapbox、Recharts 和工具分包，但构建仍生成空的 vendor chunk，Mapbox 产物约 1.8 MB，且主要依靠提高 `chunkSizeWarningLimit`。建议按真实依赖图重做 manual chunks，懒加载地图/分析/3D 能力，建立 gzip/raw size budget，并在 CI 中对超预算失败或告警。

## P2：前端边界类型治理

`src/services/analytics/analyticsService.ts`、`AnalyticsPage.tsx`、`ChartsPanel.tsx`、`DataQualityMonitor.tsx` 等仍大量使用 `any[]`、`Promise<any>` 和动态字段。应优先为 Analytics、图表、质量报告、钻取和导出定义稳定的响应类型与类型守卫；保留 `unknown` 只作为外部输入边界，并逐步把 ESLint 的 `no-explicit-any` 从 warning 提升为受控 error。

## P0：拆分地图模块

### 当前状态

`src/components/MapView.tsx` 当前承担了过多职责：

- Mapbox 地图初始化和生命周期管理。
- 灾害数据加载。
- DisasterAware 和备用数据源调度。
- Web Worker 数据清洗。
- DOM Marker 渲染。
- GeoJSON Source 和 cluster 图层初始化。
- Heatmap source 和 layer 更新。
- 3D 建筑、deck.gl overlay 初始化。
- 基于 zoom 的 LOD 可见性切换。

这个文件是项目里最有技术含量的部分之一，但也因此成为维护风险点。

### 建议结构

```text
src/features/map/
  MapView.tsx
  hooks/
    useMapboxInstance.ts
    useHazardData.ts
    useHazardMarkers.ts
    useHazardLodLayers.ts
    useHazardHeatmap.ts
    useDeck3DTiles.ts
  utils/
    hazardGeojson.ts
    mapLayerIds.ts
    mapLod.ts
```

### 目标效果

- `MapView.tsx` 变成组合型组件，只负责拼装地图能力。
- LOD 逻辑独立出来，可以单独测试。
- GeoJSON Feature 生成逻辑变成纯函数。
- DOM Marker 渲染和 WebGL 图层渲染在代码结构上清晰分离。
- Worker 数据清洗封装到 hook 或 service 中。

### 验收标准

- `MapView.tsx` 控制在 220 行以内。
- LOD 图层初始化和 visibility 切换不再写在组件主体里。
- Marker 生命周期有唯一清理路径。
- GeoJSON 生成逻辑有测试，覆盖 id、坐标、颜色、筛选行为。
- 地图样式切换后，自定义图层仍能正确恢复。

## P0：拆分分析页面

### 当前状态

`src/components/AnalyticsPage.tsx` 超过 1,700 行，混合了：

- 页面布局。
- 图表状态。
- 弹窗状态。
- 图表自定义。
- 图表钻取。
- Python 分析服务调用。
- 数据转换。
- 导出和报告行为。

这是前端当前最大的可维护性风险。

### 建议结构

```text
src/features/analytics/
  AnalyticsPage.tsx
  components/
    AnalyticsToolbar.tsx
    AnalyticsSummaryGrid.tsx
    AnalyticsChartSection.tsx
    AnalyticsInsightPanel.tsx
  hooks/
    useAnalyticsData.ts
    useChartCustomization.ts
    useChartDrilldown.ts
  utils/
    analyticsTransforms.ts
    chartSeries.ts
```

### 目标效果

- 页面组件只负责页面级布局和组合。
- 数据转换逻辑变成可测试的纯函数。
- 图表配置状态独立管理。
- 钻取逻辑可以单独修改，不需要触碰整个页面。

### 验收标准

- `AnalyticsPage.tsx` 控制在 300 行以内。
- 数据转换函数有单元测试。
- 图表弹窗组件只接收明确类型的 props。
- Python 分析 API 调用统一走 service 模块。

## P0：统一 API 和 Service 层

### 当前实现状态

本轮已完成统一 Service 层的第一阶段落地：

- `src/services/http` 提供统一 JSON、文本和流式请求、超时、重试及 `ServiceError` 错误契约。
- `src/services/auth` 通过 BFF 管理 DisasterAware 凭据和 token；浏览器不读取用户名、密码或真实 token。
- `src/services/hazards` 集中处理 USGS、NASA、GDACS 和 DisasterAware 请求及数据适配。
- `src/services/analytics` 接管 Python Analytics 请求，并保留原有导出能力。
- `src/services/ai` 接管 AI SSE 请求和 Demo 降级；纯 UI 辅助函数放在 `src/utils/aiAssistant.ts`。
- `src/api` 保留兼容 facade，旧调用方可以渐进迁移到 Service 层。
- `tests/service-*.test.ts` 使用 Vitest 覆盖 HTTP、适配器、Analytics 和 AI Service；BFF 继续使用 Node 原生测试。

验证命令为 `pnpm test`、`pnpm run lint`、`pnpm run format:check`、`pnpm run typecheck:client`、`pnpm run typecheck:server` 和 `pnpm run build`。

遗留风险：Analytics 后端返回字段仍有版本差异，旧分析页面在展示边界使用动态 JSON 类型；后续可随着 FastAPI 响应契约稳定继续细化类型。

### 迁移前问题

前端 API 曾分布在多个文件中，返回结构、错误处理和 provider 适配方式不完全一致，导致 UI 组件需要知道过多外部服务细节。

本轮已完成迁移，当前 `src/api` 仅作为兼容入口保留，业务请求由 `src/services` 负责。

### 已落地结构

```text
src/services/
  http/
    httpClient.ts
    serviceError.ts
  hazards/
    hazardService.ts
    hazardAdapters.ts
  analytics/
    analyticsService.ts
    analyticsTypes.ts
  ai/
    aiAssistantService.ts
  auth/
    authService.ts
```

### 目标效果

- 所有 API 调用使用统一的请求、超时、重试和失败契约。
- provider 特有的数据解析放在 adapter 中。
- UI 组件不直接处理外部 API 的异常结构。
- AI provider 切换继续通过配置驱动。

### 当前遗留项

- Analytics 后端字段仍有一定版本差异，旧分析页面展示边界暂时使用动态 JSON 类型。
- `src/components/AnalyticsPage.tsx` 仍较大，后续由分析页面拆分任务继续处理。

### 验收结果

- 使用统一的 `ServiceError` 和等价的空结果降级策略处理可恢复错误。
- DisasterAware、USGS、EONET、GDACS 的数据映射逻辑已独立。
- AI 助手组件不直接暴露 provider 特有请求细节。
- 网络错误、鉴权失败、响应结构异常已有统一处理方式。

## P1：梳理前端状态归属

### 当前状态

当前重要状态分散在 `App.tsx` 和多个大型子组件中：

- 灾害数据。
- 当前筛选条件。
- 弹窗显示状态。
- 地图渲染状态。
- 分析页状态。
- 通知行为。

目前能工作，但状态职责不够明确。

### 推荐方向

优先抽自定义 Hook，不要一开始就机械引入 Redux、Zustand 或多个 Context。

```text
src/hooks/
  useDisclosure.ts

src/features/hazards/
  useHazardsStore.ts

src/features/ui/
  useAppPanels.ts
```

只有当多个远距离组件确实需要共享同一份可变状态时，再引入 Context 或外部状态库。

### 关于“四个 Context + useReducer”

“灾害数据 / 筛选条件 / UI 状态 / 通知”四个 Context 的方案可以作为一个演进方向，但不建议直接机械落地。

更稳妥的路径：

1. 先抽领域 Hook。
2. 再确认哪里真的存在 props drilling。
3. 只给跨层级共享的状态加 Context。
4. 地图实例、markers、overlays 不进入全局 React 状态。

### 验收标准

- `App.tsx` 只负责顶层页面模式和组件组合。
- 灾害数据的归属清晰。
- 弹窗状态被统一管理。
- 地图实例、Marker 和 overlay 仍由地图专属 Hook 管理。

## P1：整理 Python 分析服务结构

### 当前状态

`python-analytics-service/main.py` 文件较大，混合了 FastAPI 路由、请求模型、响应模型和业务调度逻辑。

### 建议结构

```text
python-analytics-service/
  app/
    main.py
    routes/
      analytics.py
      health.py
    schemas/
      requests.py
      responses.py
    services/
      analytics_service.py
    core/
      config.py
  analytics/
    etl_processor.py
    pivot_table_analyzer.py
    prediction_models.py
    quality_monitor.py
    risk_assessment.py
    statistical_algorithms.py
    unified_model.py
```

### 目标效果

- FastAPI 应用初始化和分析实现分离。
- 请求 / 响应模型可以复用。
- analytics 目录继续专注计算逻辑。
- 服务启动、测试、部署都更清晰。

### 验收标准

- `main.py` 只负责创建 app 和注册 router。
- 路由函数委托给 service。
- 请求和响应模型放在 `schemas` 下。
- 现有接口保持向后兼容。

## P1：建设基础测试体系

### 当前状态

项目现已具备 BFF Node 原生测试和前端 Service 层 Vitest 测试，关键业务逻辑测试基线已经建立；Python 核心算法和 React UI 流程仍未纳入统一门禁。

### 建议优先覆盖

BFF：

- AI provider 请求构造。
- SSE 响应转换。

前端测试体系单独覆盖组件和页面行为，详见下方“前端测试体系”条目。

Python：

- 风险评分。
- 统计摘要。
- 透视表分析。
- 预测模型输入校验。
- 数据质量监控边界情况。

### 验收标准

- 前端增加 `pnpm run test:services`，并由 `pnpm test` 与 BFF 测试统一执行。已完成。
- Python 服务使用 `pytest` 跑核心测试。
- 本地或 CI 验证包含 lint、build、BFF 测试、Service 测试和 Python 测试。
- 核心转换逻辑不依赖浏览器或 Mapbox 就能测试。

## P1：建设前端测试体系

### 当前状态

前端 Service 层已经有 Vitest 单元测试，覆盖统一 HTTP、灾害数据适配、Analytics 格式化和 AI 流式/Demo 降级。React 组件行为、页面交互、浏览器流式流程和不同 viewport 布局仍没有自动化验证，因此该条目目前为进行中。

### 建议优先覆盖

- 使用 Vitest 和 React Testing Library 测试 AI 助手、弹窗、表单、错误状态和 Demo 降级。
- 将灾害 API adapter、灾害筛选、通知触发规则、GeoJSON 生成和分析数据转换等纯函数纳入前端单元测试。
- 使用 Playwright 测试地图首页、AI 助手发送消息、流式响应展示、关键弹窗和路由跳转。
- 对桌面端和移动端执行截图或视觉回归检查，重点关注地图、聊天面板、弹窗和表格布局。
- 为模型 API、灾害 API、Mapbox 和 Python 服务建立可控 mock，避免测试依赖真实外部服务。

### 验收标准

- 增加独立的 `pnpm run test:frontend` 命令，能够执行 React 组件单元测试。
- 增加独立的 `pnpm run test:e2e` 命令，能够启动测试服务并执行 Playwright 浏览器流程。
- AI 助手至少覆盖成功流式响应、请求失败、空响应和 Demo 降级四种状态。
- 核心页面至少覆盖桌面端和移动端关键流程，测试失败时保留截图或 trace。
- 本地和 CI 验证包含 lint、build、前端单元测试、E2E 测试、BFF 测试和 Python 测试。

## P2：优化仓库结构

### 当前状态

仓库根目录同时包含前端代码、Express 服务、Python 服务、脚本、Dockerfile 和文档。

### 长期建议结构

```text
apps/
  web/
  bff/
services/
  analytics/
packages/
  shared-types/
docs/
scripts/
```

这是一次较大的迁移，建议在 P0 模块拆分完成后再做。

### 验收标准

- 前端和 BFF 依赖分离。
- Python 服务拥有独立依赖和 Docker 上下文。
- 共享契约可以版本化或自动生成。
- 根目录仍保留简单的开发启动命令。

## P2：清理依赖和构建卫生

### 当前状态

`package.json` 里混合了前端运行时依赖、BFF 依赖、开发工具和类型包。

### 建议动作

- 将仅开发使用的包移动到 `devDependencies`。
- BFF 拆出后，分离后端依赖。
- 检查大型可视化依赖是否仍然全部需要。
- 增加生产构建体积分析。

### 验收标准

- `pnpm run build` 不再出现意外依赖警告。
- 依赖分组能反映运行时归属。
- 生产 bundle 体积可以被检查或周期性评估。

## P2：提升生产可用性

### 建议动作

- 将 verbose proxy 日志改成结构化日志，并支持按环境控制日志级别。
- 给外部 API 请求增加 timeout 和 retry 策略。
- 为 BFF 和 Python 服务增加 health check。
- 对部分数据源失败提供用户可理解的错误状态。
- 采集数据刷新、API 失败、地图渲染模式等基础指标。

### 验收标准

- 外部 API 失败可排查，但不会暴露敏感请求信息。
- 单个数据源失败不会导致整个看板不可用。
- 生产日志不打印凭证或大段响应正文。
- 服务提供健康检查接口。

## 建议执行顺序

1. 修复灾害数据、Analytics 和 4D API 契约，先补回归测试。
2. 收紧 BFF / Python 的路径、请求体、认证、限流和错误边界。
3. 修复地图 Popup 输出安全问题，并补齐报告下载闭环。
4. 统一灾害数据入口，增加来源状态、自动刷新、取消和竞态保护。
5. 抽离地图纯工具函数和测试，再将 `MapView.tsx` 拆成生命周期、LOD、Marker、Heatmap、3D Hooks。
6. 从 `AnalyticsPage.tsx` 抽离数据转换和响应类型，再拆分分析页 UI 组件。
7. 使用自定义 Hook 梳理 app 级状态归属。
8. 整理 Python 服务结构，补齐 API / 算法测试，并处理 CPU 密集任务的并发模型。
9. 建设 React 组件测试、Playwright E2E、视觉回归和 CI/CD 质量门禁。
10. 最后处理包体积预算、依赖审计、可访问性、多语言和仓库结构迁移。

已完成：AI 助手智能路由、BFF TypeScript 化和前端 API / Service 层第一阶段统一。后续执行从地图和分析页面拆分继续。

## 第一轮优化的非目标

- 不替换 Mapbox，除非产品需求明确要求。
- 不在状态职责未理清前引入 Redux 或 Zustand。
- 不在最大文件拆分前迁移 monorepo 结构。
- 仅做服务结构整理时，不重写 Python 分析算法。
- 重构期间不改变现有看板核心交互行为。

## 完成标准

当满足以下条件时，可以认为第一阶段优化达标：

- 核心功能文件已经小到可以轻松 review。
- 数据请求、数据转换、地图渲染、UI 状态有清晰归属。
- 地图渲染架构不仅写在文档里，也体现在代码结构上。
- 分析逻辑可以在不加载完整页面的情况下测试。
- 外部服务调用拥有统一错误处理方式。
- 前端、BFF 和 Python 分析服务可以通过 Docker 一键启动。
- AI 模型服务 Key 不进入浏览器构建产物，真实模型调用通过 BFF 完成。
- 前后端数据契约有自动化测试，超限、未授权、错误响应和敏感输出均有明确门禁。
- 报告导出、自动刷新、数据源降级和 AI 流式取消等核心操作有可重复的浏览器验证。
- 新开发者不需要通读整个项目，也能定位对应模块。
