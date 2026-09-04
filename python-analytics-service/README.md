# Prometheus Python Analytics Service

Prometheus Global Guardian 的 Python 数据分析服务，使用 FastAPI 提供统计分析、预测、风险评估、ETL、数据质量检查和多维透视接口。

## 服务边界

- 运行时：Python 3.13、FastAPI、Uvicorn。
- 默认地址：\`http://localhost:8001\`。
- 前端通过 \`VITE_PYTHON_API_URL\` 直接请求本服务的 \`/api/v1/\*\` 接口。
- Express BFF 负责 DisasterAware、灾害聚合和 AI provider 路由，当前不代理 Python Analytics 请求。
- 服务不会读取前端模型 Key 或 DisasterAware 凭据。

\`\`\`text
React Browser
└── VITE_PYTHON_API_URL /api/v1/\*
└── Python FastAPI :8001
├── statistical_algorithms.py
├── prediction_models.py
├── risk_assessment.py
├── etl_processor.py
├── quality_monitor.py
└── pivot_table_analyzer.py
\`\`\`

## 快速开始

### 本地启动

从仓库根目录执行：

\`\`\`bash
chmod +x scripts/start-python-service.sh
./scripts/start-python-service.sh
\`\`\`

也可以手动启动：

\`\`\`bash
cd python-analytics-service
python3.13 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
python main.py
\`\`\`

服务启动后可访问：

| 地址                              | 用途       |
| --------------------------------- | ---------- |
| \`http://localhost:8001/\`        | 服务信息   |
| \`http://localhost:8001/health\`  | 健康检查   |
| \`http://localhost:8001/docs\`    | Swagger UI |
| \`http://localhost:8001/redoc\`   | ReDoc      |
| \`http://localhost:8001/metrics\` | 运行指标   |

前端本地开发时，在根目录 \`.env\` 中设置：

\`\`\`dotenv
VITE_PYTHON_API_URL=http://localhost:8001
\`\`\`

### Docker 启动

推荐从仓库根目录启动完整服务：

\`\`\`bash
docker compose up --build
\`\`\`

只构建 Python 服务时：

\`\`\`bash
cd python-analytics-service
docker build -t prometheus-analytics:latest .
docker run --rm -p 8001:8001 prometheus-analytics:latest
\`\`\`

## 数据请求模型

分析接口使用 \`AnalysisRequest\`。每条灾害记录的字段如下：

\`\`\`json
{
"id": "event-001",
"type": "EARTHQUAKE",
"title": "Example earthquake",
"coordinates": [121.47, 31.23],
"timestamp": "2026-09-03T00:00:00Z",
"magnitude": 5.2,
"severity": "HIGH",
"source": "USGS",
"populationExposed": 1000
}
\`\`\`

请求示例：

\`\`\`json
{
"hazards": [
{
"id": "event-001",
"type": "EARTHQUAKE",
"title": "Example event",
"coordinates": [116.4, 39.9],
"timestamp": "2026-09-03T00:00:00.000Z",
"magnitude": 4.5,
"severity": "WARNING",
"source": "USGS",
"populationExposed": 1000
}
],
"analysisType": "comprehensive",
"timeRange": 30,
"time_dim": "month",
"geo_dim": "region",
"aggfunc": "count",
"time_range": ["2026-09-01T00:00:00.000Z", "2026-09-03T00:00:00.000Z"],
"regions": ["Asia-Pacific"],
"types": ["EARTHQUAKE"],
"severities": ["WARNING"],
"time_window": 7
}
\`\`\`

约定：\`coordinates\` 使用 \`[longitude, latitude]\`，\`timestamp\` 使用可解析的 ISO 8601 时间，\`type\`、\`severity\` 和 \`source\` 应使用项目统一枚举。所有分析接口使用 \`hazards\`，不接受 \`data\` 别名。四维接口的 \`time_dim\`、\`geo_dim\`、\`aggfunc\`、\`time_range\`、筛选数组和 \`time_window\` 已纳入 Pydantic 请求模型；非法维度、聚合函数、时间范围或非正时间窗口会在 API 边界返回 422。

## API 接口

### 服务与运维接口

| 方法     | 路径             | 说明                           |
| -------- | ---------------- | ------------------------------ |
| \`GET\`  | \`/\`            | 服务名称、版本和能力列表       |
| \`GET\`  | \`/health\`      | 返回服务健康状态               |
| \`GET\`  | \`/metrics\`     | 请求数、缓存指标和平均处理时间 |
| \`POST\` | \`/cache/clear\` | 清理进程内分析缓存             |

### 基础分析接口

| 方法     | 路径                        | 说明                                   |
| -------- | --------------------------- | -------------------------------------- |
| \`POST\` | \`/api/v1/analyze\`         | 并行执行统计、预测、风险和数据质量分析 |
| \`POST\` | \`/api/v1/statistics\`      | 统计分析                               |
| \`POST\` | \`/api/v1/predictions\`     | 五类灾害预测模型                       |
| \`POST\` | \`/api/v1/risk-assessment\` | 总体、分类、地理和时间风险评估         |
| \`POST\` | \`/api/v1/etl/process\`     | 数据清洗、标准化和质量评估             |

### 数据质量与统一模型接口

| 方法     | 路径                                | 说明                                    |
| -------- | ----------------------------------- | --------------------------------------- |
| \`POST\` | \`/api/v1/quality/assess\`          | 五维质量评估；请求体额外包含 \`source\` |
| \`GET\`  | \`/api/v1/quality/thresholds\`      | 返回质量阈值                            |
| \`GET\`  | \`/api/v1/quality/history\`         | 返回最近质量评估记录                    |
| \`POST\` | \`/api/v1/unified-model/transform\` | 按来源转换统一模型                      |
| \`POST\` | \`/api/v1/unified-model/merge\`     | 合并 USGS、NASA 和 GDACS 数据           |

### 四维透视接口

| 方法     | 路径                             | 说明                               |
| -------- | -------------------------------- | ---------------------------------- |
| \`POST\` | \`/api/v1/pivot/create\`         | 创建时间、地理、类型和严重性透视表 |
| \`POST\` | \`/api/v1/pivot/query\`          | 多维筛选查询                       |
| \`POST\` | \`/api/v1/pivot/trend-analysis\` | 计算时间窗口内趋势                 |
| \`POST\` | \`/api/v1/pivot/risk-score\`     | 计算四维组合风险分数               |
| \`POST\` | \`/api/v1/pivot/summary\`        | 返回透视数据汇总                   |

四维接口复用 \`AnalysisRequest\`。创建透视表会使用 \`time_dim\`、\`geo_dim\` 和 \`aggfunc\`；多维查询会使用时间范围、区域、类型和严重性筛选；趋势与风险评分会使用 \`time_window\`。创建透视表使用 \`count\` 时统计记录数，使用 \`sum\` 或 \`mean\` 时聚合数值型 \`magnitude\`。

## 分析能力

### 统计分析

\`StatisticalAnalyzer\` 当前包含描述性统计、推断统计、时间序列、相关性和异常检测等分析逻辑。接口返回的字段以 \`statistical_algorithms.py\` 的实际实现为准，不应把算法数量或结果精度理解为已完成业务验收的指标。

### 预测分析

\`PredictionEngine\` 当前提供：

- 地震：震级至少为 4.0 且满足最小样本要求后进行时间序列预测。
- 火山：火山事件和地震事件的时间序列及关联分析。
- 风暴：风暴时间序列和季节性分析。
- 洪水：洪水时间序列和风暴级联分析。
- 野火：野火时间序列和多因子说明。

当某类灾害未达到模型所需样本量、有效时间点或震级条件时，接口会返回 \`status: "insufficient_data"\`，前端可能展示 \`N/A\`。这表示当前数据不满足模型条件，不代表预测值为零。模型最低样本、状态原因和置信度尚未形成完整响应契约。

### 风险评估

\`RiskAssessor\` 返回总体风险分数、风险等级、分类风险、地理热点、时间趋势、人口影响和建议。总体分数与建议由不同规则计算，因此出现“总体为 LOW 但同时提示高地震活动”并不一定是接口失败，但当前响应没有说明各建议的触发指标，容易造成结果语义冲突。

### 数据质量

\`DataQualityMonitor\` 评估完整性、准确性、一致性、时效性和有效性五个维度，并返回问题与改进建议。当前质量检查存在待治理问题：已知类型和来源规则与前端实际大写值及 \`DisasterAWARE\` 别名不完全一致；多个问题可能重复计数，使一致性得分低于 0，前端因此可能显示异常负分。该行为已记录在项目待优化清单中，当前不应把质量分数直接作为生产质量 SLA。

## 测试

Python 服务目前包含 API 契约自动化测试、打印式算法冒烟脚本和依赖已启动服务的手工集成脚本；Python 测试尚未纳入根目录 \`pnpm run test:baseline\`：

\`\`\`bash
cd python-analytics-service
python test_pivot_table.py
\`\`\`

\`test_pivot_table.py\` 是打印式的透视表和算法冒烟脚本，不是 pytest 测试套件。

```bash
cd python-analytics-service
python -m unittest discover -s tests -p 'test_*.py'
```

`tests/test_api_contract.py` 是不依赖已启动服务、直接调用模型和路由函数的 API 契约单元测试，覆盖统一 `hazards` 请求体、4D 参数校验、端点参数传递和数值聚合行为。

```bash
cd python-analytics-service
python -m unittest tests.test_api_routes
```

`tests/test_api_routes.py` 使用 FastAPI `TestClient` 通过 ASGI 发送真实 HTTP 路由请求，覆盖五个 4D 路由的 2xx 响应、参数转发、查询回显、空结果和 422 校验；不需要启动 `8001` 服务，也不访问真实外部数据源。

\`\`\`bash
cd python-analytics-service
python test_service.py
\`\`\`

\`test_service.py\` 是依赖已启动服务的手工集成脚本，会等待用户按回车后请求 \`8001\` 端点。它主要打印结果并汇总布尔状态，也不是 pytest 单元测试。

现有 Python 自动化测试覆盖请求模型和 FastAPI HTTP 路由，但仍缺少系统性的算法边界覆盖、pytest 迁移和 CI 接入。详细状态见根目录的 [项目待优化清单](../docs/PROJECT_OPTIMIZATION_BACKLOG.md)。

## 项目结构

\`\`\`text
python-analytics-service/
├── main.py # FastAPI 应用、请求模型和路由
├── requirements.txt # Python 依赖
├── Dockerfile # Python 3.13 镜像
├── start.sh # 服务目录内启动脚本
├── tests/
│ ├── test_api_contract.py # API 契约单元测试
│ └── test_api_routes.py # FastAPI HTTP 路由契约测试
├── test_service.py # 手工集成测试脚本
├── test_pivot_table.py # 打印式透视算法测试脚本
└── analytics/
├── **init**.py
├── statistical_algorithms.py # 统计分析
├── prediction_models.py # 预测模型
├── risk_assessment.py # 风险评估
├── etl_processor.py # ETL 与质量报告转换
├── quality_monitor.py # 五维数据质量检查
├── unified_model.py # 多来源统一模型
└── pivot_table_analyzer.py # 四维透视与风险分析
\`\`\`

## 已知限制与后续方向

- 统一前端顶层 \`Hazard\`、Python \`HazardData\` 和数据源 adapter 的字段契约，避免标题、时间、震级、严重性和来源丢失。
- 将路由、Pydantic schema、分析 service 和配置从 \`main.py\` 中拆分。
- 为预测的样本不足、模型失败、空时间序列和置信区间建立稳定响应。
- 统一类型、严重程度和来源枚举的大小写与别名，并限制质量分数范围。
- 为统计、预测、风险、质量和四维接口增加 pytest 单元测试与 API 契约测试。
- 将 CPU 密集型分析统一放入线程池或任务队列，并补充性能基线。
- 在 CI 中接入 Python 3.13、依赖审计和测试报告。

相关文档：

- [根目录项目 README](../README.md)
- [项目待优化清单](../docs/PROJECT_OPTIMIZATION_BACKLOG.md)
