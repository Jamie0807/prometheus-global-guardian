# BFF 代理边界治理设计

## 目标

将 Express BFF 的 DisasterAware 访问从通用 `/api` 转发改为产品实际需要的受限代理，并在认证、AI 和代理入口建立可预测的请求边界。

## 已确认范围

- 保留浏览器现有调用：`POST /api/authorize`、`GET /api/hazards/types`、`GET /api/hazards/active`、`GET /api/hazards/active/category/:categoryId` 和 `POST /api/ai/chat`。
- 未列入 allowlist 的 `/api/*` 路径不访问上游，返回稳定的 JSON 404；列入路径但方法不匹配时返回 405。
- BFF 只读取最大 64 KiB 的非安全方法请求体；超过限制返回 413。
- BFF 拒绝超过 20 个 query 参数、单个 query 键或值超过 256 个字符的请求，返回 400。
- DisasterAware 上游请求仅使用服务端生成的 `authorization`，并只转发 `accept`、`accept-language` 两个无敏感语义的请求头。
- DisasterAware 鉴权和代理请求各自具有受环境变量约束的超时；超时返回 504，其他上游失败返回不含上游细节的 502。
- `/api/authorize` 和 `/api/ai/chat` 使用单进程内存限流。该限制是单实例部署的第一层保护；水平扩展时由网关或共享存储限流替代。
- 显式关闭 Express `x-powered-by` 和 `trust proxy`，避免客户端伪造转发 IP 影响限流键。

## 不在本次范围

- Python FastAPI 的 `/metrics`、`/cache/clear`、CORS 和端口发布策略。
- 用户身份体系、Cookie 会话或浏览器来源白名单；当前产品没有可复用的用户认证协议，不能以伪造的鉴权机制替代。
- Mapbox Popup 外部文本安全和报告下载闭环。

## 边界契约

| 场景                 | 返回状态 | 稳定错误码               |
| -------------------- | -------- | ------------------------ |
| 非法 JSON 内容类型   | 415      | `UNSUPPORTED_MEDIA_TYPE` |
| 请求体过大           | 413      | `REQUEST_BODY_TOO_LARGE` |
| query 过多或过长     | 400      | `INVALID_QUERY`          |
| 未知 API 路径        | 404      | `API_ROUTE_NOT_FOUND`    |
| 不允许的方法         | 405      | `API_METHOD_NOT_ALLOWED` |
| 频率超限             | 429      | `RATE_LIMITED`           |
| 上游超时             | 504      | `UPSTREAM_TIMEOUT`       |
| 上游不可用或认证失败 | 502      | `UPSTREAM_UNAVAILABLE`   |

## 验收与测试

- 未知代理路径和 `DELETE /api/hazards/active` 不触发上游调用。
- 客户端 `authorization`、`cookie`、`x-forwarded-*` 和自定义头不会到达 DisasterAware；服务端 token 仍会注入。
- 过大的 AI body、异常 query、认证和 AI 频率超限均得到明确 4xx。
- 可配置的毫秒级 DisasterAware 超时会中止上游请求并返回 504。
- 现有灾害查询、一次 401 token 刷新和本地 `/api/hazards` 聚合行为保持兼容。
