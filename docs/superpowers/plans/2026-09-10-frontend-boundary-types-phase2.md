# 前端边界类型治理第二阶段实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为其余 8 个 Analytics Service 方法建立运行时响应契约，移除这些方法的 `AnalyticsResult` 兜底返回。

**Architecture:** 在 `src/services/analytics/contracts/` 按响应领域增加纯解析器；目标 Service 方法复用 `readAnalyticsJson`，将 JSON 保存为 `unknown`。FastAPI 根路由 `getServiceInfo` 直接使用其领域解析器，其余方法通过 `parseAnalyticsSuccess` 生成 `AnalyticsSuccess<T>`。第一阶段的统计、预测、风险和质量解析器被综合分析与历史响应复用。

**Tech Stack:** TypeScript 5.9 strict、Fetch、Vitest、React 19、FastAPI 现有 JSON 契约。

## Global Constraints

- 仅治理 `getServiceInfo`、`processETL`、`getComprehensiveAnalysis`、`transformToUnifiedModel`、`mergeMultiSourceData`、`getQualityHistory`、`multiDimensionalQuery`、`get4DSummary`。
- 不修改 Python 算法、FastAPI 路由、公开请求参数、Hazard/AI Service、通用 HTTP 客户端或新增依赖。
- 所有外部 JSON 先进入 `unknown`；根服务信息使用直接对象解析，其余端点使用成功响应外壳；缺失必填字段、已出现错型、嵌套对象/数组、非有限数字、负数或小数计数必须抛出 `AnalyticsContractError`。
- `success: false` 必须保持 `AnalyticsBusinessError` 语义；契约和业务错误不参与网络/Hook 自动重试，错误正文和动态键不进入用户通知。
- 平铺记录只能保存 `string | number | boolean | null`；对 Python 已实际返回嵌套数组或对象的记录（例如 ETL `coordinates`）使用递归、仅含有限数字的 JSON 值守卫。未知字段允许保留在已验证记录中。
- 合法空数组、空质量历史、零计数和空合并结果是正常业务结果，不能转换为错误或补造数据。
- 每项实现遵循 TDD：先确认 RED，再最小实现 GREEN；不自动执行 `git add`、`git commit`、push 或修改 Git 历史。

---

### Task 1: 服务信息、质量历史和共享 JSON 记录守卫

**Files:**

- Create: `src/services/analytics/contracts/records.ts`
- Create: `src/services/analytics/contracts/serviceInfo.ts`
- Create: `src/services/analytics/contracts/qualityHistory.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Modify: `tests/service-analytics.test.ts`

**Interfaces:**

```ts
export type AnalyticsJsonValue = string | number | boolean | null;
export type AnalyticsJsonRecord = Record<string, AnalyticsJsonValue>;
export function parseAnalyticsJsonRecord(value: unknown, path: string): AnalyticsJsonRecord;
export function parseAnalyticsJsonRecords(value: unknown, path: string): AnalyticsJsonRecord[];

export interface AnalyticsServiceInfo {
  service: string;
  status: string;
  version: string;
  features: string[];
}
export function parseAnalyticsServiceInfo(value: unknown): AnalyticsServiceInfo;

export interface QualityHistoryData {
  history: QualityReportData[];
  count: number;
}
export function parseQualityHistory(value: unknown): QualityHistoryData;
```

- [x] **Step 1: 写失败测试**

在领域测试中使用 Python `/` 与 `/api/v1/quality/history` 的真实最小响应。断言服务信息的 `features` 是字符串数组；空 history 和 `count: 0` 通过；记录行中的嵌套对象、数组、`NaN`、缺失 quality 字段、`count: -1` 或 `count: 1.5` 均抛出 `AnalyticsContractError`。

```ts
expect(
  parseAnalyticsServiceInfo({
    service: "Prometheus",
    status: "running",
    version: "1",
    features: [],
  }),
).toMatchObject({ status: "running" });
expect(() => parseAnalyticsJsonRecord({ event: { nested: true } }, "data.history.0")).toThrow(
  AnalyticsContractError,
);
expect(parseQualityHistory({ history: [], count: 0 })).toEqual({ history: [], count: 0 });
```

- [x] **Step 2: 确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`。

预期：因 `records.ts`、`serviceInfo.ts` 和 `qualityHistory.ts` 尚不存在而失败。

- [x] **Step 3: 实现守卫和解析器**

`parseAnalyticsJsonRecord` 对每个值做标量检查；动态键统一使用 `${path}.[key]`。`parseQualityHistory` 将每条 history 项交给 `parseQualityReport`，并用本地非负整数守卫校验 count。

```ts
export function parseAnalyticsJsonRecord(value: unknown, path: string): AnalyticsJsonRecord {
  const record = parseRecord(value, path);
  return Object.fromEntries(
    Object.entries(record).map(([key, item]) => {
      if (item === null || typeof item === "string" || typeof item === "boolean")
        return [key, item];
      if (typeof item === "number" && Number.isFinite(item)) return [key, item];
      throw new AnalyticsContractError(`${path}.[key]`);
    }),
  );
}
```

- [x] **Step 4: 接入两个 Service 方法**

将 `getServiceInfo` 改为 `Promise<AnalyticsServiceInfo>`，通过 `readAnalyticsJson` 和 `parseAnalyticsServiceInfo` 直接解析 FastAPI 根路由响应；将 `getQualityHistory` 改为 `Promise<AnalyticsSuccess<QualityHistoryData>>`，通过 `parseAnalyticsSuccess` 解析。Service 测试验证两方法接收 malformed JSON 时抛 `AnalyticsContractError`；质量历史 `success: false` 时抛 `AnalyticsBusinessError`。

```ts
const payload = await readAnalyticsJson(response);
return parseAnalyticsServiceInfo(payload);
```

- [x] **Step 5: 运行 GREEN**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts tests/service-analytics.test.ts`。

预期：两个文件通过，新增服务信息和质量历史的正反例均覆盖。

### Task 2: ETL 与统一模型响应契约

**Files:**

- Create: `src/services/analytics/contracts/etl.ts`
- Create: `src/services/analytics/contracts/unified.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Modify: `tests/service-analytics.test.ts`

**Interfaces:**

```ts
export type AnalyticsJsonTreeValue =
  | string
  | number
  | boolean
  | null
  | AnalyticsJsonTreeValue[]
  | { [key: string]: AnalyticsJsonTreeValue };
export type AnalyticsJsonTreeRecord = Record<string, AnalyticsJsonTreeValue>;

export interface ETLProcessData {
  processedData: AnalyticsJsonTreeRecord[];
  qualityMetrics: QualityReportData;
  recordsProcessed: number;
}
export function parseETLProcess(value: unknown): ETLProcessData;

export interface UnifiedTransformData {
  records: AnalyticsJsonTreeRecord[];
  total_records: number;
  schema: string[];
  source: string;
}
export interface UnifiedMergeData {
  unified_records: AnalyticsJsonTreeRecord[];
  total_records: number;
  source_records: Record<string, number>;
  merged_quality: QualityHistoryReport;
  source_quality_reports: QualityHistoryReport[];
  source_comparison: SourceComparisonData;
}
export interface SourceComparisonData {
  sources: Array<{ source: string; score: number; status: string; record_count: number }>;
  average_scores: Record<string, number>;
  best_source: string | null;
  worst_source: string | null;
}
export function parseUnifiedTransform(value: unknown): UnifiedTransformData;
export function parseUnifiedMerge(value: unknown): UnifiedMergeData;
```

- [x] **Step 1: 写失败测试**

使用 `AnalyticsService.run_etl` 和 `QualityService.transform/merge` 的实际字段名。覆盖 `recordsProcessed: 0`、空 records、空 sources、合法 `coordinates` 数组、非法非有限嵌套数字、字符串计数、负数/小数计数、质量指标错型和缺失 schema/source。合并响应中的 `merged_quality` 与 `source_quality_reports` 使用 `quality_monitor` 原始 snake_case 报告；ETL `qualityMetrics` 保持 API 转换后的 camelCase 展示 DTO。

```ts
expect(
  parseUnifiedTransform({ records: [], total_records: 0, schema: [], source: "USGS" })
    .total_records,
).toBe(0);
expect(() =>
  parseETLProcess({ processedData: [], qualityMetrics: {}, recordsProcessed: 1 }),
).toThrow(AnalyticsContractError);
expect(() => parseUnifiedMerge({ ...validMerge, source_records: { USGS: -1 } })).toThrow(
  AnalyticsContractError,
);
```

- [x] **Step 2: 确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`。

预期：因为 `etl.ts` 和 `unified.ts` 尚未导出解析器而失败。

- [x] **Step 3: 实现 ETL 与统一模型解析器**

新增递归 JSON 记录守卫以覆盖 Python 返回的 `coordinates` 等嵌套值，并拒绝非有限数字；复用第一阶段 `parseQualityReport` 解析 ETL 质量指标，复用 Task 1 的历史原始报告解析器解析合并质量数据。`source_comparison` 按 Python `compare_sources` 的 `sources`、`average_scores`、`best_source`、`worst_source` 结构单独解析。所有总数和 source 计数都用 `Number.isInteger(value) && value >= 0` 校验。

```ts
function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}
```

- [x] **Step 4: 接入三个 Service 方法**

将 `processETL`、`transformToUnifiedModel` 与 `mergeMultiSourceData` 改为明确 `AnalyticsSuccess<T>` 返回；使用 `readAnalyticsJson` 和对应解析器；保留现有稳定网络错误文案。

- [x] **Step 5: 运行 GREEN**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts tests/service-analytics.test.ts`。

预期：ETL/transform/merge 的真实响应、合法空响应、错型及 Service 边界测试通过。

### Task 3: 综合分析响应契约

**Files:**

- Create: `src/services/analytics/contracts/comprehensive.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Modify: `tests/service-analytics.test.ts`

**Interfaces:**

```ts
export interface ComprehensiveAnalysisData {
  statistics: StatisticsData;
  predictions: PredictionsData;
  riskAssessment: RiskAssessmentData;
  dataQuality: QualityReportData;
  processingInfo: { totalRecords: number; timeRange: number; analysisType: string };
  performance: {
    processingTimeMs: number;
    recordsProcessed: number;
    parallelExecution: boolean;
    cacheEnabled: boolean;
  };
}
export function parseComprehensiveAnalysis(value: unknown): ComprehensiveAnalysisData;
```

- [x] **Step 1: 写失败测试**

构造 Python `AnalyticsService.comprehensive_analysis` 的真实外壳与数据区块。覆盖嵌套 statistics/predictions/risk/dataQuality 可由第一阶段解析器读取、`totalRecords: 0`、负数 records、字符串 `processingTimeMs`、非布尔 cache 标记和任一子区块缺失。

```ts
expect(() =>
  parseComprehensiveAnalysis({
    ...validComprehensive,
    performance: { ...validComprehensive.performance, cacheEnabled: "yes" },
  }),
).toThrow(AnalyticsContractError);
expect(
  parseComprehensiveAnalysis({
    ...validComprehensive,
    processingInfo: { ...validComprehensive.processingInfo, totalRecords: 0 },
  }).processingInfo.totalRecords,
).toBe(0);
```

- [x] **Step 2: 确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`。

预期：因为综合解析器尚不存在而失败。

- [x] **Step 3: 实现综合解析器**

读取 `data.statistics`、`data.predictions`、`data.riskAssessment`、`data.dataQuality`，分别调用第一阶段解析器。处理信息的 record 总数为非负整数，performance 时间为非负有限数，两个执行标志必须是 boolean。

```ts
return {
  statistics: parseStatistics(record.statistics),
  predictions: parsePredictions(record.predictions),
  riskAssessment: parseRiskAssessment(record.riskAssessment),
  dataQuality: parseQualityReport(record.dataQuality),
  processingInfo: parseProcessingInfo(record.processingInfo),
  performance: parsePerformance(record.performance),
};
```

- [x] **Step 4: 接入综合 Service**

将 `getComprehensiveAnalysis` 改为 `Promise<AnalyticsSuccess<ComprehensiveAnalysisData>>`，复用 `readAnalyticsJson` 和 `parseAnalyticsSuccess`；在 Service 测试中验证 malformed JSON、`success: false` 和合法 processingTime 为 0。

- [x] **Step 5: 运行 GREEN**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts tests/service-analytics.test.ts`。

预期：综合响应与所有已迁移接口回归通过。

### Task 4: Pivot 查询/汇总契约、受控 lint 与收口

**Files:**

- Create: `src/services/analytics/contracts/pivotQuery.ts`
- Create: `src/services/analytics/contracts/pivotSummary.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `eslint.config.js`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Modify: `tests/service-analytics.test.ts`
- Modify: `tests/type-tests/analytics-contracts.test-d.ts`

**Interfaces:**

```ts
export interface PivotQueryData {
  results: AnalyticsJsonRecord[];
  total_count: number;
  query_params: {
    time_range: [string, string] | null;
    regions: string[] | null;
    types: string[] | null;
    severities: string[] | null;
  };
}
export interface PivotSummaryData {
  total_records: number;
  time_range: { start: string; end: string; days: number };
  geographic_distribution: { regions: Record<string, number>; continents: Record<string, number> };
  type_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  dimensions: {
    time_unique: number;
    geo_unique: number;
    type_unique: number;
    severity_unique: number;
  };
}
export function parsePivotQuery(value: unknown): PivotQueryData;
export function parsePivotSummary(value: unknown): PivotSummaryData;

function parseNonNegativeInteger(value: unknown, path: string): number {
  const parsed = parseFiniteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) throw new AnalyticsContractError(path);
  return parsed;
}
```

- [x] **Step 1: 写失败测试**

覆盖空查询结果、null query params、完整筛选回显、错误 time_range、字符串计数、负数/小数分布、坏 records 成员、pivot summary 的零计数和错型时间范围。

```ts
expect(
  parsePivotQuery({
    results: [],
    total_count: 0,
    query_params: { time_range: null, regions: null, types: null, severities: null },
  }).total_count,
).toBe(0);
expect(() =>
  parsePivotSummary({
    ...validSummary,
    dimensions: { ...validSummary.dimensions, geo_unique: 0.5 },
  }),
).toThrow(AnalyticsContractError);
```

- [x] **Step 2: 确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`。

预期：pivot query/summary 解析器不存在导致失败。

- [x] **Step 3: 实现并接入 Service**

`parsePivotSummary` 复用 PivotTable 的非负整数映射语义，但从 `data` 直接读取汇总字段；`parsePivotQuery` 明确校验 tuple 或 null。将 `multiDimensionalQuery` 与 `get4DSummary` 改为 `AnalyticsSuccess<T>` 返回。

```ts
const queryParams = parseRecord(record.query_params, "data.query_params");
return {
  results: parseAnalyticsJsonRecords(record.results, "data.results"),
  total_count: parseNonNegativeInteger(record.total_count, "data.total_count"),
  query_params: {
    time_range: parseNullableDateRange(queryParams.time_range, "data.query_params.time_range"),
    regions: parseNullableStringArray(queryParams.regions, "data.query_params.regions"),
    types: parseNullableStringArray(queryParams.types, "data.query_params.types"),
    severities: parseNullableStringArray(queryParams.severities, "data.query_params.severities"),
  },
};
```

- [x] **Step 4: 收紧门禁和文档**

把新 contracts 和 Phase 2 Service 文件纳入现有 `@typescript-eslint/no-explicit-any: error` override；类型反例验证 `PivotQueryData` 不能作为 `PivotSummaryData` 使用。更新优化清单为“第二阶段 Analytics 子批次完成，Hazard/HTTP 与跨语言契约仍待治理”。

```ts
// @ts-expect-error Pivot query and summary data are distinct contracts
const invalidSummary: PivotSummaryData = validPivotQuery;
```

- [x] **Step 5: 运行完整验证**

运行：

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

预期：所有命令退出码为 0；若 `pnpm test` 仍受沙箱 `listen EPERM` 影响，记录失败用例和可执行验证，不能声称全量通过。

## 执行顺序和复核点

Task 1 先提供 JSON 记录守卫，Task 2 和 Task 4 依赖它；Task 3 依赖第一阶段领域解析器但可在 Task 1 后独立复核。为避免同时修改 `analyticsService.ts`，实际执行顺序为 Task 1 → Task 2 → Task 3 → Task 4。

每个任务结束后检查：解析器不接收已断言的外部 JSON、动态路径不会暴露外部键、Service 返回类型已经从 `AnalyticsResult` 改为 `AnalyticsSuccess<T>`、定向测试和客户端类型检查通过。最终复核逐项比对第二阶段设计方案第 2 至 5 节。
