# 监控交互、分析与可读报告实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复监控首页、地图点位、分析服务、AI 首包等待态和报告导出体验，并同步项目文档。

**Architecture:** 在现有 MapState 与 Mapbox LOD 边界中补齐聚合和单点点击处理；Python 服务保持稳定响应信封，客户端继续执行严格领域解析。AI 会话延迟创建助手消息，报告由独立的浏览器 HTML 文档生成器输出，避免新增运行时服务或依赖。

**Tech Stack:** React 19、TypeScript 5、Mapbox GL JS、Vitest/React Testing Library、FastAPI、Python unittest、Vite、Playwright。

## Global Constraints

- 使用现有 `MapStateProvider`、`UIStateProvider` 和 `Hazard` 模型，不引入状态库、报表服务或 PDF 库。
- 报告下载格式固定为 UTF-8 HTML，并使用文本转义处理用户输入和外部灾害字段。
- 分析客户端必须继续拒绝畸形 JSON；通过服务端规范化与跨语言契约测试解决响应失配。
- 保持 Popup 的 DOM/textContent 输出安全策略，不使用 `setHTML()`。
- 所有新增 Conventional Commit 主题使用英文；未经用户明确要求不得暂存、提交、合并或推送。
- 每项行为变更均先写失败测试，再写最小实现，再运行对应测试。

---

## 文件结构

| 文件                                                                                                    | 责任                                                 |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/components/Header.tsx`、`src/components/StatusPanel.tsx`、`src/index.css`                          | 首页标题、说明与无障碍筛选控件的布局和视觉。         |
| `src/features/map/hooks/useHazardLodLayers.ts`                                                          | 聚合点展开与未聚合 GeoJSON 点的 Popup 交互。         |
| `src/features/map/utils/hazardGeojson.ts`                                                               | 为 LOD 单点保留按 id 查找原领域对象所需的稳定标识。  |
| `python-analytics-service/app/services/analytics_service.py`                                            | 将算法输出规范为客户端三类核心领域契约可接受的数据。 |
| `python-analytics-service/tests/test_api_routes.py`、`tests/service-analytics-domain-contracts.test.ts` | 验证 FastAPI 成功信封和前端领域解析器。              |
| `src/hooks/useAIChatSession.ts`、`src/components/AIChatAssistant.tsx`                                   | 首个非空 SSE 分片前的等待态和消息生命周期。          |
| `src/components/SaveReportModal.tsx`、`src/utils/reportHtml.ts`                                         | 可读、安全、可打印的 HTML 报告生成与浏览器下载。     |
| `tests/component/*.test.tsx`、`tests/e2e/app-smoke.spec.ts`                                             | 组件和浏览器层面回归验证。                           |
| `README.md`、`docs/PROJECT_OPTIMIZATION_BACKLOG.md`、`AGENTS.md`                                        | 当前能力、遗留项和英文提交主题规则。                 |

## Task 1: 首页布局和筛选控件

**Files:**

- Modify: `src/components/Header.tsx`
- Modify: `src/components/StatusPanel.tsx`
- Modify: `src/index.css`
- Modify: `tests/component/status-panel.test.tsx`
- Modify: `tests/e2e/app-smoke.spec.ts`

**Interfaces:**

- Consumes: `useMapState(): { filter, hazards, refresh, setFilter }`。
- Produces: 具有 `status-filter-control` 包裹层和 `status-filter-chevron` 装饰元素的原生 `select`；`platform-title` 与 `.status-panel` 在桌面端同左边距。

- [ ] **Step 1: 写入失败的组件与端到端断言。**

  在 `status-panel.test.tsx` 断言新副标题“实时监测全球环境灾害动态”、`select` 仍可通过“按类型筛选”标签取得，并存在 `aria-hidden="true"` 的 `.status-filter-chevron`。在 `app-smoke.spec.ts` 获取 `.platform-title` 与 `.status-panel` 的 bounding box，断言 `x` 相等。

- [ ] **Step 2: 运行失败测试。**

  Run: `pnpm run test:component -- tests/component/status-panel.test.tsx && pnpm run test:e2e -- app-smoke.spec.ts`
  Expected: 副标题、筛选装饰元素和标题坐标断言失败。

- [ ] **Step 3: 最小实现。**

  在 `Header` 保留标题文本并让 `.header-content` 撑满可用宽度，移除居中 `max-width` 的布局限制。将 `StatusPanel` 的 `select` 包入 `span.status-filter-control`，在后方添加无交互 SVG chevron；改写副标题。CSS 对 select 设置 `appearance: none` 和右侧内边距，chevron 绝对定位且 `pointer-events: none`，并保持焦点样式由 select 承担。

- [ ] **Step 4: 运行通过测试。**

  Run: `pnpm run test:component -- tests/component/status-panel.test.tsx && pnpm run test:e2e -- app-smoke.spec.ts`
  Expected: 两个目标测试通过，筛选仍可选择 `FLOOD`。

## Task 2: Mapbox 聚合与单点 Popup

**Files:**

- Modify: `src/features/map/hooks/useHazardLodLayers.ts`
- Modify: `tests/component/map-view.test.tsx`

**Interfaces:**

- Consumes: `MAP_SOURCE_IDS.lod`、`MAP_LAYER_IDS.clusters`、`MAP_LAYER_IDS.unclustered`、`Hazard[]` 和 `createHazardPopupContent(hazard)`。
- Produces: 聚合点击调用 `GeoJSONSource.getClusterExpansionZoom(clusterId, callback)` 后执行 `map.easeTo({ center, zoom })`；未聚合 LOD 点按 `feature.properties.id` 找到 `Hazard` 后创建并添加安全 Popup。

- [ ] **Step 1: 写入失败的 Mapbox 交互测试。**

  扩展 Mapbox mock，记录带 layer id 的 `map.on` 回调、`getClusterExpansionZoom`、`easeTo` 与 `Popup.addTo`。触发 clusters click 回调，断言读取 `cluster_id` 并以 feature 经纬度和展开 zoom 调用 `easeTo`；触发 unclustered click 回调，断言 Popup 收到 `createHazardPopupContent` 生成的 DOM 内容。

- [ ] **Step 2: 运行失败测试。**

  Run: `pnpm run test:component -- tests/component/map-view.test.tsx`
  Expected: 不存在 layer click handler 或地图未调用 `easeTo`/Popup `addTo`。

- [ ] **Step 3: 最小实现。**

  在 `useHazardLodLayers` 中增加绑定和解绑两个 layer click handler 的 effect：clusters handler 从事件 feature 提取有限整数 `cluster_id` 和 Point 坐标，调用 source 的展开缩放 API 后 `easeTo`；unclustered handler 用 id 在 `hazards` 中定位原始对象，以 `event.lngLat` 和安全 DOM 内容创建 `mapboxgl.Popup`。仅在 source/layer 已存在且非热力图可见状态执行交互，并在 cleanup 中用相同参数 `off`。

- [ ] **Step 4: 运行通过测试。**

  Run: `pnpm run test:component -- tests/component/map-view.test.tsx tests/component/hazard-popup-content.test.tsx`
  Expected: 聚合展开、单点安全 Popup 和既有 XSS 防护全部通过。

## Task 3: 分析响应契约闭环

**Files:**

- Modify: `python-analytics-service/app/services/analytics_service.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Modify: `tests/component/use-analytics-data.test.tsx`

**Interfaces:**

- Consumes: `StatisticalAnalyzer.run_comprehensive_analysis`、`PredictionEngine.generate_predictions`、`RiskAssessor.calculate_comprehensive_risk` 的算法输出。
- Produces: 统计、预测与风险接口稳定返回 `{ "success": true, "data": T }`，其中 `T` 可分别由 `parseStatistics`、`parsePredictions`、`parseRiskAssessment` 成功解析。

- [ ] **Step 1: 写入失败的真实路由输出测试。**

  在 Python 路由测试中使用代表性 `HAZARD` 调用三个实际 service 方法，断言每个响应含 `success: true` 和 `data`。在 TypeScript 契约测试增加与 Python 规范化输出一致的统计、预测、风险 fixtures，并依次传给三个解析器；在 hook 测试中模拟任一核心请求的 `AnalyticsContractError`，断言通知为“分析失败 / 分析服务返回的数据格式异常，请稍后重试。”且不填充不完整结果。

- [ ] **Step 2: 运行失败测试。**

  Run: `pnpm run test:python && pnpm run test:services -- tests/service-analytics-domain-contracts.test.ts && pnpm run test:component -- tests/component/use-analytics-data.test.tsx`
  Expected: 当前算法输出中的缺失、非有限或不符合判别联合字段导致至少一个领域解析断言失败。

- [ ] **Step 3: 最小实现。**

  在 `AnalyticsService` 增加私有规范化边界，仅规范化统计、预测、风险的响应：递归转换 NumPy 标量为 Python 标量、将非有限数转换为 `None`，为不可用预测模型补齐 `status/reason/dataPoints/minimumDataPoints/confidence`，为风险结果补齐 `temporalRisks`、`recommendations`、`recommendationDetails` 及其安全默认值。保留已有响应信封和算法核心，不在客户端降低 `parse*` 严格度。

- [ ] **Step 4: 运行通过测试。**

  Run: `pnpm run test:python && pnpm run test:services -- tests/service-analytics-domain-contracts.test.ts && pnpm run test:component -- tests/component/use-analytics-data.test.tsx`
  Expected: 实际路由响应与三类 TypeScript 领域解析器均通过；契约错误通知仍只在畸形响应时出现。

## Task 4: AI 首包等待态与 HTML 报告

**Files:**

- Create: `src/utils/reportHtml.ts`
- Modify: `src/hooks/useAIChatSession.ts`
- Modify: `src/components/AIChatAssistant.tsx`
- Modify: `src/components/SaveReportModal.tsx`
- Modify: `tests/component/ai-chat-assistant.test.tsx`
- Modify: `tests/component/app-state-ownership.test.tsx`
- Create: `tests/service-report-html.test.ts`

**Interfaces:**

- Consumes: `streamChatMessage(..., { onChunk })`、`SaveReportPayload`、当前 `Hazard[]` 和筛选值。
- Produces: `buildReportHtml(payload: SaveReportPayload & { timestamp: string }): string`；会话仅在第一个非空 chunk 时追加助手 `ChatMessage`。

- [ ] **Step 1: 写入失败测试。**

  在 AI 测试中使 `streamChatMessage` 保持 pending，提交问题后断言用户消息存在、`AI 正在生成分析结果` 存在、没有 `.ai-bubble-ai` 与 `.ai-cursor`；调用捕获的 `onChunk("首段")` 后断言助手气泡和光标出现；失败与取消前无分片时断言无空白气泡。为报告工具写入包含 `<script>`、`&` 和缺失字段的 payload，断言 HTML 含转义文本、摘要、类型汇总、明细表与打印 CSS。更新 app state 测试，断言下载名以 `.html` 结尾、Blob 内容为 HTML，且弹窗文案不再提 JSON。

- [ ] **Step 2: 运行失败测试。**

  Run: `pnpm run test:services -- tests/service-report-html.test.ts && pnpm run test:component -- tests/component/ai-chat-assistant.test.tsx tests/component/app-state-ownership.test.tsx`
  Expected: 当前会话在发送时追加空助手消息，当前下载名为 `.json`，断言失败。

- [ ] **Step 3: 最小实现。**

  在会话 hook 中保存 pending assistant 元数据而不立即写入 `messages`；首个 `chunk.trim()` 非空时追加带该内容的流式助手消息，后续分片更新它。让 completed/cancelled/failed 分支在未创建助手消息时只清理请求状态。实现 `escapeHtml`、安全时间/字段格式化、类型计数和静态打印样式的 `buildReportHtml`；`SaveReportModal` 使用 `text/html;charset=utf-8` Blob 和 `.html` 文件名下载。

- [ ] **Step 4: 运行通过测试。**

  Run: `pnpm run test:services -- tests/service-report-html.test.ts && pnpm run test:component -- tests/component/ai-chat-assistant.test.tsx tests/component/app-state-ownership.test.tsx`
  Expected: 首包前没有助手气泡，首包后正常流式显示；HTML 报告可读、安全、扩展名正确。

## Task 5: 项目文档、协作规则与完整验证

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `AGENTS.md`
- Modify: `docs/superpowers/specs/2026-09-15-monitoring-interaction-and-reporting-design.md`

**Interfaces:**

- Consumes: Tasks 1–4 的最终用户行为、实际测试计数和验证结果。
- Produces: 与实现一致的中英文 README、最新优化矩阵和英文提交主题项目规则。

- [ ] **Step 1: 写入文档一致性检查。**

  使用 `rg -n "JSON report|JSON 报告|JSON 文件" README.md docs/PROJECT_OPTIMIZATION_BACKLOG.md` 建立零结果断言；检查 README 两种语言都说明 HTML 报告可打印，地图说明包含聚合展开与单点 Popup；检查待优化清单将报告闭环和核心 Analytics 响应契约标为完成，并保留包体积、可访问性、可观测性和部署前安全项。

- [ ] **Step 2: 运行失败检查。**

  Run: `rg -n "JSON report|JSON 报告|JSON 文件" README.md docs/PROJECT_OPTIMIZATION_BACKLOG.md`
  Expected: 找到现有 JSON 报告描述。

- [ ] **Step 3: 最小实现。**

  更新 README 中英文的报告、地图与 AI 描述和测试数字；将 backlog 核对日期改为实施当天，把本轮已完成能力和优先级矩阵更新到真实状态，明确尚余项目。将 `AGENTS.md` 的 Git 与提交章节补充“提交主题（`type(scope): subject` 的 `subject`）必须使用英文”。同步规格文档的最终验证状态。

- [ ] **Step 4: 完整验证。**

  Run: `pnpm run lint && pnpm run format:check && pnpm test && pnpm run test:component && pnpm run typecheck:client && pnpm run typecheck:server && pnpm run typecheck:contracts && pnpm run build && git diff --check`
  Expected: 所有命令退出码为 0。若 BFF 或 Playwright 需绑定端口，使用受控环境；记录实际测试文件和测试数。
