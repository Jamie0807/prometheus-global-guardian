# 数据源健康检查与新鲜度设计

日期：2026-09-19

状态：待用户审核

## 1. 背景与目标

当前 `/api/hazards` 已经返回每个数据源的即时状态、记录数量、缓存时间和整体降级状态，但还不能说明来源自身在一段时间内是否稳定。下一项 P1 只增加服务端进程内的滚动健康指标，不建设前端面板、历史数据库或独立健康接口。

目标是在现有 `meta.sources[]` 中为四个灾害来源提供最近 5 分钟的成功率、延迟、新鲜度和失败诊断，同时保持既有状态、缓存、fallback 和响应兼容性。

## 2. 已确认的范围

包含：

- DisasterAware、USGS、NASA EONET、GDACS 四个来源的进程内健康统计。
- 固定 5 分钟滚动窗口；过期事件自动从统计中清除。
- 成功次数、失败次数、成功率、平均延迟、最近延迟、最近尝试时间、最近成功时间和连续失败次数。
- 稳定错误代码，不返回原始异常、上游响应体、凭据或 token。
- 在现有 `meta.sources[]` 中增加可选 `health` 对象。
- 通过 `loadSource` 统一记录来源加载尝试。

不包含：

- 前端 UI 或独立健康面板。
- `/api/hazards/health` 等新公共接口。
- 数据库、Redis、外部指标系统或跨进程持久化。
- 改变现有 fallback、缓存 TTL、来源筛选和状态枚举。

## 3. 健康指标模型

每个来源的状态保留现有字段：

```ts
interface HazardSourceStatus {
  id: HazardSourceId;
  status: "success" | "empty" | "unavailable" | "fallback" | "stale";
  count: number;
  fetchedAt?: string;
  message?: string;
  health?: HazardSourceHealth;
}
```

新增健康对象建议为：

```ts
interface HazardSourceHealth {
  windowMs: 300000;
  attempts: number;
  successes: number;
  failures: number;
  successRate?: number;
  averageLatencyMs?: number;
  lastLatencyMs?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  consecutiveFailures: number;
  lastErrorCode?: "TIMEOUT" | "HTTP_ERROR" | "INVALID_RESPONSE" | "UPSTREAM_ERROR";
}
```

当窗口内没有真实加载尝试时，`successRate` 和延迟字段省略，不伪造为零。`windowMs` 固定为 `300000`，避免首版引入额外配置。

## 4. 记录边界与数据流

新增进程内 `HazardSourceHealthRegistry`，按 `HazardSourceId` 保存带时间戳的尝试记录。`loadSource` 成为统一记录边界：

1. 每次 `loadSource` 调用中的每个 `load()` 最多记录一次尝试；现有最多两次重试因此最多产生两条记录。
2. `load()` 成功完成并返回已适配的灾害数组时，记录成功；数组为空仍是成功。
3. `load()` 抛出异常、超时或解析失败时，记录失败，并映射为稳定 `lastErrorCode`。
4. 缓存命中返回 `stale` 时不新增健康尝试，因为没有发生真实上游加载。
5. DisasterAware 的认证请求不单独计入来源指标；认证和数据请求属于同一来源加载过程。
6. 生成 `meta.sources[]` 时，将当前来源状态和当前滚动健康快照合并返回。

健康统计只在当前服务进程内有效。进程重启后窗口为空，这是首版明确接受的限制。

## 5. 状态与错误语义

现有状态语义保持不变：

- `success`：本次加载成功且有数据。
- `empty`：本次加载成功但没有数据。
- `fallback`：来源作为降级来源返回。
- `stale`：使用有效缓存。
- `unavailable`：重试后仍不可用。

健康统计与最终状态解耦：

- `empty` 计为成功。
- `fallback` 和 `stale` 不改变真实上游成功率。
- `unavailable` 表示本次真实加载失败。
- `lastErrorCode` 只允许稳定枚举，不能包含异常消息、URL、响应体或凭据。
- 健康字段为可选，旧客户端只读取现有状态字段时不受影响。

## 6. 测试策略

新增服务端测试覆盖：

- 成功、空结果、超时、HTTP 错误和解析错误。
- 两次重试后的失败记录。
- 5 分钟窗口边界、记录过期和窗口清理。
- 成功率、平均延迟、最近延迟、最近时间和连续失败数。
- 缓存命中不增加尝试次数。
- DisasterAware 认证重试不单独计数。
- `meta.sources[]` 旧字段兼容和新增 `health` 字段输出。
- 错误输出不泄露原始异常、响应体、token 或凭据。

验证至少包括相关 Node/Vitest 测试、服务端类型检查、Lint、格式检查和 `git diff --check`；完成前再运行项目既有质量门禁子集。

## 7. 完成标准

- 四个来源均能在现有 `meta.sources[]` 返回最近 5 分钟健康快照。
- 真实上游加载与缓存命中、fallback、stale 的计数边界符合本设计。
- 旧状态字段、fallback 语义、缓存 TTL 和 API 路径不变。
- 所有新增错误信息均为稳定且不含敏感数据的枚举代码。
- 测试证明窗口、重试、空结果、缓存和脱敏行为。
