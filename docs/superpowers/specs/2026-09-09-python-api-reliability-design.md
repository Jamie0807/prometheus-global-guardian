# Python API 契约与分析可靠性设计

## 目标

使 Python Analytics API 在算法或依赖失败时返回稳定、可追踪且不泄露内部细节的响应；让缓存指标反映真实命中；使 Pandas 与模型计算不阻塞 FastAPI 事件循环；以确定性测试保护空数据、脏数据和算法失败场景。

## 范围

本轮覆盖 `python-analytics-service` 中综合分析、统计、预测、ETL 与风险评估接口。保留既有 URL、成功响应字段和 Pydantic 输入模型。路由、模型、业务模块的大规模目录拆分不在本轮范围，归入后续“Python 服务结构整理”。

## 可靠性契约

### 请求追踪与错误响应

- 每个 HTTP 请求取得或生成一个 request ID：优先使用合法的 `X-Request-Id`，否则生成 UUID。
- 所有响应附带 `X-Request-Id`，包括 FastAPI 的 422 校验响应和内部错误响应。
- 已进入业务处理的异常统一转换为 HTTP 500，响应体固定为 `{ "detail": { "code": "ANALYSIS_INTERNAL_ERROR", "message": "Analysis service failed to process the request.", "requestId": "..." } }`。
- 不向客户端返回 `str(exception)`、栈、文件路径或上游错误详情。日志记录 request ID、方法、路径、稳定错误码与 `logger.exception` 的堆栈。
- 业务输入无效继续由 Pydantic/FastAPI 返回 422；本轮不改变上一项已落地的输入限制和其字段级错误详情。

### 真实综合分析缓存

- 仅缓存 `/api/v1/analyze` 的成功 `AnalysisResponse`，TTL 仍为 300 秒，容量仍为 100 项。
- 缓存键由完整、确定性的请求语义生成：所有 hazard 字段和 `analysisType`、`timeRange`、4D 维度、筛选条件及时间窗口都会参与；字典键按固定顺序序列化并用 SHA-256 摘要。
- 同一语义请求在 TTL 内返回缓存的成功结果；任何参与分析的字段改变都必须成为缓存未命中。
- 缓存命中与未命中只由该真实缓存更新；`/metrics` 继续显示它们，并将 `cacheEnabled` 标记与实际行为一致。
- 管理端 `/cache/clear` 同时清除缓存内容；不重置历史命中计数。
- 不缓存内部失败、422 或专用分析接口的结果，避免把错误和不完整的响应当成可复用数据。

### 耗时计算隔离

- 将 DataFrame 转换、统计分析、预测、ETL 处理和风险评估封装为同步工作函数，并从 `async` 路由通过 `asyncio.to_thread` 调度。
- 综合分析仍并行执行统计、预测和风险三项工作，且 DataFrame 转换和质量计算不在事件循环中执行。
- 专用统计、预测、ETL、风险接口也使用相同的线程调度边界。
- 本轮不引入队列、持久任务或全局并发限额；后续以测得的延迟和吞吐决定是否需要。

## 分析行为与确定性

- 空 DataFrame、缺少必需列、无有效 magnitude、未知枚举、NaN/Infinity 和模型异常必须有明确、可重复的结果或稳定的内部错误契约。
- 既有预测的 `status`、`reason`、数据点和置信度，以及风险建议和质量评分范围保持兼容。
- 清理函数继续保证 JSON 输出没有 NaN 或 Infinity；新增测试验证包含 NumPy 标量的嵌套结果。
- 不在本轮校准风险权重、预测模型或统一模型的业务阈值；这些需要真实业务样本和独立验收。

## 测试与验收

- HTTP 测试验证：分析异常不泄露内部错误、响应与 422 均携带 request ID、传入合法 request ID 能被回传。
- 缓存测试验证：相同完整输入命中、仅改变未被旧键覆盖的字段时未命中、TTL 失效后重新计算、失败结果不入缓存、指标与缓存大小一致。
- 路由测试 mock `asyncio.to_thread` 或同步工作函数，验证五个分析入口均在事件循环外调度，同时保持成功响应。
- 算法测试覆盖空数据、缺列、非有限数值、未知值和异常路径，断言稳定结果或稳定的错误契约。
- 最终运行 Python unittest、Node/BFF 基线、文档格式检查和 `git diff --check`。

## 非目标与兼容性

- 不修改公开路径、正常成功响应或前端调用方式。
- 不对已完成的输入大小和数值边界重复实现。
- 不拆分 `main.py` 到 routes/schemas/services 目录，不添加外部缓存或任务队列。
