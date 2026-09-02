# API 和 Service 层统一实施计划

> **子智能体执行要求：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans`，按任务逐项执行本计划。步骤使用复选框（`- [ ]`）跟踪进度。

**Goal:** 在不改变现有页面行为和 API 导出兼容性的前提下，建立统一的前端 HTTP、鉴权、灾害数据、分析服务和 AI 服务层。

**架构：** 新增 `src/services/` 作为真实实现边界。`http/` 负责请求生命周期、超时、响应解析和统一错误；领域 service 负责业务请求和 provider adapter；现有 `src/api/*` 暂时只保留兼容 re-export，组件迁移到 `src/services/*`。DisasterAware 登录和 token 由 BFF 管理，浏览器不再读取凭据；外部前端接口路径、前端回调式 AI 流、空数组降级和现有页面错误行为保持不变。

**技术栈：** React 19、TypeScript 5.9、Vite 7、Vitest、浏览器 `fetch`、Express BFF、Node `node:test`、Mapbox GL JS、Recharts、FastAPI 分析服务。

## 全局约束

- 新增或重构的前端、BFF 代码统一使用 TypeScript。
- 保持现有函数名、参数顺序、API 路径和页面可观察行为，除非测试明确记录兼容性调整。
- 不把模型 Key、DisasterAware 凭据或 Python 服务凭据放入浏览器构建产物。
- 使用 `unknown`、类型守卫、判别联合和 `import type`，不新增无必要的 `any`。
- 优先使用现有 `fetch` 和项目依赖，不引入状态管理库或新的请求库。
- 每个实现步骤先写失败测试，再写最小实现并运行回归测试。
- `npm test` 必须继续覆盖已有 BFF 测试，并新增 Service 测试；新增 `npm run test:bff`、`npm run test:services` 和 `npm run typecheck:client` 命令。
- 本计划不包含自动 `git add`、`git commit` 或 push；只有用户明确要求时才提交。

## 文件清单

新增：

- `src/services/http/httpClient.ts`：统一 JSON、文本和流式 HTTP 请求。
- `src/services/http/serviceError.ts`：统一服务错误类型和错误码。
- `src/services/auth/authService.ts`：登录、token 读取、刷新和鉴权请求。
- `src/services/hazards/hazardAdapters.ts`：USGS、NASA EONET、GDACS 数据映射。
- `src/services/hazards/hazardService.ts`：公共灾害源和 DisasterAware 请求。
- `src/services/analytics/analyticsTypes.ts`：分析请求和已知响应契约。
- `src/services/analytics/analyticsService.ts`：Python analytics API 请求、重试和数据格式化。
- `src/services/ai/aiAssistantService.ts`：BFF AI 流式请求和 Demo 降级。
- `src/utils/aiAssistant.ts`：AI 消息 ID、时间格式化和快捷提示等纯 UI 辅助逻辑。
- `vitest.config.ts`：Service 测试配置。
- `tests/service-http.test.ts`：HTTP 客户端行为测试。
- `tests/service-adapters.test.ts`：灾害 adapter 纯函数测试。
- `tests/service-analytics.test.ts`：Analytics 数据格式化和请求策略测试。
- `tests/service-ai.test.ts`：BFF AI 流式客户端和 Demo 降级测试。

修改：

- `src/api/auth.ts`、`src/api/hazards.ts`、`src/api/disasteraware.ts`、`src/api/pythonAnalytics.ts`、`src/api/aiAssistant.ts`：改为兼容导出层，删除重复请求实现。
- `package.json`、`package-lock.json`：增加 Vitest 和前端测试、类型检查命令。
- `server.ts`、`server/env.ts`：由 BFF 读取 DisasterAware 服务端凭据、管理 token，并向上游转发鉴权请求。
- `.env.example`、`src/config/index.ts`：移除浏览器侧 DisasterAware 凭据配置，补充服务端环境变量说明。
- `src/App.tsx`、`src/components/MapView.tsx`、`StatusPanel.tsx`、`ChartsPanel.tsx`、`InsightsPanel.tsx`、`DataQualityMonitor.tsx`、`AnalyticsPage.tsx`、`AIChatAssistant.tsx`：改为从 service 层导入。
- `docs/PROJECT_OPTIMIZATION_BACKLOG.md`：记录完成内容、验证结果和遗留风险。
- `README.md`：补充 `src/services` 的职责和测试边界。

---

### 任务 0：补齐 Service 测试基础和服务端鉴权边界

**文件：**

- 修改：`package.json`、`package-lock.json`
- 新增：`vitest.config.ts`
- 修改：`server.ts`、`server/env.ts`
- 修改：`.env.example`、`src/config/index.ts`

- [ ] **步骤 1：先补充测试命令和最小 BFF 鉴权测试约束**，保留现有 `npm test` 的 BFF 覆盖范围。
- [ ] **步骤 2：增加 `test:bff`、`test:services`、组合后的 `test` 和 `typecheck:client` 命令**；Service 测试使用 Vitest 的 Node 环境，不提前引入 React 组件测试依赖。
- [ ] **步骤 3：将 DisasterAware 用户名和密码改为仅由服务端环境变量读取**，不再从 `import.meta.env.VITE_*` 或浏览器构建产物读取。
- [ ] \*_步骤 4：在 BFF 中保留 `/api/authorize` 和 `/api/hazards/_` 前端路径，由服务端完成登录、token 缓存、401/403 刷新和上游 Authorization 注入。
- [ ] \*\*步骤 5：运行 `npm test`、`npm run typecheck:client` 和 `npm run build`，确认已有开发命令和前端构建兼容。

### 任务 1：建立统一 HTTP 客户端和错误契约

**文件：**

- 新增：`src/services/http/serviceError.ts`
- 新增：`src/services/http/httpClient.ts`
- 测试：`tests/service-http.test.ts`

**接口：**

```typescript
export type ServiceErrorCode = "network" | "timeout" | "http" | "invalid_json";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status?: number;
  readonly cause?: unknown;
}

export function requestJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; retries?: number },
): Promise<T>;

export function requestText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number; retries?: number },
): Promise<string>;

export function requestStream(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: { timeoutMs?: number },
): Promise<Response>;
```

- [ ] **步骤 1：编写失败测试**，覆盖 JSON/文本成功、带状态码和正文的 HTTP 失败、超时转换、网络失败、JSON 解析失败，以及仅对网络错误、超时、429 和 5xx 进行重试。
- [ ] **步骤 2：运行聚焦测试命令**：`npm run test:services`。
- [ ] **步骤 3：实现最小 HTTP 客户端**，使用 `AbortController`、`response.ok`、响应正文读取和基于 `unknown` 的错误收窄。
- [ ] \*\*步骤 4：将 `retries` 定义为最大总尝试次数，默认值为 1；4xx（429 除外）不重试，POST 请求默认不重试。
- [ ] **步骤 5：运行 `npm test`、`npm run typecheck:client` 和 `npm run build`**，确认新增客户端代码不破坏应用构建。

### 任务 2：迁移鉴权和灾害数据服务

**文件：**

- 新增：`src/services/auth/authService.ts`
- 新增：`src/services/hazards/hazardAdapters.ts`
- 新增：`src/services/hazards/hazardService.ts`
- 修改：`src/api/auth.ts`
- 修改：`src/api/hazards.ts`
- 修改：`src/api/disasteraware.ts`
- 修改：`src/App.tsx`
- 修改：`src/components/MapView.tsx`
- 修改：`src/components/StatusPanel.tsx`
- 测试：`tests/service-adapters.test.ts`

**接口：**

```typescript
export const hazardAdapters = {
  mapNASACategoryToType,
  detectHazardTypeFromTitle,
} as const;

export async function fetchUSGSEarthquakes(): Promise<Hazard[]>;
export async function fetchNASAEONET(): Promise<Hazard[]>;
export async function fetchGDACS(): Promise<Hazard[]>;
export async function fetchHazardTypes(): Promise<HazardType[]>;
export async function fetchHazardsActive(type?: string): Promise<ActiveHazard[]>;
export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]>;

export function adaptUSGSResponse(input: unknown): Hazard[];
export function adaptNASAResponse(input: unknown): Hazard[];
export function adaptGDACSResponse(input: unknown): Hazard[];
```

- [ ] **步骤 1：编写失败的 adapter 测试**，覆盖 NASA 分类映射、标题识别、缺失几何信息、默认严重程度，以及稳定的来源和 ID 字段；纯映射函数必须可独立测试。
- [ ] **步骤 2：运行 `npm test`**，确认服务模块或目标行为尚未实现时新增测试失败。
- [ ] **步骤 3：将 provider 特定的映射移动到 `hazardAdapters.ts`**，并通过 `requestJson` 发起网络请求。
- [ ] **步骤 4：将前端鉴权调用移动到 `authService.ts`**，改为调用 BFF，不在浏览器持有用户名、密码或上游 token；保留 401/403 刷新机制和现有抛错行为。
- [ ] **步骤 5：将 `src/api/*` 文件改为 re-export**，并更新地图、状态组件，直接从 service 层导入。
- [ ] **步骤 6：运行 `npm test`、`npm run lint` 和 `npm run build`**，确认公共数据源失败时仍返回空数组，不会清空地图。

### 任务 3：迁移 Python Analytics 服务

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

### 任务 4：迁移 AI 服务和所有剩余调用方

**文件：**

- 新增：`src/services/ai/aiAssistantService.ts`
- 新增：`src/utils/aiAssistant.ts`
- 修改：`src/api/aiAssistant.ts`
- 修改：`src/components/AIChatAssistant.tsx`
- 修改：`src/App.tsx`（如果任务 2 后仍有鉴权导入）
- 测试：`tests/service-ai.test.ts`

**接口：**

```typescript
export async function streamChatMessage(
  messages: readonly ChatMessage[],
  context: DisasterContext | undefined,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (message: string) => void,
): Promise<void>;
```

- [ ] **步骤 1：编写失败测试**，覆盖 BFF 请求结构、流式 Chat Completions 增量、`[DONE]`、畸形数据块、503 Demo 降级和非 Demo 错误。
- [ ] **步骤 2：运行 `npm test`**，确认 service 实现迁移前新增测试失败。
- [ ] **步骤 3：仅将网络请求和 Demo 降级逻辑移动到 `aiAssistantService.ts`**；消息 ID、时间格式化、快捷提示等纯展示辅助函数移动到 `src/utils/aiAssistant.ts`。
- [ ] **步骤 4：将 `src/api/aiAssistant.ts` 改为兼容 facade**，并更新 `AIChatAssistant.tsx`，分别从 service 和 utils 导入。
- [ ] **步骤 5：运行 `npm test`、`npm run lint` 和 `npm run build`**，确认浏览器仍只发送 `POST /api/ai/chat`，且不会读取 provider 凭据。

### 任务 5：收口兼容层、文档和回归验证

**文件：**

- 修改：`src/api/auth.ts`
- 修改：`src/api/hazards.ts`
- 修改：`src/api/disasteraware.ts`
- 修改：`src/api/pythonAnalytics.ts`
- 修改：`src/api/aiAssistant.ts`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- 修改：`README.md`

- [ ] \**步骤 1：使用 `rg -n "from .*api/|fetch\\(" src`搜索直接 API 导入和 fetch 调用，确认生产组件使用`src/services`，兼容模块只包含 re-export 或有说明的 UI 辅助函数。
- [ ] **步骤 2：运行完整验证集合**：

```bash
npm test
npm run typecheck:server
npm run lint
npm run build
git diff --check
```

- [ ] **步骤 3：逐项检查验收标准**：统一 HTTP/错误契约、独立的 provider adapter、UI 中无 provider 细节、统一的鉴权/网络/数据结构错误，以及 API 路径不变。
- [ ] **步骤 4：更新待优化清单**，记录实现状态、测试数量、警告，以及仍为 `unknown` 的响应 schema。
- [ ] **步骤 5：保持所有变更未提交**，直到用户明确要求提交。

## 验收清单

- [ ] 当前五个 API 模块都有对应 service，或有记录清晰的兼容边界。
- [ ] 组件不再从 `src/api` 导入 provider 特定的请求实现。
- [ ] 共享 HTTP 处理覆盖超时、网络失败、非 2xx 响应、JSON 解析失败和重试策略。
- [ ] DisasterAware 刷新行为和公共数据源返回空数组的降级行为保持兼容。
- [ ] AI 流式回调行为和本地 Demo 降级保持兼容。
- [ ] adapter 纯函数和 HTTP 行为有自动化测试。
- [ ] `npm test`、`npm run typecheck:server`、`npm run lint`、`npm run build` 和 `git diff --check` 通过。
- [ ] 未经用户明确要求，不发生 commit 或 push。
