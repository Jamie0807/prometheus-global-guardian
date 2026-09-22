# Task 4 子任务报告：Analytics BFF 代理与服务令牌

## 已修改文件

- `server/analytics/analytics-route.ts`：新增 `/api/analytics` 代理注册函数。它显式枚举现有分析接口和允许的方法，复用全局原始请求体中间件的 64 KiB 限制与查询参数限制，将服务端令牌写入 `X-Analytics-Service-Token`，并以稳定错误信封处理未配置、上游失败和超时。
- `src/services/analytics/analyticsService.ts`：客户端基础地址改为同源 `/api/analytics`；不再读取 `VITE_PYTHON_API_URL`。
- `python-analytics-service/security.py`：新增 `require_service_access`，从 `ANALYTICS_SERVICE_TOKEN` 读取期望值，并用 `secrets.compare_digest` 比较令牌；未配置、缺失或不匹配一律返回 404。
- `python-analytics-service/app/routes/analytics.py`、`quality.py`、`pivot.py`：在三个业务路由器级别挂载 `require_service_access`。
- `python-analytics-service/app/main.py`：CORS 显式允许内部服务令牌头；`/health` 和受 `AdminAccess` 保护的 `/metrics`、`/cache/clear` 路由未变更。

## 接口假设

- 主会话在 `server.ts` 的全局 `createRawBodyMiddleware()` 和 `requireUser` 之后调用：
  `registerAnalyticsRoute(app, [], { env: serverEnv, fetchImpl: upstreamFetch })`。
- BFF 使用 `ANALYTICS_SERVICE_URL` 作为 FastAPI 根地址，使用 `ANALYTICS_SERVICE_TOKEN` 注入服务间请求头；浏览器仅调用 `/api/analytics`。
- 上游的成功响应保持原状态码与 `content-type`，上游非成功状态则收敛为 `502 ANALYTICS_UPSTREAM_UNAVAILABLE`，避免泄露上游响应内容；超时返回 `504 UPSTREAM_TIMEOUT`。

## 未执行测试

按父任务的明确约束，未添加或运行测试、类型检查、构建、格式检查或 `git diff --check`。因此本报告不宣称自动化验证通过。

## 自审发现

- 已逐项核对客户端所有服务信息、健康检查与 `/api/v1/*` 调用均从同源基础路径拼接。
- 代理白名单包含当前客户端使用的所有根、健康、分析、质量、统一模型与数据透视表接口；未包含管理接口。
- FastAPI 的业务路由器会统一执行令牌依赖，健康与管理路由语义未改变。
- 集成前需由主会话在 `server.ts` 导入并注册代理；该文件按任务边界未作修改。
