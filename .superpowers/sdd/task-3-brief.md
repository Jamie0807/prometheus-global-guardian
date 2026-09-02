### Task 3：迁移 Python Analytics 服务

**文件：**

- 新增：`src/services/analytics/analyticsTypes.ts`
- 新增：`src/services/analytics/analyticsService.ts`
- 修改：`src/api/pythonAnalytics.ts`
- 修改：`src/components/ChartsPanel.tsx`
- 修改：`src/components/InsightsPanel.tsx`
- 修改：`src/components/DataQualityMonitor.tsx`
- 修改：`src/components/AnalyticsPage.tsx`
- 测试：`tests/service-analytics.test.ts`

**接口：**

```typescript
export interface HazardData {
  id: string;
  type: string;
  title: string;
  coordinates: number[];
  timestamp: string;
  magnitude?: number | null;
  severity?: string;
  source?: string;
  populationExposed?: number | null;
}

export interface AnalysisRequest {
  hazards: HazardData[];
  analysisType?: string;
  timeRange?: number;
}

export function formatHazards(hazards: readonly unknown[]): HazardData[];
export function getStatistics(hazards: readonly unknown[]): Promise<unknown>;
export function getPredictions(
  hazards: readonly unknown[],
  analysisType?: string,
  timeRange?: number,
): Promise<unknown>;
export function getRiskAssessment(hazards: readonly unknown[]): Promise<unknown>;

export function checkHealth(): Promise<boolean>;
export function getServiceInfo(): Promise<unknown>;
export function processETL(hazards: readonly unknown[]): Promise<unknown>;
export function getComprehensiveAnalysis(
  hazards: readonly unknown[],
  analysisType?: string,
  timeRange?: number,
): Promise<unknown>;
export function assessDataQuality(hazards: readonly unknown[], source?: string): Promise<unknown>;
export function transformToUnifiedModel(
  hazards: readonly unknown[],
  source: string,
): Promise<unknown>;
export function mergeMultiSourceData(...args: unknown[]): Promise<unknown>;
export function getQualityThresholds(): Promise<unknown>;
export function getQualityHistory(limit?: number): Promise<unknown>;
export function create4DPivotTable(...args: unknown[]): Promise<unknown>;
export function multiDimensionalQuery(...args: unknown[]): Promise<unknown>;
export function analyze4DTrends(...args: unknown[]): Promise<unknown>;
export function calculate4DRiskScores(...args: unknown[]): Promise<unknown>;
export function get4DSummary(hazards: readonly unknown[]): Promise<unknown>;
```

- [ ] **步骤 1：提取并测试 `formatHazards`** 纯函数，覆盖字段缺失、坐标回退、空 magnitude 和已有时间戳稳定保留；缺失时间戳继续使用当前时间回退。
- [ ] **步骤 2：运行 `npm run test:services`**，确认 service 尚未存在时新增格式化测试失败。
- [ ] **步骤 3：使用共享 HTTP 客户端，将超时、重试、基础 URL、请求体构造和错误转换移动到 `analyticsService.ts`**。
- [ ] \*\*步骤 4：完整保留当前模块的所有分析导出和默认参数；组件实际访问的 `success`、`data` 等字段补充最小响应类型或类型守卫，其他没有稳定 schema 的响应才使用 `unknown` 替代 `any`。
- [ ] **步骤 5：将 `src/api/pythonAnalytics.ts` 改为兼容 re-export**，并更新分析组件直接导入 service 模块。
- [ ] **步骤 6：运行 `npm test`、`npm run lint` 和 `npm run build`**，确认空输入校验、4xx 不重试、5xx 重试和超时消息保持不变。
