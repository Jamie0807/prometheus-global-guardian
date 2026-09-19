# Analytics 响应契约版本化设计

状态：已实现并完成验证。范围：FastAPI Analytics `/api/v1` 数据接口、前端 Analytics Service 解析器、Python/TypeScript 共享响应样本和错误信封测试。

## 1. 目标

统一 Analytics 成功响应的元数据，使前端能够判断响应版本、请求归属、生成时间、模型版本、输入快照和警告；统一业务异常和校验异常的安全错误结构，避免页面收到无法区分的原始异常文本。

本轮不引入数据库，不改变分析算法、输入字段、页面展示和 HTTP 路径；不把管理接口 `/metrics`、`/cache/clear` 或健康接口纳入业务分析信封。

## 2. 成功响应

所有 `/api/v1` 分析、预测、风险、ETL、质量、统一模型和透视接口返回以下顶层字段：

```json
{
  "success": true,
  "data": {},
  "schemaVersion": "1.0",
  "requestId": "request-id",
  "generatedAt": "2026-09-19T00:00:00Z",
  "modelVersion": "analytics-model-v1",
  "inputSnapshotId": "sha256-hex",
  "warnings": [],
  "processingTime": 0.0,
  "timestamp": "2026-09-19T00:00:00Z"
}
```

- `schemaVersion` 固定为 `1.0`，代表响应字段契约版本。
- `requestId` 沿用 FastAPI 请求中间件生成或接收的标识，并同时写入 `X-Request-Id` 响应头。
- `generatedAt` 使用 UTC ISO 8601 时间；`timestamp` 保留为兼容别名。
- `modelVersion` 当前为 `analytics-model-v1`，用于标识算法组合版本，不宣称单个模型训练版本。
- `inputSnapshotId` 是规范化请求模型 JSON 的 SHA-256 十六进制摘要，不保存原始数据。
- `warnings` 当前默认为空数组，为后续陈旧数据、部分结果和降级原因保留稳定位置。
- `processingTime` 保留现有秒单位，避免改变已有调用方语义。

前端 parser 对新信封字段进行成组校验：如果响应出现任一版本化字段，则其余必填元数据也必须存在且类型正确；旧测试或旧服务响应在迁移期仍可按原有兼容字段解析。

## 3. 错误响应

业务异常、内部异常和请求校验异常统一返回：

```json
{
  "success": false,
  "schemaVersion": "1.0",
  "requestId": "request-id",
  "generatedAt": "2026-09-19T00:00:00Z",
  "modelVersion": "analytics-model-v1",
  "warnings": [],
  "error": {
    "code": "ANALYTICS_INTERNAL_ERROR",
    "message": "Analysis service failed to process the request.",
    "requestId": "request-id"
  }
}
```

错误 `message` 只允许安全的稳定文案；不返回 Python 异常文本、请求正文或上游响应。输入校验失败使用 `ANALYTICS_VALIDATION_ERROR`，内部执行失败使用 `ANALYTICS_INTERNAL_ERROR`。HTTP 状态码保持现有语义：校验错误 422，内部错误 500。

## 4. 输入快照与兼容性

输入快照只存摘要，不写日志、不返回原始请求。规范化过程使用 Pydantic `model_dump(mode="json")`、排序键和紧凑 JSON；查询参数接口把已验证的 query 参数纳入摘要。前端不根据 `modelVersion` 做算法判断，只展示或记录可追踪元数据。

## 5. 测试范围

- Python：成功信封字段、请求 ID 回传、输入摘要稳定性、内部错误信封和校验错误信封。
- TypeScript：成功信封元数据解析、部分元数据拒绝、共享样本解析和旧响应兼容。
- 跨语言：Python Pydantic 与 TypeScript parser 都读取 `contracts/analytics-response-envelope.json` 和 `contracts/analytics-error-envelope.json`。
- 既有领域 parser 和组件行为保持不变。

## 6. 非目标

- 不为模型结果建立数据库或历史版本表。
- 不统一业务 `data` 内部字段；事件/图层注册表另立 P1 任务。
- 不修改浏览器页面文案和图表数据转换逻辑。
