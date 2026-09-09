# 分析服务请求体与数值边界设计

## 目标

在 FastAPI 分析服务入口统一校验请求体大小、数组长度、字符串长度、坐标和数值范围。无效或超限输入在进入 Pandas 和分析算法前返回标准 FastAPI 422，绝不静默截断。

## 范围

- `AnalysisRequest`：综合分析、统计、预测、ETL、风险评估和所有 4D 透视表接口。
- `QualityCheckRequest`：质量评估与统一模型转换。
- `UnifiedDataRequest`：USGS、NASA 和 GDACS 多源合并。
- `GET /api/v1/quality/history` 的 `limit` 查询参数。
- Python API 契约测试与待优化清单。

本次不改变分析算法、响应数据结构、BFF 请求限制或前端错误展示。

## 统一限制

| 输入                                                     | 规则                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `hazards`                                                | 1–1,000 条                                                                         |
| `usgs_data`、`nasa_data`、`gdacs_data`                   | 每个来源最多 1,000 条                                                              |
| `regions`、`types`、`severities`                         | 每个数组最多 100 项                                                                |
| 每个筛选字符串                                           | 去除首尾空白后长度 1–128                                                           |
| `id`、`type`、`title`、`timestamp`、`source`、`severity` | 分别限制为 128、64、256、64、64、64 字符                                           |
| `coordinates`                                            | 恰好两个有限数值，顺序为 `[longitude, latitude]`，范围为经度 -180–180、纬度 -90–90 |
| `magnitude`                                              | 有限数值，范围 -20–20                                                              |
| `populationExposed`                                      | 整数，范围 0–1,000,000,000                                                         |
| `timeRange`                                              | 整数，范围 1–3,650 天                                                              |
| `time_window`                                            | 整数，范围 1–365 天                                                                |
| `quality/history?limit`                                  | 整数，范围 1–100                                                                   |

`time_range` 仍要求恰好两个有效 ISO 8601 时间戳；开始时间必须不晚于结束时间。空白筛选项、空字符串字段、非有限数值和额外字段均拒绝。

## 模型与路由行为

定义可复用的 Pydantic 字段约束和验证器，让 `HazardData` 成为所有 hazards 路由的单一边界模型。`AnalysisRequest`、`QualityCheckRequest` 与 `UnifiedDataRequest` 配置 `extra="forbid"`，防止未声明字段进入业务逻辑。

`AnalysisRequest` 不再在 `/api/v1/analyze` 内截断超过 1,000 条 hazards；模型验证会在路由运行前拒绝。多源合并请求对每个来源数组独立限制，允许省略某个来源或传空数组，但不能超出单源上限。

`quality/history` 使用 FastAPI `Query` 声明范围，使非法 `limit` 一致返回 422。所有失败响应保持 FastAPI 既有的 `detail` 结构，不暴露内部异常。

## 测试与验证

- Pydantic 契约测试覆盖 hazards 与来源数组的上限、非法坐标、非有限数值、越界 magnitude/人口、空白或超长字符串、越界时间窗口和逆序时间范围。
- 路由测试覆盖 `/api/v1/analyze`、质量评估、统一模型合并和质量历史在非法输入时返回 422，且不会调用分析实现。
- 保留有效边界值的成功路径测试。
- 完成后运行 Node 基线、Docker Python unittest、格式检查和 `git diff --check`。

## 边界

当前限制以单进程 Pandas 分析的可预测成本为目标。若部署后需要更大批量，需先以吞吐、内存和超时数据为依据调整固定上限；不在本次引入流式上传、分页、任务队列或后台计算。
