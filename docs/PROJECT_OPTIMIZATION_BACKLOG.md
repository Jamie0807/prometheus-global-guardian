# 项目待优化清单

## 文档目的

本文档从企业级工程项目的视角，记录 Prometheus Global Guardian 当前最值得优化的方向。重点关注可维护性、架构边界、运行稳定性和交付质量，而不是学习型说明。

最近核对日期：2026-09-09。Python 管理面治理已在 `ba33d68` 提交；“已完成”表示所列实现范围已落地，不代表已部署。

状态口径：**已完成**表示所列范围已落地；**阶段完成**表示当前阶段已落地但仍有后续工作；**待开始**表示尚未完成该条目的验收范围，可能已有基础能力。各章节原有测试数量与验证结果为对应实施阶段的历史记录，不代表本次重新执行结果。

## 当前判断

项目已经具备比较完整的产品能力：实时灾害可视化、多源灾害数据聚合、基于 Mapbox 的地理空间渲染、数据分析看板、AI 助手集成，以及 Python 分析服务。

当前主要问题不是功能不够，而是功能已经长起来了，但工程组织方式还比较接近原型项目：

- 前端 UI、Express BFF、Python 分析服务都放在仓库根目录，包边界不够清晰。
- 地图和分析页面已完成模块拆分；部分复用组件和统计概览仍可继续细化职责。
- API 已统一收敛到 `src/services`，组件不再依赖旧的 API facade。
- 地图生命周期、数据、Marker、LOD、热力图和 3D 能力已拆为独立 Hook，后续重点是输出安全、数据来源和请求生命周期。
- TypeScript 前端和 Python 分析服务都有分析逻辑，但服务边界还不够明确。
- 灾害字段映射及 Analytics/4D 请求契约前两阶段已完成；跨语言模型仍需同步维护，Python 契约测试尚未纳入统一门禁。
- BFF 已完成受限 DisasterAware 代理、请求大小/查询边界、单进程限流和脱敏错误契约；Python 管理面令牌保护、CORS 和本地端口绑定已落地，公开 Analytics API 身份策略与多实例共享限流仍待治理。
- 质量门禁已覆盖 BFF、Service、React 组件、关键 E2E 流程、lint、格式、类型检查和 build；Python 核心算法、Python 契约测试统一接入、视觉回归和 CI/CD 仍待补齐。

## 开发与交付约束

后续每个需求都遵循以下项目级约束：

- 新增或重构的前端、BFF 代码统一使用 TypeScript；Python 分析服务继续使用 Python，不新增同职责 JavaScript 文件。
- 涉及 AI provider、BFF 或服务端请求时，先确认 TypeScript、测试和构建配置完整，敏感凭据只能由服务端读取。
- 每个需求开始前使用 Superpowers 流程完成上下文探索、方案设计、测试策略和验证；涉及新功能或行为变化时遵循测试驱动开发。
- 每个需求完成后同步更新本文档，记录状态、实现内容、验证结果和遗留风险。

## 优先级矩阵

下表只列剩余工作，已完成范围统一归入“已完成优化项”。默认按开发和演示阶段安排；执行批次与依赖以“建议执行顺序”为准。

| 优先级     | 剩余优化范围                                      | 建议批次          | 依赖与边界                                             |
| ---------- | ------------------------------------------------- | ----------------- | ------------------------------------------------------ |
| P1         | 外部数据源时效性与韧性                            | 4                 | 接在统一入口后，补超时、降级与新鲜度                   |
| P1         | 实现自动刷新与请求竞态保护                        | 4                 | 先取消、去重与竞态保护，再启用自动刷新                 |
| P1         | 统一请求体、数组长度和数值范围校验                | 5                 | 重点补 Python 边界，复用已完成的 BFF 限制              |
| P1         | Python API 契约与分析可靠性                       | 5                 | 先行为与确定性测试，后结构拆分                         |
| P1         | 前后端错误信息与调试信息分级                      | 5                 | 随对应接口治理，保留已完成的 BFF 脱敏                  |
| P1         | 报告下载闭环                                      | 6                 | 明确格式、字段、数据时间与来源                         |
| P1         | AI 流式会话生命周期治理                           | 7                 | 取消、断流与重复发送；不重复建设 BFF 输入限制          |
| P1         | Python 服务结构整理                               | 8                 | 可靠性测试保护下拆分                                   |
| P1         | 前端状态归属梳理                                  | 3 / 8             | 灾害状态随统一入口处理，剩余 UI 状态后移               |
| P1 / P2    | 前端边界类型治理                                  | 5 / 后续          | 对应 Analytics 响应类型提前，全仓治理后续              |
| P2         | 前端包体积预算与分包治理                          | 9                 | 先测首屏、交互及依赖贡献，再优化                       |
| P2         | 可访问性与多语言界面                              | 9                 | 基础键盘支持随组件改动补齐                             |
| P2         | 可观测性和错误上报                                | 4 / 5 / 后续      | 来源状态与错误日志随功能落实，完整平台后续             |
| P2         | 仓库 / 包结构调整、依赖清理                       | 10                | 不作为前述优化的前置条件                               |
| P2         | 运行时无关文件与仓库卫生                          | 10                | 影响构建或 CI 的问题随门禁处理                         |
| P2         | 依赖、镜像和配置持续审计                          | 10                | 已确认的高风险问题优先处理                             |
| 按发布条件 | 公开 Analytics API 身份、请求量限制与生产错误脱敏 | 公网发布前第 1 批 | 管理令牌不覆盖公开业务 API；多实例部署前再落实共享限流 |

## 已完成优化项

| 优化项                         | 状态                 | 结果                                                                                        |
| ------------------------------ | -------------------- | ------------------------------------------------------------------------------------------- |
| Docker 一键启动前后端          | 已完成               | 通过 Docker Compose 同时启动 Web / Express BFF 和 Python FastAPI 分析服务                   |
| AI 助手 BFF 化改造             | 已完成               | 通过 Express BFF 统一封装 ai-workflow 与火山方舟模型调用，前端只消费 `/api/ai/chat`         |
| BFF TypeScript 化              | 已完成               | 服务端源码统一为 TypeScript，编译到 `dist-server` 后由生产环境启动                          |
| API / Service 层统一           | 已完成               | 增加统一 HTTP 错误契约，完成鉴权、灾害、Analytics、AI Service 拆分，移除旧 `src/api` facade |
| AI 助手智能路由                | 已完成               | BFF 规则路由选择 Ark / Workflow，支持响应开始前的 provider 降级和结构化日志                 |
| 灾害数据与 Analytics API 契约  | 已完成（第二阶段）   | 统一字段映射、4D 请求参数和校验，补充 FastAPI HTTP 路由契约测试                             |
| Analytics 结果语义与展示一致性 | 已完成（第二阶段）   | 统一预测状态、风险建议、质量分数及中英文展示资源                                            |
| 统计概览图表数据与坐标一致性   | 已完成               | 移除随机强度填充，保留有效数据原始编号，修正首尾坐标标签                                    |
| 地图模块拆分                   | 已完成               | 拆为组合入口、6 个 Hook 和 3 个纯工具模块，增加地图工具与组件测试                           |
| 地图外部数据输出安全           | 已完成               | Popup 改用本地 DOM 节点与 `textContent`，外部文本不能创建可执行 DOM                         |
| 分析页面拆分                   | 已完成               | 页面、数据 Hook、纯转换和各 Tab 组件分离，保留兼容入口                                      |
| BFF 代理与请求边界             | 已完成（BFF 范围）   | 接入路径白名单、请求限制、服务端鉴权、超时、单进程限流和错误脱敏                            |
| Python 管理面边界              | 已完成（`ba33d68`）  | 管理接口令牌保护、显式 CORS 来源和 Compose 本地端口绑定；公开 API 治理仍待推进              |
| 前端测试体系                   | 已完成（基线）       | 建立 Vitest / React Testing Library 组件测试和 Playwright 浏览器冒烟测试                    |
| 测试基线建设                   | 已完成（前端 / BFF） | `test:baseline` 汇集格式、lint、类型、测试和构建；Python 与 CI 接入继续跟踪                 |
| 最小 CI 门禁与 Python 测试入口 | 已完成               | GitHub Actions 并行执行 Node/BFF 基线与 Python unittest，失败时保留 Playwright 产物         |
| 统一灾害数据入口与来源级状态   | 已完成               | DisasterAWARE 优先，空结果或不可用时使用备用来源，并向地图返回来源级状态                    |

上述成果的实施细节、测试入口和剩余范围见下方同名章节。核对依据包括现有源码与测试、`package.json` 验证脚本、`docs/superpowers/` 计划与规格，以及 Git 历史；不能仅凭计划文件判定功能已经完成。

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
- `src/services/ai/aiAssistantService.ts` 默认请求 `/api/ai/chat`，未配置模型服务时继续保留 Demo 模式。
- 已删除前端 provider 配置模块，浏览器端不再读取模型服务 Key。
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

### BFF TypeScript 化

已完成 AI BFF 及其运行时依赖的 TypeScript 迁移：

- `server.ts`、`server/hazards/hazard-source.ts`、`server/env.ts` 和 `server/ai/*.ts` 替代原有服务端 JavaScript 文件。
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

## P0：AI 助手智能路由

当前 AI 助手通过 BFF 中的规则 Router 判断请求路径：

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
- `src/services/analytics/analyticsService.ts` 的 `formatHazards` 现在优先读取顶层字段，仅在顶层缺失时兼容读取 `properties.*`，并保留合法的 `0` 数值。
- 5 个 4D Service 方法现在统一发送 `{ hazards: ... }`，并分别发送时间维度、地理维度、聚合函数、筛选条件和时间窗口。
- `python-analytics-service/main.py` 的 `AnalysisRequest` 已显式声明 4D 字段，并用 Literal、二元时间范围和正数约束拒绝不符合契约的请求。
- `sum` 和 `mean` 聚合使用数值型 `magnitude` 列，避免对字符串 `id` 做数值聚合。
- `python-analytics-service/tests/test_api_routes.py` 使用 FastAPI `TestClient` 覆盖五个 4D HTTP 路由的合法响应、参数转发、响应回显、空结果和 422 校验。

### 风险

- 原先由顶层字段丢失导致的统计、预测、风险评估结果偏差已修复。
- 原先 4D 请求使用 `data`、参数未声明而导致的 422 或静默忽略已修复；非法参数现在明确返回 422。
- 前端 TypeScript 类型和 Python Pydantic 模型已经覆盖当前请求字段，但尚未生成跨语言共享契约，后续字段变更仍需同步维护两端。

### 第一阶段已完成

- 统一前端 `Hazard` 到 Python `HazardData` 的字段映射，真实灾害的标题、时间、严重性、来源和震级可进入 Analytics 请求。
- 为前端和 Python 增加 4D 请求类型与契约测试，覆盖 `hazards` 请求体、筛选参数、时间窗口和聚合行为。
- 验证合法 4D 参数按请求传入分析器，非法维度、聚合函数、时间范围和时间窗口在 Pydantic 边界被拒绝。

### 第二阶段已完成

- 增加真实 ASGI HTTP 路由契约测试，验证请求经过 FastAPI 路由和 Pydantic 边界，而不是只直接调用 Python 函数。
- 为 `httpx` TestClient 依赖锁定版本；测试不需要启动服务、不访问真实外部数据源，并覆盖五个 4D 路由。
- README 和测试基线已区分 Python 模型/端点单元测试、HTTP 路由测试、算法冒烟脚本和手工集成脚本。

### 后续工作

- 评估生成或共享跨语言灾害输入契约，避免 TypeScript 与 Pydantic 模型长期手工同步。
- 将 Python 契约测试接入统一 CI 门禁，并继续补充 Python 核心算法边界测试。

## P0：BFF 代理暴露面与请求边界治理

### 已完成（BFF 与 Python 管理面）

- 用显式 allowlist 替换通用 `/api` 代理，只允许三条 DisasterAware `GET` 灾害接口；未知路径返回 `API_ROUTE_NOT_FOUND`，方法不匹配返回 `API_METHOD_NOT_ALLOWED`。
- 非安全方法请求体限制为 64 KiB；query 限制为最多 20 项、键和值最多 256 字符，并拒绝数组和嵌套形状。
- 仅转发 `accept`、`accept-language`；客户端 authorization、cookie、代理头和自定义头不会抵达上游，认证始终使用 BFF 服务端 token。
- 为 DisasterAware 鉴权和代理接入有上限的超时；上游失败返回稳定、脱敏的 502/504 错误。`/api/authorize`、`/api/ai/chat` 及灾害查询拥有独立的单进程固定窗口限流。
- 新增 BFF 边界测试，覆盖 allowlist、编码路径绕过、方法、请求体、query、请求头、限流、超时、token 缓存和错误脱敏。
- Python `/metrics` 和 `/cache/clear` 已改为管理接口：未配置或令牌无效时返回 404，有效 `X-Analytics-Admin-Token` 才可访问；比较使用恒定时间函数。
- Python CORS 已限制为显式来源、`GET`/`POST`/`OPTIONS` 和必要请求头，关闭 Cookie 凭据；`ANALYTICS_CORS_ORIGINS` 可覆盖默认来源。Compose 的 Python 端口已绑定 `127.0.0.1`。

### 剩余风险与后续工作

- 目前限流按 BFF 进程内存和直连 IP 工作；多实例部署需要在入口网关或共享存储实现统一限流，并按部署拓扑显式配置可信代理。
- 浏览器仍直接访问 Python `/api/v1/*`；生产环境需要独立设计该公开 Analytics API 的反向代理、身份与统一限流策略。
- AI Provider 的流式连接仍使用其独立的响应超时与生命周期逻辑；后续“AI 流式会话生命周期治理”应继续完善取消、连接中断和用量控制。

## P0：地图外部数据输出安全

### 已完成

- 新增 `src/features/map/utils/hazardPopupContent.ts`，由本地代码创建 Popup 的标题、信息行和样式类名。
- `title`、`type`、`severity` 和 `description` 一律通过 `textContent` 写入；`useHazardMarkers` 使用 `Popup#setDOMContent()`，不再调用 `setHTML()`。
- 新增恶意标签、事件属性和 URL 文本回归测试，并在 MapView 集成测试中确认 Mapbox 接收的是安全 DOM 节点。

### 验收与遗留范围

- 外部字段中的 HTML、脚本和事件属性只能按纯文本展示，不能创建 Popup DOM 节点或执行代码。
- 本轮不将外部 URL 变为可点击链接；若后续增加链接能力，需单独定义协议白名单、`rel` 属性和测试。

## P1：统一请求体、数组长度和数值范围校验

综合分析接口已有 1000 条数据截断，但 Python 各接口尚缺统一的请求体、数组长度和数值边界；`coordinates` 缺少经纬度范围与长度校验，`quality/history` 的 `limit` 直接使用。BFF 已具备请求体、query 和 AI 输入限制，本项重点补齐 Python 请求体大小、灾害数组上限、字符串长度、坐标范围和分页 limit，并复用已有 4D 时间窗口与枚举校验，为边界返回稳定的 4xx 错误契约。

## P1：Python API 契约与分析可靠性

### 当前缺口

- `python-analytics-service/main.py` 将路由、Pydantic 模型、缓存、指标和业务调度放在同一文件。
- `cache_response` 装饰器已定义但没有应用到分析路由；`/metrics` 宣称的缓存命中率不能代表实际分析缓存状态。
- 多个接口把 `str(e)` 直接放入响应；算法模块大量捕获宽泛异常并返回空表、默认值或错误字典，调用方难以区分“无数据”“算法失败”和“输入无效”。
- `unified_model.py` 对部分灾害类型使用零阈值或估算 magnitude，当前结果的业务含义和置信度没有统一说明。
- 质量枚举大小写、来源别名和分数范围已在结果语义阶段修复；剩余工作是完善未知枚举、非有限数值与异常输入覆盖，以及校准评分口径，不重复列为未修复缺陷。
- 多个专用分析接口直接在 `async` 路由中执行 Pandas 和模型计算，可能阻塞 FastAPI 事件循环；当前只有综合分析使用线程池并行。

### 建议与验收

- 先统一错误码、日志字段、request id 和响应模型，并补回归测试；routes / schemas / services / core 拆分由后续“Python 服务结构整理”负责，不作为修复可靠性的前置条件。
- 要么真正接入并验证缓存，要么删除虚假缓存指标；明确缓存键包含完整输入而不是仅长度、类型和首尾时间。
- 生产响应只返回稳定错误码和用户可理解的消息，详细异常写入受控日志。
- 为空数据、脏数据、缺少 magnitude、无时间序列和模型失败建立确定性测试，并对风险分数、置信度和阈值写出业务定义。
- 保留已完成的枚举归一化和分数限制，核对现有测试后补足 NaN、Infinity 和未知枚举等边界；随响应模型稳定同步收紧对应前端类型，跨语言生成工具按维护成本再评估。
- 先限制单请求计算量并测量事件循环响应、延迟与吞吐，再决定并发上限、线程池或任务队列方案；不预先要求引入队列。

## P1：Analytics 结果语义与展示一致性

### 第一阶段已完成

- Python 预测结果统一返回 `status`、`reason`、`dataPoints`、`minimumDataPoints` 和 `confidence`；样本不足、模型失败与可用结果可以被前端区分。
- 风险建议增加 `recommendationDetails`，包含 `ruleId`、`severity`、`metrics` 和 `message`，同时保留旧的字符串建议字段兼容已有调用方。
- 质量检查统一前端实际使用的枚举大小写与 `DisasterAWARE` 来源别名，质量分数限制在 `0-1`，避免出现负分或超过 100% 的展示结果。
- 新增前端 Analytics 展示适配器，统一风险等级、趋势、状态、分数、百分比和质量问题文案；新增 Python 结果语义测试和前端适配器测试。

验证入口：`tests/service-analytics-presentation.test.ts`、`python-analytics-service/tests/test_result_semantics.py`。

剩余工作：将适配器继续拆分为正式 i18n 资源，补充页面组件级断言、移动端视觉回归，并继续校准预测算法和风险阈值。

### 第二阶段已完成

- 展示适配器增加 `zh-CN` 和 `en-US` 正式文案资源，状态、风险等级、趋势、严重程度和质量问题文案均可按 locale 输出。
- 新增 `DataQualityMonitor` 组件测试，覆盖中文状态/分数/维度展示、问题建议本地化和异常分数边界。
- 测试基线同步覆盖 62 项根目录自动化测试，保留算法校准、移动端视觉回归和完整页面覆盖为后续工作。

### 后续剩余缺口

- 继续校准预测算法、风险阈值和置信度定义，用真实业务样本建立可比较的效果基线。
- 补充移动端视觉回归、低风险高关注项端到端验证，以及 Analytics 页面更多交互状态覆盖。

## P1：统计概览图表数据与坐标一致性

### 问题依据

- 统计概览的灾害强度折线图原先没有优先读取标准 `Hazard.magnitude`，缺少数值时使用 `Math.random()` 填充，导致同一批数据重复渲染后图形变化，图表无法代表真实灾害强度。
- X 轴标签按数据量抽样后，首尾标签仍使用居中定位；结合溢出裁剪时，最后的 `#846` 可能只显示为 `#8`，造成图形坐标与记录编号的视觉错位。
- 数据源没有强度字段时，图表标题仍标记为“全部数据”，容易让使用者误以为每条记录都参与了强度计算。

### 已完成

- 新增 `src/utils/hazardMetrics.ts`，按顶层 `magnitude`、几何扩展字段和兼容属性字段顺序读取有限数值，保留合法的 `0`，无真实强度时返回 `null`。
- `AnalyticsPage` 使用 `useMemo` 构建有效强度序列，缺少强度的记录不再生成随机点，并显示“有效强度数据：有效数 / 总数”。X 轴编号继续保留原始灾害记录编号。
- `DataVisualization` 的首个标签左对齐、末个标签右对齐，中间标签居中，避免边缘标签被裁剪；单条数据时坐标位置也保持有效。
- 新增强度字段读取测试和大数据量图表组件测试，覆盖 846 条记录最多显示 8 个标签、首尾标签完整显示及缺少强度数据的确定性行为。

### 验证结果

- `pnpm run test:component` 通过，7 项组件测试全部通过。
- `pnpm exec vitest run tests/service-hazard-metrics.test.ts` 通过，3 项强度读取测试全部通过。
- `pnpm run lint`、`pnpm run format:check`、`pnpm run typecheck:client` 和 `pnpm run build:client` 通过。

### 后续风险

- NASA、GDACS 和部分 DisasterAware 记录本身可能没有可比较的 magnitude；当前界面会明确显示有效数据量，但不会把严重程度等级伪装成数值强度。后续如需跨来源比较，应先定义统一的业务强度模型和来源转换规则。
- 当前统计概览仍展示完整数据集的基础统计，但强度趋势图只展示具备真实强度的记录；后续可补充缺失原因筛选和数据来源分组，进一步降低解释成本。

## P1：外部数据源时效性与韧性

`server/hazards/hazard-source.ts` 的 USGS、NASA、GDACS 请求没有独立 timeout、重试、缓存或 stale 数据策略；前端遇到 DisasterAware 为空时会并行请求公共源，但没有展示各源失败、最后成功时间和数据是否过期。建议增加按数据源的超时/重试/缓存、来源状态和新鲜度元数据，并验证单源故障、部分成功、重复事件和刷新竞态。

## P1：AI 流式会话生命周期治理

- `src/services/ai/aiAssistantService.ts` 直接使用浏览器 `fetch`，没有 `AbortController`；关闭面板或离开页面无法主动取消请求。
- `AIChatAssistant.tsx` 的发送流程没有统一的消息条数、单条长度、上下文大小和并发请求约束。
- 前端 SSE 解析忽略不完整尾部和 malformed chunk，分析页重试也没有请求序列号或卸载保护，旧请求可能覆盖新结果。

建议增加取消、请求序列号、最大上下文、断流重连策略和 provider 成本预算；验收需覆盖关闭面板、网络断开、重复点击、超长消息、旧响应晚到和流式半包。

## P1：前后端错误信息与调试信息分级

生产错误不应把内部异常文本、组件堆栈或上游细节交给用户：`server.ts`、Python 路由和 `ErrorBoundary` 当前仍存在直接回显路径。建议区分用户消息、结构化日志和开发诊断信息，并以 request id 关联日志；验收需确认生产响应不包含文件路径、依赖堆栈、凭据、完整上游响应和用户输入。

## P1：CI/CD 与质量门禁接入

分两阶段推进：第 2 批先建立最小 CI，运行已有根目录基线及 Python 自动化测试，固定可复现的运行环境并保留失败产物；不等待算法测试、移动端和视觉回归全部补齐。自动部署、扩展扫描和发布策略后续按交付需要安排。Python 现有测试使用 unittest，可直接复用，不以迁移 pytest 为接入条件。

仓库当前没有 `.github/workflows` 或等价 CI 配置。最小 CI 复用 `pnpm run test:baseline`，并运行 `python -m unittest discover -s python-analytics-service/tests -p 'test_*.py'`；固定与项目兼容的 Node、pnpm 和 Python 环境，上传失败日志、截图或 trace。`test_service.py` 依赖已运行服务，`test_pivot_table.py` 是打印式脚本，两者不作为本轮自动化门禁；依赖/镜像扫描在后续持续审计中扩展。

## P2：运行时无关文件与仓库卫生

当前工作区可见未被构建使用的 `server 2.ts`，以及 `.superpowers/sdd/` 下的 review diff 和任务快照；根目录同时保留 `package-lock.json` 与 `pnpm-lock.yaml`。应明确哪些是提交资产、临时审查产物和个人本地文件，决定旧副本与双锁文件的保留策略，并在 `.gitignore`、README 和 CI 中固化规则。`server 2.ts` 和 review diff 不应被当作运行入口或项目结构组成部分。

## P2：依赖、镜像和配置持续审计

当前 Docker runtime 仍在镜像内重新安装 pnpm 和生产依赖，前端/BFF/测试依赖也共用一个 `package.json`，依赖大量使用 `^` 范围。建议增加 lockfile 一致性、依赖漏洞、许可证、容器镜像和 secret scanning；明确生产依赖边界并评估 pnpm store / 多阶段缓存策略。

## P2：可访问性与多语言界面

多个 Modal 使用自定义 div 和 inline style，缺少统一 `role="dialog"`、`aria-modal`、焦点陷阱、返回焦点和完整键盘行为；界面同时混用中英文，日期和错误消息也没有统一 locale。建议建立基础无障碍组件和 i18n 资源，覆盖键盘、读屏、移动端布局和中英文快照测试。

## P1：报告下载闭环

`SaveReportModal` 已能下载 JSON，界面提示却写成 HTML；`App.tsx` 的 `handleDownloadReport` 只记录日志。本项是格式承诺、内容与职责的闭环，不是从零实现下载。应明确报告格式、导出字段、数据时间与来源、编码、文件名和敏感数据处理，并以下载内容测试和文档同步为验收标准。默认排在数据可靠性之后；若报告成为近期交付核心，可提前最小闭环，后端存储另行评估。

## P1：统一灾害数据入口与来源级状态

本项负责统一入口、灾害数据归属和来源状态契约；“外部数据源时效性与韧性”在此基础上补超时、降级和新鲜度，“实现自动刷新与请求竞态保护”负责请求生命周期。三项按依赖连续推进，不另设重复的地图数据治理任务。

当前 Express 已实现 `/api/hazards` 聚合入口，但 `MapView` 仍直接请求 USGS、NASA、GDACS，Service 层又把来源失败统一转换为空数组。建议让地图使用统一聚合入口，保留每个来源的成功/失败、请求耗时、最后成功时间、数据新鲜度和降级原因；验收需覆盖单源失败、部分成功、重复事件、过滤条件和旧数据保留策略。

## P1：实现自动刷新与请求竞态保护

实施次序为取消与卸载清理、请求去重和过期响应丢弃、定时刷新及页面隐藏暂停。先验证手动刷新和并发请求正确，再启用定时器；AI 流式生命周期由独立条目负责。

`src/config/index.ts` 配置了 `refreshInterval`，但地图当前只在初始化或手动刷新时请求。地图数据、Analytics 重试和 AI 流式请求都缺少完整的 `AbortController`、卸载清理、请求序列号和过期结果保护。建议统一实现自动刷新、页面隐藏时暂停、手动刷新去重、请求取消和 stale response 丢弃，并为定时器与 Worker 增加生命周期测试。

## P2：前端包体积预算与分包治理

当前 `vite.config.ts` 手动配置了 React、Mapbox、Recharts 和工具分包，但构建仍生成空的 vendor chunk，Mapbox 产物约 1.8 MB，且主要依靠提高 `chunkSizeWarningLimit`。建议按真实依赖图重做 manual chunks，懒加载地图/分析/3D 能力，建立 gzip/raw size budget，并在 CI 中对超预算失败或告警。

## P2：前端边界类型治理

`src/services/analytics/analyticsService.ts`、`AnalyticsPage.tsx`、`ChartsPanel.tsx`、`DataQualityMonitor.tsx` 等仍大量使用 `any[]`、`Promise<any>` 和动态字段。应优先为 Analytics、图表、质量报告、钻取和导出定义稳定的响应类型与类型守卫；保留 `unknown` 只作为外部输入边界，并逐步把 ESLint 的 `no-explicit-any` 从 warning 提升为受控 error。

## P0：地图模块拆分

### 本轮完成情况

- 将原 `src/components/MapView.tsx` 拆分为 `src/features/map/MapView.tsx`、6 个地图 hook 和 3 个纯工具模块。
- 地图实例、数据与 Worker、Marker、LOD、热力图、3D Tiles/建筑回退均有独立职责；组合组件只负责 hook 编排和热力图切换控件。
- 新增 GeoJSON/LOD 单元测试及 Mapbox/Worker mock 组件测试，覆盖临界 zoom、坐标过滤、热力图切换与组件挂载。
- `pnpm run test:baseline` 已通过：BFF 29、Service 36、组件 8、E2E 1，前后端构建通过。
- Popup 安全、统一灾害入口、自动刷新竞态和包体积治理仍按各自待办继续跟踪。

### 拆分前问题（历史背景）

原 `src/components/MapView.tsx` 曾同时承担以下职责，现已迁入 feature 入口及独立 Hook：

- Mapbox 地图初始化和生命周期管理。
- 灾害数据加载。
- DisasterAware 和备用数据源调度。
- Web Worker 数据清洗。
- DOM Marker 渲染。
- GeoJSON Source 和 cluster 图层初始化。
- Heatmap source 和 layer 更新。
- 3D 建筑、deck.gl overlay 初始化。
- 基于 zoom 的 LOD 可见性切换。

这些职责集中曾增加维护风险；本轮已完成结构拆分，功能增强仍按独立待办推进。

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

## P0：分析页面拆分

### 当前实现状态

分析页面拆分已经完成：

- `src/components/AnalyticsPage.tsx` 缩减为兼容转发入口。
- `src/features/analytics/AnalyticsPage.tsx` 为 300 行以内的页面组合入口，只持有当前 Tab 状态。
- Python 服务健康检查、自动分析、缓存、重试、手动重跑和 4D 分析编排统一进入 `useAnalyticsData`。
- 灾害类型统计、有效强度序列和分析数据哈希进入纯转换模块。
- 页头、摘要、服务控制区、Tab 导航、统计概览、图表、预测、风险和数据质量展示均拥有显式组件边界。
- 现有 `ChartsPanel`、`ChartDrilldownModal` 和 `DataQualityMonitor` 继续复用，避免重复改造稳定模块。

### 已落地结构

```text
src/features/analytics/
  AnalyticsPage.tsx
  styles.ts
  types.ts
  components/
    AnalyticsHeader.tsx
    AnalyticsSummaryGrid.tsx
    AnalyticsControlPanel.tsx
    AnalyticsTabs.tsx
    PredictionStatusBadge.tsx
    RiskRecommendationLine.tsx
    tabs/
      AnalyticsChartsTab.tsx
      AnalyticsQualityTab.tsx
      OverviewTab.tsx
      PredictionsTab.tsx
      RiskTab.tsx
  hooks/
    useAnalyticsData.ts
  utils/
    analyticsTransforms.ts
```

### 验收结果

- feature 页面入口为 84 行，兼容入口为 1 行。
- `analytics-transforms.test.tsx` 覆盖类型回退、未分类、无效强度过滤、原始编号和哈希规则。
- `use-analytics-data.test.tsx` 覆盖服务检查、分析链路、缓存、空数据和手动重跑。
- `analytics-page.test.tsx` 覆盖兼容入口和五个 Tab 切换。
- 主统计、预测、风险和 4D 分析链路只由 `useAnalyticsData` 调用 Analytics Service；复用的图表与质量组件保留独立请求边界。
- 图表自定义和钻取继续由既有独立组件管理。

### 后续可选优化

- `OverviewTab.tsx` 仍包含较多统计展示区块，可在需要独立演进 4D、关联性和趋势展示时继续按结果域拆分。
- 本轮保持现有视觉和业务行为，不处理自动刷新竞态、异步卸载治理、国际化或视觉重构。

## P0：API / Service 层统一

### 当前实现状态

本轮已完成统一 Service 层的第一阶段落地：

- `src/services/http` 提供统一 JSON、文本和流式请求、超时、重试及 `ServiceError` 错误契约。
- `src/services/auth` 通过 BFF 管理 DisasterAware 凭据和 token；浏览器不读取用户名、密码或真实 token。
- `src/services/hazards` 集中处理 USGS、NASA、GDACS 和 DisasterAware 请求及数据适配。
- `src/services/analytics` 接管 Python Analytics 请求，并保留原有导出能力。
- `src/services/ai` 接管 AI SSE 请求和 Demo 降级；纯 UI 辅助函数放在 `src/utils/aiAssistant.ts`。
- 已移除 `src/api` 兼容 facade，项目内部统一直接使用 Service 层。
- `tests/service-*.test.ts` 使用 Vitest 覆盖 HTTP、适配器、Analytics 和 AI Service；BFF 继续使用 Node 原生测试。

验证命令为 `pnpm test`、`pnpm run lint`、`pnpm run format:check`、`pnpm run typecheck:client`、`pnpm run typecheck:server` 和 `pnpm run build`。

遗留风险：Analytics 后端返回字段仍有版本差异，分析 feature 的展示边界暂时使用兼容响应类型；后续可随着 FastAPI 响应契约稳定继续细化类型。

### 迁移前问题

前端 API 曾分布在多个文件中，返回结构、错误处理和 provider 适配方式不完全一致，导致 UI 组件需要知道过多外部服务细节。

本轮已完成迁移，业务请求由 `src/services` 统一负责。

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

- Analytics 后端字段仍有一定版本差异，分析展示边界暂时使用兼容响应类型。
- 分析页面已迁移到 `src/features/analytics/`；统计概览 Tab 可在后续按结果域继续细分。

### 验收结果

- 使用统一的 `ServiceError` 和等价的空结果降级策略处理可恢复错误。
- DisasterAware、USGS、EONET、GDACS 的数据映射逻辑已独立。
- AI 助手组件不直接暴露 provider 特有请求细节。
- 网络错误、鉴权失败、响应结构异常已有统一处理方式。

## P1：前端状态归属梳理

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

## P1：Python 服务结构整理

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

## P1：测试基线建设

### 当前状态

项目现已具备 BFF Node 原生测试、前端 Service 层 Vitest 测试、React Testing Library 组件测试、Playwright 浏览器冒烟测试，以及独立的 Python API 模型和 HTTP 路由契约测试。前端和 BFF 已通过 `pnpm run test:baseline` 纳入统一门禁；Python 核心算法测试、Python 测试统一接入、视觉回归和 CI/CD 接入仍待补齐。

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
- Python 服务复用现有 unittest 自动化测试，并随算法可靠性工作扩展核心测试；不要求先迁移测试框架。
- 本地质量基线包含 lint、格式、前后端类型检查、build、BFF 测试、Service 测试、React 组件测试和 Playwright 冒烟测试；Python 测试入口与最小 CI 在第 2 批一起落实，不互相等待。
- 核心转换逻辑不依赖浏览器或 Mapbox 就能测试。

## P1：前端测试体系

### 当前状态

前端 Service 层已有 Vitest 单元测试，覆盖统一 HTTP、灾害数据适配、Analytics 格式化和 AI 流式/Demo 降级；新增的 React Testing Library 和 Playwright 基线已覆盖状态面板、首页筛选、AI 助手打开及消息展示。视觉回归、移动端专门流程和更完整的组件状态覆盖仍属于后续增强。

### 建议优先覆盖

- 使用 Vitest 和 React Testing Library 持续扩展 AI 助手、弹窗、表单、错误状态和 Demo 降级测试。当前第一阶段已建立组件测试配置和状态面板行为测试。
- 将灾害 API adapter、灾害筛选、通知触发规则、GeoJSON 生成和分析数据转换等纯函数纳入前端单元测试。
- 使用 Playwright 测试地图首页、灾害筛选、AI 助手打开和 mock 流式响应展示。关键弹窗、路由跳转和移动端流程待后续扩展。
- 对桌面端和移动端执行截图或视觉回归检查，重点关注地图、聊天面板、弹窗和表格布局，作为下一阶段建设项。
- 为模型 API、灾害 API、Mapbox 和 Python 服务建立可控 mock，避免测试依赖真实外部服务。

### 验收标准

- 增加独立的 `pnpm run test:component` 命令，能够执行 React 组件行为测试。已完成。
- 增加独立的 `pnpm run test:e2e` 命令，能够启动测试服务并执行 Playwright 浏览器流程。已完成。
- 当前基线覆盖 AI 助手 mock 流式成功路径；请求失败、空响应和 Demo 降级属于现有 Service 测试及后续组件测试扩展范围。
- 当前 E2E 失败时保留截图，重试时保留 trace；桌面端首页关键流程已覆盖，移动端和视觉回归待后续建设。
- `pnpm run test:baseline` 已统一执行 lint、格式、类型检查、build、前端测试和 BFF 测试；第 2 批将其与 Python 自动化测试一起纳入最小 CI 门禁。

## P2：仓库 / 包结构调整

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

## P2：依赖清理

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

## P2：可观测性和错误上报

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

默认假设项目仍以开发和演示为主，尚未面向公网正式运营。以下按风险、依赖和验证成本排序；每项新增行为的测试随该项完成，不集中推迟到最后。

1. **地图 Popup 输出安全。** 消除外部字段直接拼接 HTML 的路径，补安全回归测试。
2. **最小 CI 门禁与 Python 测试入口。** 复用已有前端、BFF、组件、E2E 与 Python 测试，明确运行环境；自动部署另行安排。
3. **统一灾害入口、数据归属和来源状态。** 确立唯一调度入口及成功、失败、无数据的状态契约，同步处理灾害状态归属。
4. **数据源韧性和请求生命周期。** 补超时、降级及新鲜度，先实现取消、去重和竞态保护，再加自动刷新；来源日志与指标随功能落实。
5. **Python 输入边界、错误语义和分析可靠性。** 限制计算量、隐藏内部异常、补确定性测试并验证缓存口径；同步收紧对应前端响应类型，根据负载证据选择并发方案。
6. **报告下载闭环。** 统一格式承诺、导出字段、数据时间与来源，先交付可验证的最小版本。
7. **AI 流式生命周期。** 处理关闭取消、重复发送、断流和上下文控制，复用 BFF 已有输入限制。
8. **结构与剩余状态整理。** 在测试保护下拆分 Python 服务，整理剩余前端 UI 状态；统计概览仅按实际维护需要继续拆分。
9. **性能、可访问性与多语言。** 先测首屏和交互，再优化分包及依赖贡献；基础键盘支持随相关组件修改补齐，移动端和视觉回归按实际使用场景扩展。
10. **仓库、包边界和深度依赖治理。** 处理结构迁移、依赖归属、镜像审计与完整观测平台；影响 CI 或构建的仓库卫生问题随门禁处理。

公网发布前，将公开 Analytics API 的身份策略、请求量限制与生产错误脱敏提升到第 1 批。管理接口令牌不覆盖公开业务 API；共享限流在多实例部署前落实，不作为当前单实例演示的默认前置任务。若报告成为近期交付核心，可提前第 6 项的最小闭环。

跨语言共享契约生成在响应模型稳定、手工同步成本明确后评估，不阻塞上述修复。下一批优先推进 **最小 CI → 数据入口与来源状态 → 数据源韧性与请求生命周期**。

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
