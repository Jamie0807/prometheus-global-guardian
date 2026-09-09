# Python API 契约与分析可靠性实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 为 Python Analytics API 建立稳定错误契约、真实缓存、线程隔离和算法可靠性回归测试。

**架构：** 保持 `main.py` 的公开路由与成功响应，在其中补充请求上下文、异常转换和同步工作函数。只有综合分析使用完整请求语义的内存缓存；五个耗时入口使用 `asyncio.to_thread`。本轮不做目录拆分。

**技术栈：** FastAPI、Pydantic v2、asyncio、Pandas/NumPy、unittest、TestClient、Docker Compose。

## 全局约束

- 保留公开 URL、成功响应字段和已完成的 Pydantic 输入校验。
- 内部错误只能返回 `ANALYSIS_INTERNAL_ERROR`、固定用户消息和 request ID，不能包含异常文本。
- 仅 `/api/v1/analyze` 成功结果进入 300 秒、100 项上限的内存缓存。
- 缓存键用 `request.model_dump(mode="json")` 的键排序 JSON 和 SHA-256，覆盖完整请求语义。
- Pandas、模型和 ETL 计算必须由 `asyncio.to_thread` 在事件循环外执行。
- 不引入外部缓存、队列或 routes/schemas/services 目录拆分；未经用户明确要求不得提交。

---

### Task 1: 请求 ID 与稳定错误契约

**文件：**

- 修改：`python-analytics-service/main.py`
- 修改：`python-analytics-service/tests/test_api_routes.py`

**接口：** `attach_request_id(request, call_next)` 写入请求上下文和响应头；`raise_analysis_internal_error(request)` 记录堆栈并产生稳定 500 detail。

- [ ] **Step 1: 写入失败测试**

```python
def test_analysis_failure_hides_exception_and_returns_request_id(self):
    with patch.object(api.etl_processor, "convert_to_dataframe", side_effect=RuntimeError("secret path")):
        response = self.client.post("/api/v1/analyze", json={"hazards": [HAZARD]})
    self.assertEqual(response.status_code, 500)
    self.assertEqual(response.json()["detail"]["code"], "ANALYSIS_INTERNAL_ERROR")
    self.assertNotIn("secret path", response.text)
    self.assertEqual(response.headers["X-Request-Id"], response.json()["detail"]["requestId"])
```

- [ ] **Step 2: 确认 RED**

```bash
docker compose build analytics && docker compose run --rm analytics python -m unittest tests.test_api_routes
```

预期：错误响应暴露模拟异常，或不存在 `X-Request-Id`。

- [ ] **Step 3: 最小实现**

```python
@app.middleware("http")
async def attach_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response
```

为五个分析路由增加 `Request` 参数；仅在业务异常的 `except Exception` 中记录 `logger.exception` 并抛出稳定 500，不重写验证产生的 422。

- [ ] **Step 4: 确认 GREEN**：重复 Step 2 命令；预期所有路由测试通过。

### Task 2: 综合分析真实缓存与指标

**文件：**

- 修改：`python-analytics-service/main.py`
- 修改：`python-analytics-service/tests/test_api_contract.py`
- 修改：`python-analytics-service/tests/test_api_routes.py`

**接口：** `get_analysis_cache_key(request: AnalysisRequest) -> str`、`get_cached_analysis(key)`、`save_cached_analysis(key, response)` 仅由 `comprehensive_analysis`、`/metrics`、`/cache/clear` 使用。

- [ ] **Step 1: 写入失败测试**

```python
def test_comprehensive_analysis_caches_only_identical_complete_requests(self):
    with patch.object(api, "run_comprehensive_analysis", return_value=SUCCESS_RESULT) as worker:
        self.client.post("/api/v1/analyze", json={"hazards": [HAZARD]})
        self.client.post("/api/v1/analyze", json={"hazards": [HAZARD]})
        self.client.post("/api/v1/analyze", json={"hazards": [{**HAZARD, "title": "different"}]})
    self.assertEqual(worker.call_count, 2)
```

补充失败结果不缓存、`/metrics` 的实际 hit/miss、清缓存后重算测试。

- [ ] **Step 2: 确认 RED**

```bash
docker compose build analytics && docker compose run --rm analytics python -m unittest tests.test_api_contract tests.test_api_routes
```

预期：没有完整语义缓存或调用次数断言失败。

- [ ] **Step 3: 最小实现**

```python
def get_analysis_cache_key(request: AnalysisRequest) -> str:
    payload = request.model_dump(mode="json")
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
```

删除旧键函数和未接入装饰器。只在成功构造 `AnalysisResponse` 后写缓存，命中/未命中只在真实缓存路径递增。

- [ ] **Step 4: 确认 GREEN**：重复 Step 2 命令；预期缓存、指标和既有契约测试通过。

### Task 3: 耗时分析的线程隔离

**文件：**

- 修改：`python-analytics-service/main.py`
- 修改：`python-analytics-service/tests/test_api_routes.py`

**接口：** `run_comprehensive_analysis`、`run_statistics`、`run_predictions`、`run_etl`、`run_risk_assessment` 为同步工作函数；对应路由使用 `await asyncio.to_thread(worker, request)`。

- [ ] **Step 1: 写入失败测试**

```python
def test_statistics_dispatches_work_outside_event_loop(self):
    with patch.object(api.asyncio, "to_thread", new=AsyncMock(return_value={"ok": True})) as to_thread:
        response = self.client.post("/api/v1/statistics", json={"hazards": [HAZARD]})
    self.assertEqual(response.status_code, 200)
    to_thread.assert_awaited_once()
```

为预测、ETL、风险和综合入口添加相同调度断言。

- [ ] **Step 2: 确认 RED**：运行 `docker compose build analytics && docker compose run --rm analytics python -m unittest tests.test_api_routes`；预期专用路由没有调用 `asyncio.to_thread`。

- [ ] **Step 3: 最小实现**

```python
def run_statistics(request: AnalysisRequest) -> dict[str, Any]:
    dataframe = etl_processor.convert_to_dataframe([hazard.model_dump() for hazard in request.hazards])
    return statistical_analyzer.run_comprehensive_analysis(dataframe)

@app.post("/api/v1/statistics")
async def statistical_analysis(request: AnalysisRequest, http_request: Request):
    try:
        return {"success": True, "data": await asyncio.to_thread(run_statistics, request)}
    except Exception:
        raise_analysis_internal_error(http_request)
```

综合分析的 DataFrame 转换、质量计算和三项任务也必须离开事件循环；不改成功响应。

- [ ] **Step 4: 确认 GREEN**：重复 Step 2 命令；预期路由和线程调度测试通过。

### Task 4: 算法确定性、清单与全量验证

**文件：**

- 修改：`python-analytics-service/analytics/statistical_algorithms.py`
- 修改：`python-analytics-service/analytics/prediction_models.py`
- 修改：`python-analytics-service/analytics/risk_assessment.py`
- 修改：`python-analytics-service/tests/test_result_semantics.py`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**接口：** 现有 `clean_for_json` 与预测结果的 `status="failed"`、`reason="model_error"` 保持为可验证的稳定输出。

- [ ] **Step 1: 写入失败测试**

```python
def test_clean_for_json_converts_nested_numpy_non_finite_values(self):
    result = clean_for_json({"values": [np.float64("nan"), np.float64("inf")]})
    self.assertEqual(result, {"values": [None, None]})
```

补充预测模型抛出 `ValueError("model detail")` 时只得到 `failed/model_error`，并覆盖统计缺列和风险空数据的稳定契约。

- [ ] **Step 2: 确认 RED**：运行 `docker compose build analytics && docker compose run --rm analytics python -m unittest tests.test_result_semantics`；预期至少一个非有限数值或模型异常契约断言失败。

- [ ] **Step 3: 最小实现与文档**：扩展 JSON 清理函数以处理 Python/NumPy 非有限数值，保持模型异常的稳定状态，不改风险权重、预测参数或成功字段。将该 P1 从优先级矩阵移入“已完成优化项”。

- [ ] **Step 4: 运行全量验证**

```bash
docker compose build analytics && docker compose run --rm analytics python -m unittest discover -s tests -p 'test_*.py'
pnpm run test:baseline
pnpm exec prettier --check docs/PROJECT_OPTIMIZATION_BACKLOG.md docs/superpowers/specs/2026-09-09-python-api-reliability-design.md docs/superpowers/plans/2026-09-09-python-api-reliability.md
git diff --check
```

预期：Python unittest、Node/BFF 基线、格式与 diff 校验均通过；记录 Node 版本警告，但不把它判定为代码失败。
