# Analytics 响应契约版本化实施计划

> 目标：为 Analytics `/api/v1` 数据接口建立可追踪、可版本化、可安全解析的统一响应信封，并保留迁移期兼容性。

## 约束

- 开始前确认工作区已有的调研文档不属于本轮提交；不覆盖或回滚用户改动。
- 先写失败测试，再实现最小改动；计划、进度和说明使用中文。
- 不引入数据库、Redis 或生产依赖，不改变算法和请求路径。
- 成功元数据使用 `schemaVersion`、`requestId`、`generatedAt`、`modelVersion`、`inputSnapshotId`、`warnings`；保留旧 `processingTime` 和 `timestamp`。

## 任务 1：共享样本与 TypeScript parser

文件：

- 新增 `contracts/analytics-response-envelope.json`
- 新增 `contracts/analytics-error-envelope.json`
- 修改 `src/services/analytics/contracts/common.ts`
- 修改 `src/services/analytics/analyticsTypes.ts`
- 修改 `tests/service-analytics-contracts.test.ts`
- 修改 `tests/type-tests/analytics-contracts.test-d.ts`

- [x] 先添加完整元数据、部分元数据和共享样本失败测试。
- [x] 新增版本化元数据类型、成功响应解析和稳定错误信封类型。
- [x] 保持旧响应缺少版本字段时的兼容解析；一旦出现版本字段则成组校验。

## 任务 2：Python 统一成功/错误信封

文件：

- 新增或修改 `python-analytics-service/app/core/responses.py`
- 修改 `python-analytics-service/app/schemas/responses.py`
- 修改 `python-analytics-service/app/routes/analytics.py`
- 修改 `python-analytics-service/app/routes/quality.py`
- 修改 `python-analytics-service/app/routes/pivot.py`
- 修改 `python-analytics-service/app/main.py`
- 修改 `python-analytics-service/app/core/errors.py`

- [x] 添加响应模型、UTC 时间、输入快照摘要和安全错误构造失败测试。
- [x] 所有 `/api/v1` 业务数据路由通过统一 helper 返回成功信封。
- [x] 校验异常、内部异常统一返回安全错误结构，保留 422/500 状态码。
- [x] 保持 `/`、`/health`、`/metrics`、`/cache/clear` 现有专用响应。

## 任务 3：跨语言和接口回归

文件：

- 修改 `tests/service-analytics.test.ts`
- 修改 `tests/service-analytics-domain-contracts.test.ts`
- 修改 `tests/service-cross-language-hazard-contract.test.ts` 或新增响应契约测试
- 修改 `python-analytics-service/tests/test_api_routes.py`
- 修改 `python-analytics-service/tests/test_api_contract.py`
- 修改 `python-analytics-service/tests/test_cross_language_analytics_response.py`

- [x] TypeScript 和 Python 都读取共享响应样本。
- [x] 验证请求 ID、摘要稳定性、错误脱敏和页面现有结果解析。
- [x] 更新测试基线数量和项目规格/待优化清单。

## 任务 4：完整验收

- [x] `pnpm run lint`
- [x] `pnpm run format:check`
- [x] `pnpm run typecheck:client`
- [x] `pnpm run typecheck:server`
- [x] `pnpm run typecheck:contracts`
- [x] `pnpm run test:bff`
- [x] `pnpm run test:services`
- [x] `pnpm run test:component`
- [x] `pnpm run test:e2e`
- [x] `pnpm run test:python`
- [x] `pnpm run build`
- [x] `git diff --check`

完成：Analytics 响应契约已从 P1 剩余项移入已完成，统一灾害事件与图层注册表列为下一项。
