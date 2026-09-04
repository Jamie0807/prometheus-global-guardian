# P0：统一灾害数据与 Analytics API 契约

## 目标

修复前端 `Hazard`、Analytics Service 和 Python FastAPI 之间的字段与请求体不一致，使真实灾害数据能够完整进入分析服务，并让 4D 接口实际使用前端传入的参数。

## 当前问题

- `src/services/analytics/analyticsService.ts` 的 `formatHazards` 主要读取 `properties.*`，但项目标准 `Hazard` 使用顶层 `title`、`timestamp`、`severity`、`source` 和 `magnitude`。
- 当前映射对 `0` 等合法数值使用 truthy 判断，会错误转换成 `null` 或默认值。
- 4D Service 请求使用 `{ data: ... }`，而 FastAPI `AnalysisRequest` 只声明 `hazards`。
- FastAPI `AnalysisRequest` 没有声明 `time_dim`、`geo_dim`、`aggfunc`、`time_range`、`regions`、`types`、`severities` 和 `time_window`，端点只能通过 `hasattr` 读取不存在的字段，参数不会稳定生效。
- 4D 创建接口固定使用 `aggfunc='count'`，没有使用前端传入的聚合函数。

## 统一契约

标准分析请求使用以下 JSON 结构，所有分析端点共享 `hazards`：

```json
{
  "hazards": [
    {
      "id": "hazard-1",
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
```

`analysisType`、`timeRange` 和 `populationExposed` 保持现有客户端兼容命名；4D 查询参数按 Python 现有接口约定使用 snake_case。前端必须发送 `hazards`，不再发送 `data`。

## 执行任务

### 任务 1：修正前端数据适配和类型

文件范围：

- `src/services/analytics/analyticsTypes.ts`
- `src/services/analytics/analyticsService.ts`

要求：

1. 为 `HazardData.coordinates` 定义明确的二维坐标类型，并为 `AnalysisRequest` 补充所有 4D 可选字段。
2. `formatHazards` 对每个标准字段优先读取顶层 `Hazard`，只有顶层缺失时才读取历史 `properties` 兼容字段。
3. 使用 `null` / `undefined` 判断保留 `0`、空数组以外的合法值，并继续为缺失字段提供稳定默认值。
4. `create4DPivotTable`、`multiDimensionalQuery`、`analyze4DTrends`、`calculate4DRiskScores` 和 `get4DSummary` 的请求体统一使用 `hazards`。
5. 4D 请求类型和序列化字段与 FastAPI 模型逐项对应。

先在 `tests/service-analytics.test.ts` 增加失败测试，覆盖扁平顶层字段、合法零值、properties 兼容回退以及 4D 请求体字段；确认测试先失败，再实现最小修改并运行该测试文件。

### 任务 2：显式声明并使用 Python API 契约

文件范围：

- `python-analytics-service/main.py`
- `python-analytics-service/requirements.txt`（只有确有需要时修改）

要求：

1. 扩展 `AnalysisRequest`，显式声明 `time_dim`、`geo_dim`、`aggfunc`、`time_range`、`regions`、`types`、`severities` 和 `time_window`，使用 Pydantic 类型和默认值表达接口约束。
2. 保持现有主分析字段兼容，不引入隐式 `data` / `hazards` 双写协议。
3. 4D 创建接口使用请求中的 `time_dim`、`geo_dim` 和 `aggfunc`，不再通过 `hasattr` 或固定值绕过模型。
4. 4D 查询、趋势和风险端点直接读取已声明字段，并把请求参数原样回显到响应的 `query_params` 或 `time_window` 中。
5. 仅做本 P0 契约需要的修改，不顺带拆分 Python 服务结构或重写分析算法。

先为 Pydantic 模型和 4D 端点行为增加最小失败测试。由于当前 Python 测试脚本不是 pytest，测试可以使用标准库 `unittest`，直接调用异步端点或使用 FastAPI `TestClient`；不得依赖外部已启动服务。先观察失败，再实现并运行测试。

### 任务 3：跨端回归与文档同步

文件范围：

- `tests/service-analytics.test.ts`（如任务 1 已修改则继续补充，不重复重写）
- Python 契约测试文件（任务 2 新增的文件）
- `python-analytics-service/README.md`
- `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

要求：

1. 前端测试验证标准 `Hazard` 的标题、时间、严重性、来源和震级进入请求 payload。
2. 4D 测试验证请求名为 `hazards`，且时间维度、地理维度、聚合函数、筛选参数和时间窗口不会被丢弃。
3. Python 测试验证 Pydantic 接收完整 payload，并验证 4D 端点使用传入参数而非默认值。
4. Python README 的请求模型和 4D 参数说明与代码保持一致。
5. 将 P0 条目标记为已完成或“第一阶段已完成”，记录验证命令和尚未解决的更大范围问题；不把本次未实现的限流、统一错误码或服务拆分标记为完成。

## 验证命令

按以下顺序运行：

```bash
pnpm exec vitest run tests/service-analytics.test.ts
python -m unittest discover -s python-analytics-service/tests -p 'test_*.py'
pnpm run format:check
pnpm run lint
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
pnpm test
```

如果仓库现有 Python 测试目录不存在，应由任务 2 创建 `python-analytics-service/tests/`，并在 README 中说明测试入口。验证阶段记录 Node engine warning，但不能把 warning 当作测试失败。

## 约束

- 本次实现阶段不自动执行 `git commit`。
- 不回退或覆盖提交 `35340b9` 之前的文档改动。
- 不扩大为 Python 服务目录重构、Analytics UI 重写或安全治理任务。
- 所有新增和修改的 TypeScript 遵循严格类型；外部数据在边界使用 `unknown`，避免新增 `any`。
