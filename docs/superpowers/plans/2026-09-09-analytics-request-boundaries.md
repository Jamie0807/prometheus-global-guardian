# 分析服务请求体与数值边界实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在所有 Python 分析入口拒绝超限或非法请求体，使其在进入 Pandas 和分析算法前返回 422。

**Architecture:** 用 `HazardData` 及三个请求模型作为唯一的 Pydantic 输入边界；共享字段与列表约束让复用这些模型的路由自动受保护。补充模型和 HTTP 路由契约测试，确保超限输入不会调用分析实现。

**Tech Stack:** Python 3、FastAPI、Pydantic v2、unittest、httpx TestClient。

## 全局约束

- hazards 取值 1–1,000；每个多源数组最多 1,000；每个查询筛选数组最多 100。
- 所有超限、非法或额外字段输入均返回 422，不截断、不修正。
- 只改变 Python 分析服务输入边界；不改变响应成功结构、算法、BFF 或前端错误展示。
- 不执行 Git 提交，除非用户再次明确要求。

---

### Task 1: 为共享模型写入失败边界契约

**Files:**

- Modify: `python-analytics-service/tests/test_api_contract.py:25-82`

**Interfaces:**

- Consumes: `main.HazardData`、`main.AnalysisRequest`、`main.QualityCheckRequest`、`main.UnifiedDataRequest`。
- Produces: 可执行的 Pydantic 失败契约，规定所有模型的数组、文本、坐标和数值上限。

- [ ] **Step 1: 写入失败模型测试**

在 `AnalysisRequestContractTests` 添加参数化 subTest，验证以下构造均抛 `ValidationError`：

```python
too_many_hazards = [HAZARD] * 1001
invalid_coordinates = {**HAZARD, "coordinates": [181, 91]}
invalid_time_range = ["2026-09-03T00:00:00.000Z", "2026-09-01T00:00:00.000Z"]

with self.assertRaises(ValidationError):
    api.AnalysisRequest(hazards=too_many_hazards)
with self.assertRaises(ValidationError):
    api.AnalysisRequest(hazards=[invalid_coordinates])
with self.assertRaises(ValidationError):
    api.AnalysisRequest(hazards=[HAZARD], time_range=invalid_time_range)
```

再验证 `timeRange=0`、`timeRange=3651`、`time_window=366`、101 个筛选项、空白筛选项、超长 title、`float("inf")` magnitude、负 populationExposed，以及任一 `UnifiedDataRequest` 来源数组 1001 条均失败。

- [ ] **Step 2: 运行测试确认失败**

Run: `cd python-analytics-service && python -m unittest tests.test_api_contract.AnalysisRequestContractTests`

Expected: 新增输入会被当前模型接受，测试失败。

### Task 2: 实现共享 Pydantic 输入边界

**Files:**

- Modify: `python-analytics-service/main.py:55-112,340-348,440-458`
- Test: `python-analytics-service/tests/test_api_contract.py:25-82`

**Interfaces:**

- Consumes: Task 1 的失败契约和 FastAPI/Pydantic v2。
- Produces: 受限的 `HazardData`、`AnalysisRequest`、`QualityCheckRequest`、`UnifiedDataRequest`，以及受限的 quality history `limit`。

- [ ] **Step 1: 定义命名限制常量与受限字段**

在模型定义上方声明：

```python
MAX_HAZARDS = 1_000
MAX_FILTER_VALUES = 100
MAX_SOURCE_RECORDS = 1_000
MAX_FILTER_TEXT_LENGTH = 128
```

使用 `Field(min_length=..., max_length=..., ge=..., le=...)` 限制 hazards、筛选数组、文本和整数。`HazardData`、`QualityCheckRequest` 和 `UnifiedDataRequest` 设置 `model_config = ConfigDict(extra="forbid")`。

- [ ] **Step 2: 添加坐标、数值和时间验证器**

为 `HazardData.coordinates` 验证长度为 2、两个值均有限且经纬度在范围内；为可选 magnitude 验证有限且 -20–20；为 time_range 验证 ISO 时间戳及开始不晚于结束。拒绝空白筛选字符串。

- [ ] **Step 3: 移除综合分析静默截断**

删除 `/api/v1/analyze` 中以下逻辑：

```python
if len(request.hazards) > 1000:
    request.hazards = request.hazards[:1000]
```

模型限制会在进入路由前返回 422。

- [ ] **Step 4: 限制质量历史查询参数**

将路由签名改为：

```python
async def get_quality_history(limit: int = Query(default=10, ge=1, le=100)):
```

并导入 `Query`。

- [ ] **Step 5: 运行模型契约测试确认通过**

Run: `cd python-analytics-service && python -m unittest tests.test_api_contract.AnalysisRequestContractTests`

Expected: 全部通过。

### Task 3: 验证 HTTP 422 路由边界并更新待办

**Files:**

- Modify: `python-analytics-service/tests/test_api_routes.py:1-180`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md:39-46,385-400`

**Interfaces:**

- Consumes: Task 2 的请求模型与质量 history `limit`。
- Produces: 真实路由的 422 回归测试和已完成待办记录。

- [ ] **Step 1: 写入 HTTP 路由断言**

使用现有 `TestClient` 为以下请求添加 422 断言：

```python
response = self.client.post("/api/v1/analyze", json={"hazards": [HAZARD] * 1001})
self.assertEqual(response.status_code, 422)

response = self.client.post("/api/v1/quality/assess", json={"hazards": [HAZARD] * 1001})
self.assertEqual(response.status_code, 422)

response = self.client.post("/api/v1/unified-model/merge", json={"usgs_data": [{}] * 1001})
self.assertEqual(response.status_code, 422)

response = self.client.get("/api/v1/quality/history?limit=101")
self.assertEqual(response.status_code, 422)
```

对 `/api/v1/analyze` 的测试 patch 分析器并断言其未调用，证明无效请求不会进入业务逻辑。

- [ ] **Step 2: 运行路由测试确认失败**

Run: `cd python-analytics-service && python -m unittest tests.test_api_routes`

Expected: 当前实现对至少一个超限请求返回非 422，或业务 mock 被调用。

- [ ] **Step 3: 在 Task 2 实现后运行路由测试确认通过**

Run: `cd python-analytics-service && python -m unittest tests.test_api_routes`

Expected: 全部路由契约通过。

- [ ] **Step 4: 更新优化清单**

从剩余优化矩阵移除“统一请求体、数组长度和数值范围校验”，在已完成表中记录统一 Pydantic 限制、422 语义与覆盖范围；P1 “Python API 契约与分析可靠性”仍保留为后续工作。

### Task 4: 完整验证

**Files:**

- Verify: `python-analytics-service/main.py`
- Verify: `python-analytics-service/tests/test_api_contract.py`
- Verify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- Consumes: 前三项实现和既有项目验证脚本。
- Produces: 可复现的完整质量证据。

- [ ] **Step 1: 运行 Python 全量测试**

Run: `docker compose run --rm analytics python -m unittest discover -s tests -p 'test_*.py'`

Expected: 所有 Python unittest 通过。

- [ ] **Step 2: 运行 Node 完整基线**

Run: `pnpm run test:baseline`

Expected: lint、格式、双端类型检查、BFF/Service/组件/E2E 测试和构建全部通过。

- [ ] **Step 3: 检查格式与差异**

Run: `pnpm exec prettier --check docs/PROJECT_OPTIMIZATION_BACKLOG.md docs/superpowers/specs/2026-09-09-analytics-request-boundaries-design.md docs/superpowers/plans/2026-09-09-analytics-request-boundaries.md && git diff --check`

Expected: 两个命令均返回 0。

## 计划自检

- 规格覆盖：Task 1 和 2 覆盖全部共享请求模型、坐标、文本、数值和时间范围；Task 3 覆盖真实 HTTP 422 行为；Task 4 覆盖跨服务验证。
- 占位符检查：无 TBD、TODO 或未定义的后续实现描述。
- 类型一致性：所有路由继续接收既有 Pydantic 模型；限制仅在模型输入层增加，不改变成功响应契约。
