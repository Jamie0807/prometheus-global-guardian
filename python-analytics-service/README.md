# Prometheus Python Analytics Service

Prometheus Global Guardian 的 Python 数据分析服务。服务基于 FastAPI，提供统计、预测、风险评估、ETL、数据质量、统一模型和多维透视能力。

## 服务边界

- 默认地址：`http://localhost:8001`。
- 浏览器通过同源 `/api/analytics` 调用 Express BFF；BFF 将 allowlist 内的分析请求转发到本服务。
- `/api/v1/*` 业务接口要求 `X-Analytics-Service-Token`；`/health` 保持公开，`/metrics` 与 `/cache/clear` 使用独立管理令牌。
- 服务不会读取前端模型 Key、DisasterAware 凭据或终端用户 Cookie；身份校验和用户授权由 Express BFF 完成。
- 当前仓库不包含部署实施；Docker 说明仅用于本地完整栈运行。

```text
React browser -- /api/analytics --> authenticated Express BFF
Express BFF -- X-Analytics-Service-Token /api/v1/* --> FastAPI :8001
Express BFF -- authorization, hazards, AI --> external providers
```

## 快速启动

从仓库根目录启动：

```bash
./scripts/start-python-service.sh
```

或手动启动：

```bash
cd python-analytics-service
python3.13 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
python main.py
```

| 地址                           | 用途       |
| ------------------------------ | ---------- |
| `http://localhost:8001/`       | 服务信息   |
| `http://localhost:8001/health` | 健康检查   |
| `http://localhost:8001/docs`   | Swagger UI |
| `http://localhost:8001/redoc`  | ReDoc      |

## 配置与管理边界

```dotenv
ANALYTICS_SERVICE_TOKEN=replace_with_a_random_service_secret
ANALYTICS_ADMIN_TOKEN=replace-with-a-long-random-secret
ANALYTICS_CORS_ORIGINS=https://app.example
APP_ENV=production
LOG_LEVEL=info
```

`ANALYTICS_SERVICE_TOKEN` 和 `ANALYTICS_ADMIN_TOKEN` 仅作为服务端变量，不能使用 `VITE_` 前缀，也不能写入日志、前端或响应。BFF 与 FastAPI 必须配置同一服务令牌；未配置或无效时 `/api/v1/*` 返回 `404`。使用 `openssl rand -base64 48` 生成随机服务令牌。未配置管理令牌时，`GET /metrics` 和 `POST /cache/clear` 返回 `404`；配置后请求必须携带 `X-Analytics-Admin-Token`。

默认 CORS 只允许本地 Vite、Express 和 Docker Web 来源，不允许 Cookie 凭据。额外来源用逗号分隔的 `ANALYTICS_CORS_ORIGINS` 显式配置。日志等级支持 `debug`、`info`、`warn`、`error`、`silent`；生产默认 `info`，其他环境默认 `debug`。

## 请求约定

所有分析请求使用 `hazards`，不接受 `data` 别名。每条记录使用统一字段：`id`、`type`、`title`、`coordinates`、`timestamp`、`magnitude`、`severity`、`source` 和可选 `populationExposed`。

```json
{
  "hazards": [
    {
      "id": "event-001",
      "type": "EARTHQUAKE",
      "title": "Example earthquake",
      "coordinates": [121.47, 31.23],
      "timestamp": "2026-09-03T00:00:00Z",
      "magnitude": 5.2,
      "severity": "HIGH",
      "source": "USGS"
    }
  ]
}
```

坐标顺序为 `[longitude, latitude]`，时间为 ISO 8601。四维请求附加 `time_dim`、`geo_dim`、`aggfunc`、时间范围与筛选字段；Pydantic 在 API 边界拒绝非法维度、聚合、时间窗口或字段值，并返回 `422`。

## API 分组

| 分组           | 路由                                                                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 服务与管理     | `GET /`、`GET /health`、`GET /metrics`、`POST /cache/clear`                                                                               |
| 基础分析       | `POST /api/v1/analyze`、`/statistics`、`/predictions`、`/risk-assessment`、`/etl/process`                                                 |
| 质量与统一模型 | `POST /api/v1/quality/assess`、`GET /quality/thresholds`、`GET /quality/history`、`POST /unified-model/transform`、`/unified-model/merge` |
| 四维透视       | `POST /api/v1/pivot/create`、`/pivot/query`、`/pivot/trend-analysis`、`/pivot/risk-score`、`/pivot/summary`                               |

## 分析结果语义

- 预测状态为 `ready`、`insufficient_data` 或 `model_error`；样本不足不是零预测值。
- 风险建议优先使用结构化的 `recommendationDetails`，字符串 `recommendations` 只用于兼容。
- 质量维度内部范围为 `0-1`，质量接口总分展示为 `0-100`；无效数值不会作为结果展示。

## 测试

首选从仓库根目录运行：

```bash
pnpm run test:python
```

当前 49 项 unittest 覆盖应用工厂、跨语言灾害请求/响应契约、Pydantic/API 契约、FastAPI 路由，以及预测、风险和质量结果语义；不需要启动服务，也不访问真实外部数据。

`test_pivot_table.py` 是打印式透视与算法冒烟脚本，`test_service.py` 是依赖已启动服务的手工集成脚本；两者不是自动化测试套件。GitHub Actions 使用 Python 3.13 安装依赖后运行 `pnpm run test:python`。

## Docker 本地启动

从仓库根目录启动完整栈：

```bash
docker compose up --build
```

Compose 不把分析服务映射到宿主机端口；Web BFF 通过 Compose 私有网络访问它。直接本地运行时，可在宿主机 `localhost:8001` 调试。

## 目录结构

```text
python-analytics-service/
├── main.py                 兼容入口和直接启动
├── app/
│   ├── main.py             应用工厂和路由注册
│   ├── core/               应用状态、请求 ID、错误转换
│   ├── routes/             HTTP 输入输出
│   ├── schemas/            Pydantic 模型
│   └── services/           分析业务调度
├── analytics/              统计、预测、风险、ETL、质量、透视实现
├── security.py             管理令牌与 CORS 来源解析
├── tests/                  自动化 unittest
├── requirements.txt
└── Dockerfile
```
