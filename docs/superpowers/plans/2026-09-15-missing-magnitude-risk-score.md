# 缺失震级风险评分修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让缺失震级的有效灾害数据仍能产生符合前端契约的风险评估响应。

**Architecture:** 保持 `averageMagnitude` 的缺失语义为 `null`。在风险算法边界将缺失平均震级对应的 `riskScore` 规范化为 `0`，从源头保证响应中的分数是有限数值；前端解析契约无需放宽。

**Tech Stack:** Python、Pandas、FastAPI、unittest、TypeScript、Vitest。

## Global Constraints

- 不新增默认震级或数据库。
- `averageMagnitude` 在没有可用震级时必须保持 `null`。
- `riskScore` 必须是 0 到 100 的有限数字，以符合 `parseRiskAssessment`。
- 不执行 Git 提交；当前项目规则要求用户明确提出后才可提交。

---

### Task 1: 规范化缺失震级的类型风险分数

**Files:**

- Modify: `python-analytics-service/analytics/risk_assessment.py:104-127`
- Test: `python-analytics-service/tests/test_result_semantics.py`
- Verify: `tests/service-analytics-domain-contracts.test.ts`

**Interfaces:**

- Consumes: `RiskAssessor.calculate_comprehensive_risk(df: pd.DataFrame) -> dict[str, Any]`。
- Produces: `data.typeRisks[type].riskScore: number` 与 `averageMagnitude: number | null`。

- [ ] **Step 1: 写入失败的服务端语义测试**

```python
def test_risk_assessment_uses_zero_score_when_a_type_has_no_magnitude(self):
    frame = pd.DataFrame([
        {"type": "WILDFIRE", "timestamp": "2026-09-15T00:00:00Z", "coordinates": [116.4, 39.9], "magnitude": None}
    ])

    result = RiskAssessor().calculate_comprehensive_risk(frame)

    self.assertEqual(result["typeRisks"]["WILDFIRE"]["riskScore"], 0)
    self.assertIsNone(result["typeRisks"]["WILDFIRE"]["averageMagnitude"])
```

- [ ] **Step 2: 验证测试为 RED**

Run: `python-analytics-service/.venv/bin/python -m unittest python-analytics-service/tests/test_result_semantics.py`

Expected: `FAIL`，断言实际 `riskScore` 为 `None` 而非 `0`。

- [ ] **Step 3: 写入最小实现**

```python
average_magnitude = type_df["magnitude"].mean() if "magnitude" in type_df.columns else 5.0
has_magnitude = not pd.isna(average_magnitude)
risk_score = count * average_magnitude * self.risk_weights.get(hazard_type, 0.1) if has_magnitude else 0

type_risks[hazard_type] = {
    "count": count,
    "riskScore": round(risk_score, 2),
    "averageMagnitude": round(average_magnitude, 2) if has_magnitude else None,
    "weight": self.risk_weights.get(hazard_type, 0.1),
}
```

- [ ] **Step 4: 验证服务端测试为 GREEN**

Run: `python-analytics-service/.venv/bin/python -m unittest python-analytics-service/tests/test_result_semantics.py`

Expected: `OK`，新用例通过。

- [ ] **Step 5: 运行已有前端契约回归测试**

Run: `pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts`

Expected: 全部通过，且新增用例证明前端可接受服务端规范化后的响应。

- [ ] **Step 6: 运行相关完整验证**

Run: `pnpm run test:python && pnpm exec vitest run tests/service-analytics-domain-contracts.test.ts && git diff --check`

Expected: Python 测试、前端契约测试和 diff 检查全部成功。
