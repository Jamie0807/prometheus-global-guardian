# Python 管理面边界治理设计

## 目标

为 Python Analytics 服务的运维接口建立最小、可配置的访问边界，同时保持浏览器对 `/api/v1/*` 分析接口的现有直连契约不变。

## 范围

- `GET /metrics` 和 `POST /cache/clear` 仅在配置 `ANALYTICS_ADMIN_TOKEN` 后可用，并要求请求头 `X-Analytics-Admin-Token` 与该值恒定时间比较一致。
- 未配置令牌或令牌无效时，两个管理接口统一返回 404，避免把管理面暴露为可探测资源。
- CORS 默认仅允许本地开发和 Express 地址；支持通过 `ANALYTICS_CORS_ORIGINS` 用逗号分隔的显式来源列表覆盖。
- CORS 不使用 Cookie，故关闭凭据，且仅允许 `GET`、`POST`、`OPTIONS` 和必要的 `Content-Type`、`X-Analytics-Admin-Token` 请求头。
- Docker Compose 将 Python 服务端口绑定为 `127.0.0.1:8001:8001`，供同一主机浏览器开发与健康检查使用，不暴露到局域网。

## 不在范围

- 不将浏览器 `/api/v1/*` 请求迁移到 Express BFF；这需要独立解决生产环境的 Analytics 反向代理与前端公开 URL 契约。
- 不为分析业务接口新增用户身份体系、通用限流或请求体限制；这些属于 Python API 契约与分析可靠性后续项。
- 不拆分 `main.py` 的全部分析路由或修复缓存指标语义。

## 接口契约

| 接口                | 未配置/无效令牌 | 有效令牌            |
| ------------------- | --------------- | ------------------- |
| `GET /metrics`      | `404 Not Found` | `200` 指标 JSON     |
| `POST /cache/clear` | `404 Not Found` | `200` 清理结果 JSON |

令牌只由部署环境提供，不写入浏览器 `.env` 的 `VITE_*` 变量，也不记录到日志或响应体。

## 验收

- FastAPI TestClient 验证默认拒绝、错误令牌拒绝、有效令牌允许、健康检查仍公开。
- CORS 测试验证受信来源拥有 `Access-Control-Allow-Origin`，未知来源没有该响应头。
- `docker compose config` 显示 Python 端口仅绑定回环地址。
- Python 契约测试、根目录格式检查和完整测试基线通过。
