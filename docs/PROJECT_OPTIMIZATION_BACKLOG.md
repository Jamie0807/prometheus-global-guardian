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

## 优先级矩阵

| 优先级 | 优化领域 | 影响 | 建议时机 |
| --- | --- | --- | --- |
| P0 | 地图模块拆分 | 提升核心模块可维护性和性能可信度 | 第一批 |
| P0 | 分析页面拆分 | 降低最大组件维护成本 | 第一批 |
| P0 | API / Service 层统一 | 提升稳定性和排查效率 | 第一批 |
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

### Docker 一键启动前后端

已落地 Docker Compose 编排能力：

- `docker-compose.yml` 编排 `web` 和 `analytics` 两个服务。
- 根目录 `Dockerfile` 使用多阶段构建，先构建前端产物，再启动 Express 服务。
- `python-analytics-service/Dockerfile` 使用 Python 3.13 运行 FastAPI 分析服务。
- `.dockerignore` 排除本地依赖、构建产物和环境变量文件。
- `.env.example` 增加 Docker 场景下 `VITE_PYTHON_API_URL` 的说明。
- README 已补充 Docker 启动、停止、日志查看和健康检查说明。

验证结果：

- `docker compose build` 可以完成镜像构建。
- `docker compose up -d` 可以启动前端、BFF 和 Python 分析服务。
- `http://localhost:8080` 返回 Web 首页。
- `http://localhost:8001/health` 返回 Python 服务健康状态。
- `npm run build` 通过。
- `npm run lint` 退出码为 0，但仍保留既有 warning。

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
    aiProviderConfig.ts
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
- 新开发者不需要通读整个项目，也能定位对应模块。
