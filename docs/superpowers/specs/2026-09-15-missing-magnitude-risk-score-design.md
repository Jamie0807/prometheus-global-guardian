# 缺失震级时的风险评分契约设计

## 背景

灾害源允许 `magnitude` 缺失。风险服务按类型计算风险时直接以该类型的平均震级参与乘法；当所有震级缺失，Pandas 平均值为 `NaN`。响应清理逻辑会将该值序列化为 `null`，而前端风险响应契约要求 `riskScore` 为 0 到 100 的有限数字，因此分析页显示“分析服务返回的数据格式异常”。

## 决策

当一个灾害类型没有可用震级时：

- `averageMagnitude` 返回 `null`，明确表示源数据没有震级；
- `riskScore` 返回 `0`，保证该字段始终是有限数字并符合前端契约；
- 其他类型和具有震级的风险评分公式保持不变。

不为缺失震级虚构默认震级，以免提高并误导风险评分。

## 实现边界

只修改 Python `RiskAssessor._calculate_type_risks` 的缺失值处理，并增加两类回归测试：

1. FastAPI 风险评估接口接收仅缺失震级的灾害时，响应中的 `riskScore` 为 `0` 且 `averageMagnitude` 为 `null`。
2. TypeScript 风险响应解析器接受这组服务端输出。

## 验收标准

- 包含 `magnitude: null` 的有效分析请求不再触发前端 `AnalyticsContractError`。
- 已有带震级灾害的风险评分保持不变。
- 相关 Python 和 TypeScript 测试通过。
