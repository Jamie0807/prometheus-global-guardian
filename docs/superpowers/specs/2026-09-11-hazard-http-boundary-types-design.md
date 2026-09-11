# Hazard 与通用 HTTP 边界类型治理设计方案

日期：2026-09-11
状态：已实施并通过验证。
需求级别：正式规格，作为前端边界类型治理的后续批次。

## 1. 目标

将 Hazard 数据进入前端的所有外部响应收敛为“HTTP 传输 → `unknown` → 来源契约 → 领域类型”的链路。覆盖项目 Hazard BFF、DisasterAware、USGS、NASA EONET 和 GDACS，移除成功 JSON 直接以泛型断言进入业务层的路径。

HTTP 模块只保证请求、状态、超时、取消、重试和 JSON 可解析性；Hazard 模块负责每个来源的字段解释、兼容和领域映射。现有组件继续只消费 `Hazard`、`ActiveHazard` 和 `HazardFeedResponse`。

## 2. 范围与非目标

### 2.1 范围

| 入口                         | 契约目标                         | 失败语义                                                 |
| ---------------------------- | -------------------------------- | -------------------------------------------------------- |
| `requestJson`                | 成功且合法 JSON 返回 `unknown`   | 维持 HTTP、网络、超时和非法 JSON 的稳定错误              |
| `/api/hazards`               | `HazardFeedResponse`             | 拒绝非法顶层响应，防止其进入地图与统计                   |
| DisasterAware 类型和活动灾害 | `HazardType[]`、`ActiveHazard[]` | 保持现有空数组降级与安全日志                             |
| USGS、NASA EONET、GDACS      | 外部来源记录解析为 `Hazard[]`    | 非法顶层或请求失败降级为空数组；混合列表跳过单条非法记录 |

### 2.2 非目标

- 不修改 BFF 的来源优先级、缓存、超时、重试和来源状态协议。
- 不改变公开 URL、调用方参数、`Hazard`、`ActiveHazard` 或 `HazardFeedResponse` 的既有消费接口。
- 不引入 Zod 或其他新的 schema 依赖。
- 不在本批生成跨语言模型；Python/TypeScript 的模型同步另列后续规格。

## 3. 架构与数据流

```text
fetch / authFetch
  -> HTTP：Response、状态、超时、取消、重试、合法 JSON（unknown）
  -> Hazard 来源契约：顶层形状、必要字段、可选字段和数组元素
  -> Hazard 适配器：来源字段映射为领域模型
  -> Hook / 组件：既有 Hazard 领域类型
```

### 3.1 HTTP 层

`requestJson` 不再以泛型断言结果；它返回 `unknown`。现有失败码 `network`、`timeout`、`http` 与 `invalid_json` 及其重试、取消语义保持不变。来源契约无法解析成功 JSON 时使用新增的 `invalid_response` 错误码，错误中仅携带固定来源和安全路径，不记录或展示响应正文。受影响的授权端点在 auth service 内局部验证 `{ authorized: true }`，不把授权响应作为 Hazard 领域契约处理。

### 3.2 Hazard 契约层

在 `src/services/hazards/contracts/` 以独立纯函数定义 BFF、DisasterAware 的顶层及记录解析器，并提供外部源适配器共享的安全守卫。现有 `hazardAdapters` 保持为 USGS、NASA EONET 和 GDACS 的来源解析与领域映射入口，避免在新模块和旧适配器之间产生循环依赖。所有解析器接收 `unknown`，只输出明确的中间结构或领域类型，并复用安全的 `Record<string, unknown>`、有限数值、非空字符串、数组与 GeoJSON 守卫。

USGS、NASA 和 GDACS 的列表解析保留逐条容错：符合顶层契约但缺少必要字段或几何信息的记录跳过。BFF、DisasterAware 的返回用于项目自身流程，顶层或必要字段不符合契约时不得构造伪造默认值。

### 3.3 Service 层

`hazardService` 按入口调用 `requestJson` 或已鉴权的 `authFetch`，将 JSON 先保留为 `unknown`，再调用相应解析器。`fetchHazardFeed` 在返回前解析 BFF 响应；DisasterAware 函数统一 HTTP 成功响应和 JSON 解析，并保持既有鉴权与空数组降级；三个公开源延续现有告警日志和空数组降级。

## 4. 错误、安全与兼容性

- 外部字段、动态键、上游响应正文和堆栈不得写入用户通知或浏览器日志。
- 非法 JSON 继续使用 `invalid_json`；JSON 合法但与来源契约不符使用 `invalid_response`。
- 合法空数组、空 `hazards`、零计数和可选字段缺失维持正常的空数据语义。
- 调用方无需接触来源 JSON；仍以现有领域类型和现有降级行为工作。
- `AbortSignal` 传递、类型筛选 URL 编码、HTTP 重试范围与 `authFetch` 鉴权顺序保持不变。

## 5. 测试与验收

先为每条边界写失败测试，再补最小实现。测试覆盖：

- 通用 HTTP 的合法 JSON `unknown` 返回、损坏 JSON、HTTP 非成功、超时、取消和重试行为。
- BFF、DisasterAware、USGS、NASA 与 GDACS 的有效样本、错误顶层、错误必要字段与未知字段兼容。
- 三个公开源的混合有效/无效记录跳过；BFF 与 DisasterAware 不把损坏对象转换为领域数据。
- 既有 Hazard feed 的筛选 URL、取消信号、DisasterAware 分类 URL 编码与空数组降级。

完成后执行：

```bash
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run test:services
pnpm run test:component
pnpm run build
git diff --check
```

本次实施验证中，`pnpm run lint`、格式检查、客户端/合同/服务端类型检查、Service 与组件测试、构建和 `git diff --check` 均通过。`pnpm test` 的 BFF 监听测试受当前沙箱禁止监听 `0.0.0.0` 的限制，报 `listen EPERM: operation not permitted 0.0.0.0`；因此不能将子集验证描述为全量通过。命令还显示 Node engine warning：当前 `v24.16.0`，项目声明范围为 `>=20.19 <21`。

## 6. 后续

本批结束后，前端剩余重点是跨语言契约同步与 Python 契约测试统一门禁；两者需基于已稳定的 Hazard 和 Analytics 前端边界另行设计，避免把生成、Python 模型和前端调用方一次性耦合。
