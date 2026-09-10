# 前端边界类型治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为当前 Analytics 前端链路建立从 `unknown` 外部 JSON 到稳定领域类型的运行时校验，消除核心消费链路的未经验证断言。

**Architecture:** Service 层只接收 `unknown` 响应，并调用按领域拆分的纯解析器；解析器验证响应外壳、字段、数组和数值范围后返回明确类型或 `AnalyticsContractError`。Hook、页面和组件只消费解析后的领域类型，合法空结果和模型失败通过判别联合保留。

**Tech Stack:** React 19、TypeScript 5.9 strict、Fetch、Vitest、React Testing Library、Express/FastAPI 现有 JSON 契约。

## Global Constraints

- 第一阶段只覆盖当前 React 消费的 8 个 Analytics 接口：statistics、predictions、risk-assessment、quality assess、quality thresholds、pivot create、pivot trend-analysis、pivot risk-score。
- 外部响应先赋为 `unknown`，经过解析器后才能进入 Service 返回值、Hook 状态或组件 Props；不使用最终 `as T` 或双重断言替代校验。
- 未知新增字段忽略；缺失必填字段、已出现但类型错误的字段、损坏 JSON 和 success/data 形状错误均抛出 `AnalyticsContractError`，不静默转空值或零值。
- 合法空结果、Python 模型 `failed` 和网络/HTTP 错误保持不同语义；契约错误不参与网络重试和自动重试。
- 质量 API 的 `overallScore` 使用 0–100，维度分数和阈值使用 0–1；不得根据数值大小猜测单位。
- 风险总分使用 0–100，confidence 使用 0–1；计数为非负整数；所有有限数值保留合法 `0`。
- 不修改 Python 算法、公开 API 行为、报告下载、AI Service、Hazard Service、地图和 Analytics 请求参数。
- 继续使用现有依赖，不新增 schema 库；解析器保持纯函数，不依赖 React、浏览器全局或网络。
- 每个任务先写失败测试，再实现最小改动；每项完成后运行对应定向测试和类型检查。
- 不自动执行 `git add`、`git commit`、push 或修改 Git 历史；提交由用户单独授权。

---

### Task 1: 建立共享边界守卫和契约错误

**Files:**

- Create: `src/services/analytics/contracts/common.ts`
- Create: `tests/service-analytics-contracts.test.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`

**Interfaces:**

```ts
export class AnalyticsContractError extends Error {
  readonly code = "ANALYTICS_RESPONSE_INVALID";
  readonly path: string;
  constructor(path: string, message?: string);
}

export interface AnalyticsSuccess<T> {
  success: true;
  data: T;
  processingTime?: number;
  timestamp?: string;
}

export function parseAnalyticsSuccess<T>(
  value: unknown,
  parseData: (value: unknown) => T,
): AnalyticsSuccess<T>;

export function parseRecord(value: unknown, path: string): Record<string, unknown>;
export function parseFiniteNumber(value: unknown, path: string): number;
export function parseOptionalFiniteNumber(value: unknown, path: string): number | null | undefined;
export function parseString(value: unknown, path: string): string;
export function parseStringArray(value: unknown, path: string): string[];
export function parseNumberMap(value: unknown, path: string): Record<string, number>;
```

- [ ] **Step 1: 写失败的守卫测试**

覆盖对象、数组、null、有限数、0、null 可选数、字符串数组、数字字典、success 缺失/false、data 缺失、未知字段和嵌套 path。测试必须断言 `error.code` 稳定为 `ANALYTICS_RESPONSE_INVALID`，且错误字符串不包含完整 JSON。

```ts
it("rejects a non-object response with a stable contract error", () => {
  expect(() => parseAnalyticsSuccess(null, () => ({}))).toThrowError(
    expect.objectContaining({ code: "ANALYTICS_RESPONSE_INVALID" }),
  );
});

it("preserves zero and rejects non-finite numbers", () => {
  expect(parseFiniteNumber(0, "score")).toBe(0);
  expect(() => parseFiniteNumber("1", "score")).toThrow();
  expect(() => parseFiniteNumber(Number.NaN, "score")).toThrow();
});
```

- [ ] **Step 2: 运行定向测试确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-contracts.test.ts`
预期：因解析器文件和导出尚不存在而失败。

- [ ] **Step 3: 实现共享守卫**

实现时使用 `typeof value === "object" && value !== null && !Array.isArray(value)` 判断记录，使用 `Number.isFinite` 验证数字；路径只记录字段路径，例如 `data.overallRiskScore.score`。`parseAnalyticsSuccess` 必须拒绝 `success !== true`、缺少 `data` 和非对象外壳，并允许缺少端点未提供的元数据。

```ts
export class AnalyticsContractError extends Error {
  readonly code = "ANALYTICS_RESPONSE_INVALID" as const;
  constructor(
    readonly path: string,
    message = "Invalid analytics response",
  ) {
    super(`${message} at ${path}`);
    this.name = "AnalyticsContractError";
  }
}

export function parseAnalyticsSuccess<T>(
  value: unknown,
  parseData: (data: unknown) => T,
): AnalyticsSuccess<T> {
  const record = parseRecord(value, "response");
  if (record.success !== true) throw new AnalyticsContractError("response.success");
  if (!("data" in record)) throw new AnalyticsContractError("response.data");
  return {
    success: true,
    data: parseData(record.data),
    ...(typeof record.processingTime === "number" ? { processingTime: record.processingTime } : {}),
    ...(typeof record.timestamp === "string" ? { timestamp: record.timestamp } : {}),
  };
}
```

- [ ] **Step 4: 收紧通用类型导出并运行 GREEN**

让 `AnalyticsResponse<T>` 不再以 `success?`、`data?` 和 `[key: string]: unknown` 作为第一阶段成功类型；保留兼容导出只供第二阶段旧接口使用。运行：`pnpm exec vitest run tests/service-analytics-contracts.test.ts`。预期：全部守卫测试通过。

### Task 2: 统计、预测、风险领域契约及 Service 接入

**Files:**

- Create: `src/services/analytics/contracts/statistics.ts`
- Create: `src/services/analytics/contracts/predictions.ts`
- Create: `src/services/analytics/contracts/risk.ts`
- Modify: `src/services/analytics/analyticsTypes.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/features/analytics/types.ts`
- Modify: `tests/service-analytics.test.ts`
- Create: `tests/service-analytics-domain-contracts.test.ts`

**Interfaces:**

```ts
export interface StatisticsData {
  basicStats: {
    count: number;
    mean: Record<string, number | null>;
    std: Record<string, number | null>;
    min: Record<string, number | null>;
    max: Record<string, number | null>;
  };
  centralTendency: { mean?: number; median?: number; mode?: number | null };
  variabilityMeasures: {
    standardDeviation?: number | null;
    variance?: number | null;
    coefficientOfVariation?: number | null;
    range?: number | null;
  };
  distributionMetrics: {
    q25?: number | null;
    q50?: number | null;
    q75?: number | null;
    iqr?: number | null;
    skewness?: number | null;
    kurtosis?: number | null;
  };
  typeDistribution: { counts: Record<string, number>; percentages: Record<string, number> };
}

export type PredictionStatus = "ready" | "insufficient_data" | "failed";
export interface PredictionModelResult {
  status: PredictionStatus;
  reason: string;
  dataPoints: number;
  minimumDataPoints: number;
  confidence: number | null;
  accuracy?: number | null;
  predictions?: { next7Days: number[]; confidenceInterval?: Record<string, number> };
}
export interface OverallPredictionAssessment {
  status: "ready" | "insufficient_data" | "failed";
  reason: string;
  overallRiskScore: number | null;
  riskLevel: string;
  averageAccuracy: number | null;
  confidence: number | null;
  modelWeights: Record<string, number>;
  recommendation: string;
}
export interface PredictionsData {
  earthquakePrediction: PredictionModelResult;
  volcanoPrediction: PredictionModelResult;
  stormPrediction: PredictionModelResult;
  floodPrediction: PredictionModelResult;
  wildfirePrediction: PredictionModelResult;
  overallRiskAssessment: OverallPredictionAssessment;
}

export interface RiskAssessmentData {
  overallRiskScore: { score: number; level: string };
  typeRisks: Record<string, { count: number; riskScore: number; averageMagnitude: number }>;
  geographicRisks: Array<{
    location: { lat: number; lon: number };
    hazardCount: number;
    riskLevel: string;
  }>;
  temporalRisks: Record<string, unknown>;
  recommendations: string[];
  recommendationDetails: Array<{
    ruleId: string;
    severity: string;
    message: string;
    metrics: Record<string, string | number | boolean | null>;
  }>;
}
```

- [ ] **Step 1: 写真实结构和异常结构测试**

从 `python-analytics-service/analytics/statistical_algorithms.py`、`prediction_models.py` 和 `risk_assessment.py` 固定最小成功样例。覆盖统计列名映射、合法 null/0、五类 prediction 的三种状态、总体评估 failed 字段、风险分数 0–100、错误嵌套类型、负计数、字符串数字、未知字段。

```ts
it("parses an overall prediction failure separately from model results", () => {
  const parsed = parsePredictions({
    earthquakePrediction: prediction("failed"),
    volcanoPrediction: prediction("failed"),
    stormPrediction: prediction("failed"),
    floodPrediction: prediction("failed"),
    wildfirePrediction: prediction("failed"),
    overallRiskAssessment: {
      status: "failed",
      reason: "model_error",
      overallRiskScore: null,
      riskLevel: "UNKNOWN",
      averageAccuracy: null,
      confidence: null,
      modelWeights: {},
      recommendation: "",
    },
  });
  expect(parsed.overallRiskAssessment.overallRiskScore).toBeNull();
});
```

- [ ] **Step 2: 运行测试确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`。预期：解析器未实现时失败。

- [ ] **Step 3: 实现领域解析器**

每个解析器先用 `parseRecord` 读取字段，再按领域规则校验范围；动态列和结构化建议 metrics 使用明确的 JSON 值联合。解析器返回类型完整的值，不把可选字段补成 0。`parsePredictions` 将 API `failed` 映射为展示适配器使用的 `model_error` 只能发生在 `analyticsPresentation.ts` 的单一映射函数中。

- [ ] **Step 4: 改造 Service JSON 边界**

将 `response.json()` 的结果先赋给 `unknown`，按方法调用解析器：

```ts
const payload: unknown = await response.json();
return parseAnalyticsSuccess(payload, parseStatistics);
```

`fetchWithRetry` 不得对 `AnalyticsContractError` 重试；在 Service 层保留现有稳定网络/HTTP 文案。更新返回签名，使 `getStatistics`、`getPredictions` 和 `getRiskAssessment` 返回 `AnalyticsSuccess<...>`。

- [ ] **Step 5: 迁移核心 Hook 和类型**

在 `useAnalyticsData.ts` 中删除 `as AnalyticsRecord`、`as PivotTrendRecord` 和 `as PivotRiskRecord`。状态分别使用 `AnalyticsSuccess<StatisticsData> | null`、`AnalyticsSuccess<PredictionsData> | null`、`AnalyticsSuccess<RiskAssessmentData> | null`；失败时不写入部分损坏对象。更新 `AnalyticsControlPanel`、`OverviewTab`、`PredictionsTab`、`RiskTab` Props。

- [ ] **Step 6: 修正统计和风险展示并运行测试**

`OverviewTab` 和 `ChartsPanel` 的所有 `toFixed`、算术和真值判断都通过可空数值格式化函数；合法 0 不显示为暂无数据。`InsightsPanel` 读取 `overallRiskScore.level/score`，不再重复乘以 100。运行：

```bash
pnpm exec vitest run tests/service-analytics.test.ts tests/service-analytics-domain-contracts.test.ts
pnpm run typecheck:client
```

### Task 3: 质量、4D 和第三方事件边界

**Files:**

- Create: `src/services/analytics/contracts/quality.ts`
- Create: `src/services/analytics/contracts/pivot.ts`
- Create: `src/features/analytics/utils/chartEventAdapter.ts`
- Modify: `src/services/analytics/analyticsService.ts`
- Modify: `src/features/analytics/types.ts`
- Modify: `src/components/DataQualityMonitor.tsx`
- Modify: `src/components/ChartsPanel.tsx`
- Modify: `src/features/analytics/hooks/useAnalyticsData.ts`
- Modify: `tests/service-analytics-domain-contracts.test.ts`
- Create: `tests/component/analytics-boundary-types.test.tsx`

**Interfaces:**

```ts
export interface QualityReportData {
  overallScore: number;
  targetScore: number;
  detailChecks: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
    validity: number;
  };
  totalRecords: number;
  status: string;
  issues: string[];
  recommendations: string[];
}
export interface QualityThresholds {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
}
export type PivotTrendsData =
  | { kind: "empty"; trends: []; message: string; time_window: number }
  | {
      kind: "ready";
      all_trends: Array<Record<string, string | number | null>>;
      high_risk_trends: Array<Record<string, string | number | null>>;
      statistics: Record<string, number>;
      time_window: number;
    };
export type PivotRiskScoresData =
  | { kind: "empty"; risk_scores: []; message: string; time_window: number }
  | {
      kind: "ready";
      all_risk_scores: Array<Record<string, string | number | null>>;
      top_10_risks: Array<Record<string, string | number | null>>;
      statistics: Record<string, number>;
      time_window: number;
    };
export function readChartEvent(value: unknown): { name: string } | null;
```

- [ ] **Step 1: 写失败测试**

覆盖质量总分 0、0.5、95、100，维度越界、`{ error: "secret" }` 质量结果、固定维度缺失、4D 空数组、有数据数组、异常空对象、坏数组成员，以及 Recharts 事件为 null、`{ name: 0 }`、合法 `{ name: "FLOOD" }`。

- [ ] **Step 2: 运行测试确认 RED**

运行：`pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts tests/component/analytics-boundary-types.test.tsx`。预期：质量/4D 解析器和事件适配器缺失导致失败。

- [ ] **Step 3: 实现质量和 4D 解析器**

质量解析器固定 overallScore 0–100、detailChecks/thresholds 0–1，拒绝 success 为 true 但 data 为 `{ error: ... }` 的结果。4D 解析器将有效空结果转换为 `kind: "empty"`，有数据结果转换为 `kind: "ready"`；不通过空数组猜测畸形对象。

- [ ] **Step 4: 接入剩余第一阶段 Service**

将 `assessDataQuality`、`getQualityThresholds`、`create4DPivotTable`、`analyze4DTrends`、`calculate4DRiskScores` 改为 `unknown` → 解析器 → 明确返回类型。更新 `useAnalyticsData` 的增强结果：增强请求失败清除对应旧结果，核心统计/预测/风险结果保持。

- [ ] **Step 5: 迁移质量面板、4D 面板和图表事件**

删除 `DataQualityMonitor` 的阈值断言，使用 `QualityThresholds`；质量报告只接受已验证类型。`readChartEvent` 是唯一接受第三方 payload 的入口，点击无效数据直接忽略，钻取仍从本地 Hazard 集合生成。

- [ ] **Step 6: 运行定向组件测试**

运行：`pnpm run test:component -- tests/component/analytics-boundary-types.test.tsx`。预期：无效响应不进入状态，4D 空结果有明确提示，质量异常不显示零分，图表无效点击不打开钻取。

### Task 4: 受控规则、反例类型测试、回归与文档

**Files:**

- Modify: `eslint.config.js`
- Create: `tsconfig.type-tests.json`
- Modify: `package.json`
- Create: `tests/type-tests/analytics-contracts.test-d.ts`
- Modify: `tests/service-analytics.test.ts`
- Modify: `tests/component/analytics-page.test.tsx`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Interfaces:**

```ts
// tests/type-tests/analytics-contracts.test-d.ts
const statistics: AnalyticsSuccess<StatisticsData> = validStatistics;
// @ts-expect-error RiskAssessmentData cannot be used as StatisticsData
const invalid: AnalyticsSuccess<StatisticsData> = validRiskAssessment;
```

- [ ] **Step 1: 写失败的类型反例和回归断言**

加入 `satisfies` 合法样例与 `@ts-expect-error` 跨接口误用样例；组件回归覆盖 OverviewTab null/0、预测总体失败、风险 0–100 和质量分制。

- [ ] **Step 2: 实现受控 lint 规则**

在现有 TypeScript 文件配置后追加一个更具体的配置块，只对第一阶段边界文件启用严格规则，其他目录继续使用现有 warning；不要一次启用 `no-unsafe-*` 全套规则。

```js
{
  files: [
    'src/services/analytics/contracts/**/*.ts',
    'src/services/analytics/analyticsService.ts',
    'src/features/analytics/**/*.{ts,tsx}',
    'src/components/ChartsPanel.tsx',
    'src/components/InsightsPanel.tsx',
    'src/components/DataQualityMonitor.tsx',
  ],
  rules: { '@typescript-eslint/no-explicit-any': 'error' },
}
```

- [ ] **Step 3: 增加类型检查入口**

新增 `tsconfig.type-tests.json`，继承 `tsconfig.app.json` 并显式纳入 `src` 和 `tests/type-tests/**/*.test-d.ts`，再增加脚本：

```json
// tsconfig.type-tests.json
{
  "extends": "./tsconfig.app.json",
  "include": ["src", "tests/type-tests/**/*.test-d.ts"]
}

// package.json
"typecheck:contracts": "./scripts/with-node-version.sh tsc --noEmit -p tsconfig.type-tests.json"
```

将该脚本纳入 `test:baseline`，确保 `@ts-expect-error` 真正由 TypeScript 检查。

- [ ] **Step 4: 更新清单状态**

第一阶段完成时将 `docs/PROJECT_OPTIMIZATION_BACKLOG.md` 的“前端边界类型治理”标记为“阶段完成”，记录 8 个接口、运行时解析器、消费迁移和验证结果；明确第二阶段仍包含其他 Analytics 方法、Hazard/通用 HTTP 边界和跨语言契约生成。

- [ ] **Step 5: 执行完整验证**

按改动范围运行：

```bash
pnpm run lint
pnpm run format:check
pnpm test
pnpm run test:component
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run build
git diff --check
```

完成条件：8 个接口均由 `unknown` 进入解析器；核心消费链路不再使用未经验证断言；合法空结果、null/0、模型失败和契约异常均有测试；所有命令退出码为 0；清单状态与实际范围一致。

## 执行顺序和复核点

Task 1 必须先完成，因为所有领域解析器依赖共享守卫和错误类型。Task 2、Task 3 分别负责核心分析和增强分析，可在 Task 1 完成后独立复核，但共享 `analyticsService.ts` 和 `useAnalyticsData.ts` 的合并按顺序进行。Task 4 在所有消费迁移后执行，负责限制规则、类型反例和整体验证。

每个任务结束后检查：差异只包含任务文件、定向测试通过、类型签名与后续任务一致、日志不包含响应正文。最终复核按设计方案第 8 节逐项核对，不以减少 `any` 数量作为唯一完成依据。
