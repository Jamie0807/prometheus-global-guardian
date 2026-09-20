# 全球灾害可视化开源项目调研与优化建议

## 1. 文档定位

本文档记录国内外开源灾害可视化、应急协同、风险分析和卫星灾后评估项目的公开技术栈与架构，并与 Prometheus Global Guardian 当前实现进行对比。

调研资料主要来自项目官方 GitHub 仓库、README、架构文档和官方开发文档。文档总结的是公开声明的主要技术栈和架构，不逐项罗列每个项目的传递依赖。外部项目可能持续演进，实施前应重新核对其当前版本和许可证。

本次只做调研，不修改代码、数据库、Docker 配置或项目待优化清单。

## 2. 调研结论

当前项目已经具备比较完整的产品雏形：React 前端、Mapbox 地图、deck.gl 扩展、Express BFF、FastAPI 分析服务、多源灾害数据、AI SSE 和多层测试均已存在。

与成熟项目相比，最值得补强的部分不是更换前端框架或地图引擎，而是数据基础设施：

1. 统一灾害事件和图层数据模型；
2. 将数据采集从用户请求路径中解耦；
3. 为分析结果建立版本化跨语言契约；
4. 已在单实例范围增加 SSE 断连后的自动恢复和幂等处理，跨实例共享仍需后续设计；
5. 根据历史查询需求选择 PostgreSQL + PostGIS；
6. 增加数据源新鲜度、分析运行记录和模型版本信息；
7. 在数据量增长后引入矢量瓦片、服务端聚合和缓存；
8. 如果产品扩展到应急处置，再增加任务、角色、审核和协作能力。

数据库不是当前项目的必选项。只关注当前灾害状态和未来预测时，内存缓存加原始快照仍然可行；需要历史查询、时间回放、结果对比、审计、长期趋势或模型复现时，再引入持久化存储更合适。

## 3. 当前项目基线

当前项目的主要架构如下：

```text
React + TypeScript + Vite
          │
          ▼
Mapbox GL JS + deck.gl + Web Worker
          │
          ▼
Express BFF
          ├── 灾害数据聚合
          ├── DisasterAware 服务端授权
          ├── AI 请求代理
          └── SSE 流式响应
          │
          ▼
FastAPI 分析服务
          ├── Pandas / NumPy
          ├── SciPy / Statsmodels
          ├── scikit-learn
          ├── 统计分析
          ├── 预测分析
          ├── 风险评估
          └── 数据质量评估
```

当前项目已经具备：

- React 19、TypeScript、Vite；
- Mapbox GL JS、deck.gl、3D Tiles 扩展能力；
- Web Worker 数据处理、地图聚合、热力图和 LOD；
- Express BFF 与 FastAPI 分层；
- USGS、NASA EONET、GDACS 等灾害数据源；
- 前端请求取消、竞态保护和数据源失败降级；
- SSE AI 流式响应、Vitest、Playwright 和 Python 测试；
- 前后端边界解析和部分跨语言 JSON 契约。

当前项目仍然缺少完整的历史数据层、数据采集 Worker、统一图层注册表、分析结果版本化契约和集中式可观测性；AI SSE 可恢复会话已经在单实例内落地，跨实例共享仍未覆盖。

## 4. 国外开源项目

### 4.1 实时灾害监测和地图展示

| 项目                                                             | 主要技术栈                                                                        | 架构与数据能力                                                                                                                                             | 对当前项目的借鉴价值                                                                                   |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [DVS-Asia / DisasterViz](https://github.com/Vishmayraj/DVS-Asia) | Leaflet、原生 HTML/CSS/JavaScript、FastAPI、PostgreSQL/Supabase、Python           | NASA FIRMS、USGS、GDACS 由独立 Python 脚本采集，GitHub Actions 定时执行，数据写入 PostgreSQL；支持地震、火灾、GDACS 几何数据，前端用 Canvas 承载大量火点。 | 最接近当前项目的数据管道参考。可借鉴采集与查询分离、当前表与历史表、数据去重、批量写入和数据源新鲜度。 |
| [ResilienceMap](https://github.com/henok256/resiliencemap)       | Python、GeoPandas、Requests、FastAPI、PostgreSQL/PostGIS、Leaflet、Docker Compose | FEMA、USGS、NOAA、NIFC、HIFLD、CDC 等数据经过独立采集和空间处理后进入 PostGIS；API 输出风险、灾害、预警和 GeoJSON；风险评分方法公开。                      | 可借鉴空间数据库、数据源分层、风险权重公开、实时数据与年度数据分离。                                   |
| [Terra Watch](https://github.com/cifertech/Terra-Watch)          | React、CesiumJS、NASA EONET、USGS、NOAA、NASA GIBS、静态部署                      | 无独立后端，浏览器直接读取公开数据；提供 3D 地球、时间轴、卫星图层、人口覆盖、AI 对话和历史时间机。                                                        | 说明公开演示可以采用纯前端架构，但也暴露出第三方限流、历史完整性、权限和审计能力不足的问题。           |
| [NASA Worldview](https://github.com/nasa-gibs/worldview)         | React、OpenLayers、Redux、Webpack、Express、NASA GIBS WMS/WMTS、Jest、Playwright  | 以配置驱动图层目录，支持近实时和多年代影像、时间控制、下载、动态 WMS/WMTS 图层和多种地图操作。                                                             | 最值得借鉴图层注册表、时间维度、动态元数据和配置驱动地图能力。                                         |
| [Vegvisir](https://github.com/ArjunRAj77/Vegvisir)               | Next.js、MapLibre、Zustand、React Three Fiber、服务端 API 路由                    | 面向区域灾害情报，使用 Open-Meteo、GDACS、USGS、NASA GIBS 等公开源；支持数据层级、降级策略、边缘缓存和透明风险权重。                                       | 可借鉴 LIVE/SAMPLE 数据标记、源可用性、公开风险公式、边缘缓存和降级提示。                              |

### 4.2 应急协同和态势管理

| 项目                                                             | 主要技术栈                                                              | 架构与能力                                                                             | 对当前项目的借鉴价值                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [HOT Tasking Manager](https://github.com/hotosm/tasking-manager) | React、Python API/FastAPI、PostgreSQL/PostGIS、MapLibre、Docker Compose | 支持区域划分、任务分配、地图编辑、审核、质量检查、OSM OAuth2 和分析接口。              | 如果项目扩展到应急处置，可借鉴事件状态、任务、角色、审核和空间数据库。                                         |
| [Sahana Eden](https://github.com/sahana/eden)                    | Python、web2py、HTML5/JavaScript/SCSS、SQLite/PostgreSQL/MySQL/PostGIS  | 数据库驱动的人道主义应急管理系统，覆盖人员、资源、组织、工作流、权限、导入导出和 GIS。 | 可借鉴领域模块、权限、资源管理和流程建模；不适合作为当前地图渲染技术基线。                                     |
| [Ushahidi Platform](https://github.com/ushahidi/platform)        | 多渠道采集、REST API、PHP/Kohana/MySQL；客户端独立仓库                  | 接收 SMS、Twitter、RSS、Email 和 Web 信息，进行地理编码、分类和地图发布。              | 可借鉴多渠道数据采集、来源追踪和 API/客户端分离。当前资料中的 AngularJS 三层架构属于旧版文档，应视为历史参考。 |
| [Zivilschutz-Karte](https://github.com/zskarte/zskarte)          | Angular、Node、Strapi、PostgreSQL、Docker、Azure AKS                    | 民防态势地图，支持绘制、地图供应商、权限、本地存储和实时协作。                         | 可借鉴协作标注、地图编辑和民防业务工作流。                                                                     |

### 4.3 风险分析和灾后评估

| 项目                                                                    | 主要技术栈                                                                                                                      | 架构与能力                                                                                     | 对当前项目的借鉴价值                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [HASTE](https://github.com/microsoft/haste)                             | React/Vite、Python Azure Functions、队列 Worker、FastAPI/TiTiler、Cloud Optimized GeoTIFF、Blob Storage、Cosmos DB、Azure Batch | 将交互 API、异步任务、栅格瓦片和 GPU/CPU 计算拆开，适合卫星影像损毁评估。                      | 如果未来加入遥感影像或重型模型，应采用任务队列、后台 Worker、对象存储和瓦片服务。            |
| [InaSAFE](https://github.com/inasafe/inasafe)                           | Python、QGIS API、GIS 数据、影响模型、Python unittest                                                                           | QGIS 插件，执行自然灾害影响场景和风险计算，强调确定性模型、数据输入和可复现结果。              | 可借鉴影响函数、领域模型、输入数据说明和可复现计算。                                         |
| [OpenQuake Engine](https://github.com/gem/oq-engine)                    | Python、NumPy、SciPy、hazardlib、risklib、HDF5、分布式计算                                                                      | 以计算任务为中心，核心计算主要在内存中完成，每次计算使用 HDF5 数据存储短期缓存和复现结果。     | 直接说明分析系统可以暂时不依赖数据库；但需要保存计算快照和结果时，文件型持久化也可作为过渡。 |
| [RiskScape](https://engine-docs.sites.riskscape.nz/intro/overview.html) | Java 17、Gradle、GeoTools、JTS、Picocli、插件架构、PostGIS、Python 插件                                                         | 多灾种空间风险分析引擎和 CLI，采用插件化处理，并把结果输出为 GeoPackage、GeoTIFF、CSV 等文件。 | 可借鉴计算引擎与可视化前端解耦、插件式处理和可复现文件输出。                                 |

## 5. 国内开源项目

国内开源项目中，完整覆盖“全球灾害数据采集、空间数据库、风险计算、前端展示”的项目较少，更多是 WebGIS、气象大屏、3D 城市或单灾种客户端。因此以下项目主要作为前端、空间交互和产品结构参考。

| 项目                                                                  | 主要技术栈                                                                    | 架构与能力                                                                                                   | 对当前项目的借鉴价值                                                                          |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [NEGIAO WebGIS-Dev](https://github.com/NEGIAO/WebGIS-Dev)             | Vue 3、TypeScript、Vite、OpenLayers、Cesium、FastAPI、Shapely、Docker         | 支持 2D/3D 状态同步、URL 分享和恢复、多种底图、GeoJSON/KML/SHP/GLB/CZML/3D Tiles、空间分析、风场和洪水模拟。 | 可借鉴 2D/3D 状态统一、图层组织、URL 状态恢复和架构文档；当前项目不必因此切换 Vue 或 Cesium。 |
| [SmartCity-vue-cesium](https://github.com/yuya6/SmartCity-vue-cesium) | Vue 3、TypeScript、Vite、Cesium、CustomShader、Canvas、SVG、Nginx/静态部署    | 3D 城市大屏，包含地形和建筑 LOD、流程动画、时间轴、热力图和告警展示。                                        | 适合参考 WebGL 场景组织、LOD、大屏视觉和图表地图联动，不适合作为实时灾害后端基线。            |
| [MeteoRadar](https://github.com/godnesszsp/meteo-radar)               | Vue 3、TypeScript、Vite、ECharts、Naive UI、Pinia、UnoCSS、Vue Router、VueUse | 气象雷达地图、预警列表、统计图、AI 对话和多页面仪表盘，配有产品、API、架构和部署文档。                       | 可借鉴预警中心布局、地图与图表联动、AI 助手入口和模块化产品文档。                             |
| [kanameishi](https://github.com/Lipomoea/kanameishi)                  | Vite、Vue 3、Leaflet、Tauri、Windows/macOS、多国地震公开 API                  | 多来源地震信息客户端，明确标注非官方数据和各数据源限制。                                                     | 可借鉴多源地震适配、桌面端复用和数据来源声明。                                                |

## 6. 与当前项目的差距

### 6.1 数据模型和图层注册表

当前项目的灾害数据、地图图层、统计图和 AI 上下文之间仍存在字段转换。建议建立统一事件模型：

```ts
type DisasterEvent = {
  eventId: string;
  source: string;
  sourceEventId: string;
  hazardType: string;
  observedAt: string;
  updatedAt: string;
  ingestedAt: string;
  geometry: GeoJSON.Geometry;
  severity?: number;
  magnitude?: number;
  confidence?: number;
  properties: Record<string, unknown>;
  schemaVersion: string;
};
```

同时建立数据源和图层注册表：

```ts
type HazardLayerDefinition = {
  id: string;
  label: string;
  source: string;
  geometryType: "point" | "polygon" | "raster";
  freshness: number;
  supportsTime: boolean;
  style: unknown;
  legend: unknown;
};
```

地图、统计、数据质量和 AI 可以共享注册表，减少多个组件各自维护灾害类型、颜色、图例和字段映射。

### 6.2 数据采集与 BFF 解耦

建议逐步演进为：

```text
定时采集 Worker
      │
      ├── USGS
      ├── NASA EONET
      ├── GDACS
      └── 其他数据源
      │
      ▼
标准化、去重、质量检查
      │
      ▼
缓存 / PostgreSQL / PostGIS
      │
      ▼
BFF 查询和 SSE 推送
```

这样可以避免每个用户请求都触发上游请求，也可以记录数据源更新时间、失败次数和原始响应快照。

### 6.3 数据库和历史数据

建议采用三层存储，而不是把所有数据直接写入数据库：

```text
原始层：对象存储 / JSON / Parquet
标准层：PostgreSQL + PostGIS
缓存层：Redis 或应用内缓存
```

可考虑的核心表：

```text
hazard_events
hazard_event_snapshots
data_sources
ingestion_runs
analysis_runs
risk_assessments
```

如果暂时只需要当前状态，可以先建立“当前状态表 + 原始快照文件”；确定需要历史回放和长期统计后，再增加归档表和时间分区。

### 6.4 SSE 断连自动恢复

项目已采用 requestId、事件序号和有限重放实现单实例 SSE 自动恢复：

```text
客户端生成 requestId
        │
        ▼
服务端发送 seq/eventId
        │
        ▼
客户端记录最后成功序号
        │
        ▼
连接断开
        │
        ▼
指数退避 + 随机抖动重连
        │
        ▼
携带 requestId 和 lastEventId 恢复
        │
        ▼
服务端重放缓存事件或幂等重启任务
```

模型生成结果不能默认从任意位置恢复。服务端应缓存最近事件，超过缓存窗口后返回“任务已过期，需要重新执行”；前端必须对重复片段去重。

### 6.5 Analytics 响应契约

建议所有分析接口使用统一结果信封：

```json
{
  "schemaVersion": "1.0",
  "requestId": "xxx",
  "generatedAt": "2026-09-19T10:00:00Z",
  "modelVersion": "risk-v2",
  "inputSnapshotId": "snapshot-xxx",
  "data": {},
  "warnings": [],
  "coverage": {},
  "confidence": {},
  "error": null
}
```

配套增加 OpenAPI、JSON Schema、Pydantic 模型、TypeScript 类型生成、契约测试和真实响应快照测试，可以减少“分析服务返回的数据格式异常”。

### 6.6 空间数据规模化

当前 Mapbox + deck.gl + Web Worker 已适合现有规模。数据量继续增长后再考虑：

- PostGIS 空间查询；
- GeoJSON 分页；
- MVT 矢量瓦片；
- PMTiles；
- 服务端聚合和 Supercluster；
- 按缩放级别返回不同精度；
- Redis 和 CDN 缓存。

不建议仅因为其他项目使用 Cesium 就切换地图引擎。除非产品明确需要全球地形、卫星轨道、三维建筑或复杂三维空间分析，当前 Mapbox + deck.gl 更符合项目现状。

### 6.7 风险模型可解释性

每次风险分析应包含：

- 数据源；
- 数据更新时间；
- 模型版本；
- 权重；
- 适用区域；
- 数据缺失情况；
- 置信度和不确定性；
- 是否使用降级数据。

风险结果不应只有一个分数，还应能解释极端天气、地震、洪水、暴露人口和社会脆弱性分别贡献了多少。

### 6.8 可观测性和安全

建议增加：

- 数据源成功率、延迟和最后更新时间；
- BFF 和 Python 请求耗时；
- SSE 连接数和重连次数；
- 分析失败原因；
- 缓存命中率；
- 地图数据量和前端首屏时间；
- WebGL 帧率和内存情况；
- requestId、traceId、source、modelVersion。

如果未来公网部署，还需要补充浏览器用户身份、角色授权、共享限流、集中错误上报、CORS 和 CDN 策略。

## 7. 分阶段路线

### 第一阶段：稳定性和契约

1. Analytics 响应契约版本化；
2. 前端、BFF、Python 契约测试；
3. 统一灾害事件模型；
4. 数据源健康检查和新鲜度字段；
5. 分析失败返回错误码、requestId 和可读提示。

### 第二阶段：历史和可追溯数据

在确认历史查询需求后实施：

1. PostgreSQL + PostGIS；
2. 当前数据和历史数据分离；
3. 定时采集 Worker；
4. 原始数据快照；
5. 数据源运行记录；
6. 分析运行和风险结果版本化。

### 第三阶段：规模和性能

1. MVT 或 PMTiles；
2. 服务端聚合；
3. Redis 和 CDN；
4. 图层注册表；
5. 前端包体积预算和分包；
6. WebGL、Worker 和地图查询性能指标。

### 第四阶段：应急协同能力

只有产品范围扩展后再考虑：

- 用户和角色；
- 事件生命周期；
- 任务分派；
- 协作标注；
- 审核流程；
- 资源管理；
- 操作日志；
- 离线 PWA；
- 多租户。

## 8. 暂时不建议做的事情

- 因为其他项目使用数据库就立即引入数据库；
- 把 React 全部改成 Vue；
- 把 Mapbox 全部改成 Cesium；
- 为了实时推送直接引入 Socket.IO；
- 将所有分析逻辑迁移到 Express；
- 让浏览器直接连接所有第三方数据源；
- 立即引入 GPU 集群、复杂消息队列或云厂商专用服务；
- 在监控产品尚未稳定前加入完整的应急管理模块。

## 9. 最终建议

当前项目优先建设的顺序应是：

```text
统一数据模型
      ↓
数据源注册与采集
      ↓
数据质量和新鲜度
      ↓
可选的历史存储
      ↓
统一分析结果契约
      ↓
SSE 可恢复推送
      ↓
空间数据服务和性能优化
```

下一步最高优先级建议为（SSE 单实例恢复已完成）：

1. Analytics 响应契约版本化；
2. 统一灾害事件和图层注册表；
3. 数据源健康检查；
4. 完成 PostgreSQL/PostGIS 技术设计，待历史查询需求确认后落地。
