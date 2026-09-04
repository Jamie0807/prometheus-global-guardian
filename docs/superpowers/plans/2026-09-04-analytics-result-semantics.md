# P1：Analytics 结果语义与展示一致性

## 目标

统一预测、风险评估和数据质量结果的业务语义，让 Python API 返回可判断的状态和依据，前端在展示前完成有限值、范围、缺失状态和中英文文案归一化。兼容保留现有字段，避免本阶段扩大为 `AnalyticsPage.tsx` 全量拆分。

## 任务 1：稳定 Python 结果契约

文件范围：

- `python-analytics-service/analytics/prediction_models.py`
- `python-analytics-service/analytics/risk_assessment.py`
- `python-analytics-service/analytics/quality_monitor.py`
- `python-analytics-service/analytics/etl_processor.py`（如响应映射需要）
- `python-analytics-service/tests/test_result_semantics.py`

要求：

1. 每个预测模型统一返回 `status`、`reason`、`dataPoints`、`minimumDataPoints` 和 `confidence`；状态至少区分 `ready`、`insufficient_data` 和 `model_error`。
2. 预测准确率和置信度使用有限值并限制在合法范围；样本不足时明确返回已有数据量和最低要求，不再只返回 `N/A` 所代表的空语义。
3. 风险结果保留现有 `recommendations` 字符串兼容字段，同时增加 `recommendationDetails`，每条建议包含 `ruleId`、`severity`、触发指标和消息，明确总体风险与单项规则告警可以同时存在。
4. 数据质量检查统一识别前端实际使用的大写灾害类型、严重程度和来源别名；每个维度和综合评分最终限制在 `0..1`，不产生负分、NaN 或 Infinity。
5. 通过标准库 `unittest` 覆盖预测状态、风险规则元数据、质量评分范围和大小写归一化。

## 任务 2：前端结果展示适配

文件范围：

- `src/services/analytics/analyticsPresentation.ts`
- `src/components/AnalyticsPage.tsx`
- `src/components/DataQualityMonitor.tsx`
- `tests/service-analytics-presentation.test.ts`

要求：

1. 增加纯函数展示适配层，使用 `unknown` 边界输入，安全处理有限数字、百分比、风险等级、趋势和预测状态。
2. 预测卡片显示“可用 / 样本不足 / 模型失败 / 暂无结果”等明确中文状态，并在样本不足时显示实际样本数和最低要求；不把缺失状态显示成 `N/A`。
3. 风险等级、趋势、建议和建议触发原因统一为中文；建议列表显示规则严重程度和指标，避免总体 LOW 与单项高关注告警被误解为接口冲突。
4. 数据质量面板显示 0–100 范围内的有限分数，进度条宽度同步截断在 0–100%，阈值显示使用后端真实配置；异常数据降级为“暂无数据”而不是 NaN 或负百分比。
5. 通过纯函数测试覆盖样本不足、模型失败、无效分数、风险建议和质量分数边界。

## 任务 3：文档、清单和验证

文件范围：

- `python-analytics-service/README.md`
- `README.md`
- `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- `docs/TESTING_BASELINE.md`

要求：

1. 记录预测状态、风险建议规则元数据、质量评分单位和前端展示降级约定。
2. 将 P1 条目标记为“第一阶段已完成”，明确后续仍需补充的完整 i18n 资源、更多组件状态、算法可靠性和视觉回归。
3. 不把本阶段标记为完成 Python 服务拆分、CI 接入或全部 Analytics 响应类型治理。

## 验证

```bash
PYTHONDONTWRITEBYTECODE=1 UV_CACHE_DIR=/tmp/prometheus-uv-cache \
uv run --offline --python 3.11 --with-requirements requirements.txt \
python -m unittest discover -s tests -p 'test_*.py'
pnpm run test:services
pnpm run test:component
pnpm run format:check
pnpm run lint
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
pnpm test
git diff --check
```

## 约束

- 开发前先写失败测试并观察失败原因；仅在测试或契约需要时修改生产代码。
- 不自动执行 `git add`、`git commit`、push 或创建 PR；提交需等待用户再次明确要求。
- 不引入新的状态管理库、不重写 Analytics 页面结构、不改变既有 API 路径。
