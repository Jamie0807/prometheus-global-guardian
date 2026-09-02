# 项目待优化清单

## 文档目的

本文档从企业级工程项目的视角，记录 Prometheus Global Guardian 当前最值得优化的方向。重点关注可维护性、架构边界、运行稳定性和交付质量，而不是学习型说明。

## 当前判断

项目已经具备比较完整的产品能力：实时灾害可视化、多源灾害数据聚合、基于 Mapbox 的地理空间渲染、数据分析看板、AI 助手集成，以及 Python 分析服务。

当前主要问题不是功能不够，而是功能已经长起来了，但工程组织方式还比较接近原型项目：

- 前端 UI、Express BFF、Python 分析服务都放在仓库根目录，包边界不够清晰。
- 大组件同时承担渲染、数据请求、数据转换、状态协调和副作用。
- API 调用分散在多个文件中，缺少统一的请求契约和错误处理方式。
- 地图渲染逻辑是项目亮点，但目前集中在一个组件里，后续维护和讲解成本较高。
- TypeScript 前端和 Python 分析服务都有分析逻辑，但服务边界还不够明确。
- 质量门禁还不完整：有 lint 和 build，但核心业务逻辑缺少系统化测试。

## 开发与交付约束

后续每个需求都遵循以下项目级约束：

- 新增或重构的前端、BFF 代码统一使用 TypeScript；Python 分析服务继续使用 Python，不新增同职责 JavaScript 文件。
- 开始实现 AI Router 前，先将现有 AI BFF 相关 JavaScript 文件迁移为 TypeScript，并补齐类型、测试和构建配置。
- 每个需求开始前使用 Superpowers 流程完成上下文探索、方案设计、测试策略和验证；涉及新功能或行为变化时遵循测试驱动开发。
- 每个需求完成后同步更新本文档，记录状态、实现内容、验证结果和遗留风险。

## 优先级矩阵

| 优先级 | 优化领域 | 影响 | 建议时机 |
| --- | --- | --- | --- |
| P0 | 地图模块拆分 | 提升核心模块可维护性和性能可信度 | 第一批 |
| P0 | 分析页面拆分 | 降低最大组件维护成本 | 第一批 |
| P0 | API / Service 层统一 | 提升稳定性和排查效率 | 第一批 |
| P0 | AI 助手智能路由 | 由 LLM 判断普通模型与 RAG 工作流调用边界 | 第一批 |
| P0 | BFF TypeScript 化 | 统一项目技术栈，降低 JavaScript 与 TypeScript 混用成本 | 第一批 |
| P1 | 前端状态归属梳理 | 降低耦合和无效重渲染 | 第二批 |
| P1 | Python 服务结构整理 | 提升后端服务可维护性 | 第二批 |
| P1 | 测试基线建设 | 提升交付信心 | 第二批 |
| P2 | 仓库 / 包结构调整 | 长期可扩展性 | 后续 |
| P2 | 依赖清理 | 构建和依赖治理 | 后续 |
| P2 | 可观测性和错误上报 | 生产可用性 | 后续 |

## 已完成优化项

| 优化项 | 状态 | 结果 |
| --- | --- | --- |
| Docker 一键启动前后端 | 已完成 | 通过 Docker Compose 同时启动 Web / Express BFF 和 Python FastAPI 分析服务 |
| AI 助手 BFF 化改造 | 已完成 | 通过 Express BFF 统一封装 ai-workflow 与火山方舟模型调用，前端只消费 `/api/ai/chat` |
| AI BFF TypeScript 化 | 已完成 | 服务端源码统一为 TypeScript，编译到 `dist-server` 后由生产环境启动 |

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
- `npm run build` 通过。
- `npm run lint` 退出码为 0，但仍保留既有 warning。

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
- 已新增 `npm test`、`tests/ai-provider.test.ts` 和 `tests/ai-stream.test.ts`，覆盖 provider 配置、请求体构造、Responses SSE 转换、Workflow SSE/JSON 结果转换。

验证结果：

- `npm test` 通过，19 个 AI provider / stream 适配测试均通过。
- `npm run build` 通过，前端构建产物中未发现已配置的前端旧 Key。
- `npm run lint` 退出码为 0，但仍保留既有 warning。
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
- `npm run build` 同时完成前端和 BFF 构建，`npm start` 启动 `dist-server/server.js`。
- Docker runtime 镜像只复制 `dist/` 和 `dist-server/`，不在生产容器内运行未编译源码。
- 新增 `@types/express`，为 Express 请求、响应和 `rawBody` 中间件补充类型声明。

验证结果：

- `npm run typecheck:server` 通过。
- `npm test` 通过，19 个测试全部通过。
- `npm run lint` 通过，保留既有 warning，无新增 error。
- `npm run build` 和 Docker Web 镜像构建通过。

遗留风险：

- 仓库其他历史 JavaScript 配置文件仍保留；本次只迁移服务端运行时和 AI BFF，避免扩大改动范围。
- 本机 Node 版本应遵循项目声明的 `>=20.19 <21`，以保持和 Docker runtime 一致。

## AI 助手智能路由计划

当前 AI 助手通过 BFF 中的 LLM Router 判断请求路径：

- 普通闲聊、通用解释和不需要知识库的问题调用火山方舟模型。
- 灾害专业知识、Guardian 规则、历史案例、应急预案和需要 RAG 检索的问题调用已发布 ai-workflow。
- 前端继续只请求 `/api/ai/chat`，不感知具体 provider。
- Router、火山方舟和 ai-workflow 统一由 BFF 编排，API Key 不进入浏览器。
- 需要记录路由结果、失败降级策略和每条路径的耗时，避免出现回答成功但没有使用预期知识库的问题。

### 实现状态

已完成智能路由和 provider 降级：

- `AI_PROVIDER=router` 为默认模式；`AI_PROVIDER=workflow` 和 `AI_PROVIDER=ark` 保留为强制单 provider 模式。
- `server/ai/ai-router.ts` 根据最新用户消息和实时灾害上下文，将知识库、Guardian 规则、历史案例、应急预案、灾害专业问题和实时态势分析路由到 ai-workflow，其余普通对话路由到火山方舟。
- router 模式下，目标 provider 在响应开始前发生配置缺失、超时、网络错误或非 2xx 响应时，BFF 会尝试另一个已配置 provider；已经开始流式输出后不拼接备用 provider 的结果。
- 每次请求输出结构化路由日志，包含路由原因、最终 provider、是否降级、尝试次数、状态和耗时，不记录用户消息、API Key 或模型响应内容。
- `.env.example`、Docker Compose 和 README 已统一为 router 默认配置，并保留单 provider 调试方式。

验证结果：

- `npm test` 通过，26 个测试全部通过，覆盖路由信号、实时上下文、强制 provider 和 fallback 顺序。
- `npm run typecheck:server` 通过。
- `npm run lint` 退出码为 0，仍保留项目既有 warning。

遗留风险：

- 当前 Router 使用 BFF 内的规则匹配，不额外消耗一次 LLM 请求；后续如需更复杂的语义分类，可替换为独立分类器，但需要重新评估延迟、成本和误路由风险。
- provider 在已经返回流式响应头后才发生的错误只能结束当前流，无法无缝切换到另一个 provider。

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

### 当前状态

前端 API 代码分布在多个文件中：

- `src/api/hazards.ts`
- `src/api/disasteraware.ts`
- `src/api/pythonAnalytics.ts`
- `src/api/aiAssistant.ts`
- `src/api/auth.ts`

这些文件的返回结构、错误处理和 provider 适配方式不完全一致。结果是 UI 组件需要知道太多外部服务细节。

### 建议结构

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

- 所有 API 调用使用统一的成功 / 失败契约。
- provider 特有的数据解析放在 adapter 中。
- UI 组件不直接处理外部 API 的异常结构。
- AI provider 切换继续通过配置驱动。

### 验收标准

- 使用统一的 `ServiceResult<T>` 或等价结构处理可恢复错误。
- DisasterAware、USGS、EONET、GDACS 的数据映射逻辑独立。
- AI 助手组件不直接暴露 provider 特有请求细节。
- 网络错误、鉴权失败、响应结构异常有一致处理方式。

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

项目有 lint 和 build 脚本，但关键业务逻辑的自动化测试不足。

### 建议优先覆盖

前端：

- 灾害 API adapter。
- GeoJSON Feature 生成。
- 灾害筛选。
- 通知触发规则。
- 分析数据转换工具。
- AI provider 请求构造。

Python：

- 风险评分。
- 统计摘要。
- 透视表分析。
- 预测模型输入校验。
- 数据质量监控边界情况。

### 验收标准

- 前端增加 `npm test`。
- Python 服务使用 `pytest` 跑核心测试。
- 本地或 CI 验证包含 lint、build、前端测试、Python 测试。
- 核心转换逻辑不依赖浏览器或 Mapbox 就能测试。

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

- `npm run build` 不再出现意外依赖警告。
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

1. 抽离地图纯工具函数和测试。
2. 将 `MapView.tsx` 拆成地图生命周期、LOD、Marker、Heatmap、3D Hooks。
3. 从 `AnalyticsPage.tsx` 抽离分析数据转换函数。
4. 拆分分析页 UI 组件。
5. 统一前端 service 层。
6. 使用自定义 Hook 梳理 app 级状态归属。
7. 整理 Python 服务结构。
8. 补齐本地和 CI 质量验证命令。
9. 最后再考虑仓库结构迁移。

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
- 新开发者不需要通读整个项目，也能定位对应模块。
