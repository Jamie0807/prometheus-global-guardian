# 前端边界类型治理第二阶段设计方案

日期：2026-09-10
状态：设计已确认，待实施。
需求级别：正式规格，作为第一阶段的增量交付。

## 1. 目标

第一阶段已经覆盖当前 React 核心分析链路的 8 个接口。本阶段继续治理其余 Analytics Service 响应，使未迁移接口也遵循“HTTP 响应 → `unknown` → 端点解析器 → 明确领域类型 → 调用方”的边界规则，减少旧的 `AnalyticsResult` 泛型兜底和直接响应断言。

本阶段不修改 Python 算法、公开请求参数、Hazard/AI Service、通用 HTTP 客户端或跨语言模型生成工具。Hazard/HTTP 边界和跨语言契约另列后续批次。

## 2. 范围

### 2.1 接口清单

| Service 方法               | API 路径                          | 本阶段目标类型              |
| -------------------------- | --------------------------------- | --------------------------- |
| `getServiceInfo`           | `/`                               | `AnalyticsServiceInfo`      |
| `processETL`               | `/api/v1/etl/process`             | `ETLProcessData`            |
| `getComprehensiveAnalysis` | `/api/v1/analyze`                 | `ComprehensiveAnalysisData` |
| `transformToUnifiedModel`  | `/api/v1/unified-model/transform` | `UnifiedTransformData`      |
| `mergeMultiSourceData`     | `/api/v1/unified-model/merge`     | `UnifiedMergeData`          |
| `getQualityHistory`        | `/api/v1/quality/history`         | `QualityHistoryData`        |
| `multiDimensionalQuery`    | `/api/v1/pivot/query`             | `PivotQueryData`            |
| `get4DSummary`             | `/api/v1/pivot/summary`           | `PivotSummaryData`          |

### 2.2 Python 真实响应结构

- 服务信息：根对象包含 `service`、`status`、`version` 和 `features`；`features` 是字符串数组。
- ETL：`processedData` 为记录数组，可包含 `coordinates` 等嵌套 JSON 值；`qualityMetrics` 为 API 转换后的 camelCase 质量展示对象，`recordsProcessed` 为非负整数。
- 综合分析：`statistics`、`predictions`、`riskAssessment`、`dataQuality`、`processingInfo` 和 `performance` 为固定区块；领域子对象复用第一阶段已验证类型，`processingInfo.totalRecords` 为非负整数。
- 统一模型转换：`records` 为记录数组，`total_records` 为非负整数，`schema` 为字符串数组，`source` 为字符串。
- 多源合并：`unified_records` 为记录数组，`total_records` 为非负整数，`source_records` 为计数字典；`merged_quality` 与 `source_quality_reports` 是 `quality_monitor` 的原始 snake_case 报告，`source_comparison` 固定包含来源概览、分数字典与最佳/最差来源。
- 质量历史：`history` 为 `quality_monitor` 的原始 snake_case 质量报告数组，`count` 为非负整数；前端边界将字段映射为明确 camelCase 类型并保留受验证的维度附加信息。
- 多维查询：`results` 为记录数组，`total_count` 为非负整数，`query_params` 回显时间范围、区域、类型和严重性筛选。
- 4D 汇总：包含 `total_records`、`time_range`、地域/类型/严重性分布及维度计数；时间范围天数和所有计数字典值均为非负整数。

平铺记录只允许 JSON 标量值：`string | number | boolean | null`。Python 已定义会返回嵌套值的记录（例如 ETL `coordinates` 和历史维度详情）使用递归 JSON 守卫；所有数字必须有限，未知字段可以保留在已验证的记录中。

## 3. 架构与迁移

### 3.1 解析器

在 `src/services/analytics/contracts/` 新增按领域拆分的解析模块：`serviceInfo.ts`、`etl.ts`、`comprehensive.ts`、`unified.ts`、`qualityHistory.ts`、`pivotQuery.ts`、`pivotSummary.ts`。解析器只依赖 `common.ts` 和第一阶段领域解析器，不依赖 React 或浏览器全局。

所有固定字段使用现有守卫校验；记录数组按其实际响应结构使用平铺或递归 JSON 值解析器；动态字典键只使用安全占位路径，不能把外部键拼进用户可见错误文案。字段缺失、已出现错型、损坏 JSON 和成功响应中包含业务错误对象均抛出稳定契约错误。

### 3.2 Service

除根路径 `getServiceInfo` 外，每个本阶段方法将 `response.json()` 结果先保存为 `unknown`，调用 `parseAnalyticsSuccess` 和对应领域解析器后返回 `AnalyticsSuccess<T>`。`getServiceInfo` 的 FastAPI 根路由不使用 `{ success, data }` 外壳，直接由 `parseAnalyticsServiceInfo` 解析并返回 `AnalyticsServiceInfo`。契约错误不重试；HTTP/网络错误继续沿用现有稳定错误语义。

旧 `AnalyticsResult` 仅保留给明确尚未迁移的接口；本阶段 8 个方法全部切换到明确返回类型。

### 3.3 调用方

先搜索实际调用点。存在调用方的接口迁移到明确领域类型；无调用方的接口完成 Service 契约和测试即可，不新增展示 UI。现有 4D 查询/汇总调用只消费已验证结果，不扩大页面职责。

## 4. 错误与安全语义

- `AnalyticsContractError` 表示 JSON 形状、字段类型或范围不合法，固定错误 code 和安全 path。
- `AnalyticsBusinessError` 表示 `success: false` 的服务业务失败，不携带服务端响应正文。
- 外部响应内容不写入日志和用户通知；通知只使用固定中文文案。
- 合法空数组、空历史、零计数和无记录合并结果保留为空结果语义，不转换为错误或伪造默认数据。

## 5. 测试与验收

每个领域先写失败测试，再实现最小解析器。测试必须覆盖：

- Python 真实成功结构和未知字段兼容。
- 缺失必填字段、已出现错型、未声明的嵌套对象、字符串数字、负数/小数计数和非有限数字。
- 损坏 JSON、`success: false`、业务错误对象和安全错误文案。
- 合法空记录、零计数、空历史和无数据合并。
- 所有 8 个 Service 方法的 JSON 边界接入。

完成前运行：

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

`pnpm test` 如继续受当前沙箱禁止监听 `0.0.0.0` 的限制，必须记录实际失败和可执行的非监听验证，不得将等价子集描述为全量通过。

## 6. 非目标与后续

- 不修改 Python 算法、FastAPI 路由、公开请求参数、Hazard/AI Service 和通用 HTTP 客户端。
- 不在本阶段引入 Zod 等新 schema 依赖。
- Hazard/通用 HTTP 边界、旧兼容路径清理、跨语言契约生成和统一 UI 状态归属作为后续批次。
