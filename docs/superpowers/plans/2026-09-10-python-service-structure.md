# Python 服务结构整理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Python 分析服务的应用装配、HTTP 路由、数据契约和分析调度拆分为独立模块，同时保持所有现有 API 契约与运行方式。

**Architecture:** 根目录 `main.py` 保留 `app` 和 `uvicorn main:app` 兼容入口。`app/main.py` 创建 FastAPI 应用、注册中间件和四组路由；路由只处理 HTTP 输入输出并从 `app.state` 取得服务；服务模块保存原有计算、缓存和指标逻辑并调用既有 `analytics/` 算法。

**Tech Stack:** Python 3.13、FastAPI、Pydantic v2、pandas、NumPy、unittest、FastAPI TestClient。

## Global Constraints

- 保持已有 URL、HTTP 方法、请求字段、Pydantic 约束、成功响应字段、管理接口 404 策略、CORS、缓存 TTL 300 秒和最多 100 项不变。
- 保持 `/api/v1/analyze` 的缓存口径、三任务并行和其他五个分析接口的 `asyncio.to_thread` 调度。
- 根目录 `main.py` 必须继续提供 `app`，以兼容 `python main.py`、`uvicorn main:app`、Docker CMD 和现有测试导入。
- 服务层不得导入 FastAPI HTTP 类型；路由层不得直接操作算法引擎、缓存或全局指标。
- 不修改 `analytics/` 中的计算算法；不在本次重构改变公开错误响应。质量和透视接口原始异常回显另行治理。
- 先写失败测试并确认失败原因，再写生产代码；不暂存、不提交、不推送。

---

### Task 1: Python 3.13 测试基线与兼容入口

**Files:**

- Create: `python-analytics-service/tests/test_app_factory.py`
- Modify: `python-analytics-service/main.py`
- Test: `python-analytics-service/tests/test_app_factory.py`

**Interfaces:**

- Produces `app.main.create_app() -> FastAPI`，根目录 `main.py` 重新导出 `app`。
- Existing consumers continue to use `from main import app`.

- [ ] **Step 1: 建立项目内测试解释器**

Run: `cd python-analytics-service && python3.13 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt`

Expected: `.venv/bin/python` reports Python 3.13 and imports FastAPI, pandas and NumPy.

- [ ] **Step 2: 运行现有全量测试建立基线**

Run: `cd python-analytics-service && .venv/bin/python -m unittest discover -s tests -p 'test_*.py'`

Expected: existing API, result semantics and logging tests pass before source movement.

- [ ] **Step 3: 写失败的应用工厂和兼容入口测试**

```python
from fastapi.testclient import TestClient

from app.main import create_app
from main import app


def test_create_app_produces_independent_service_state():
    first = create_app()
    second = create_app()

    assert first is not second
    assert first.state.analytics_service is not second.state.analytics_service


def test_legacy_main_app_still_serves_health_route():
    with TestClient(app) as client:
        assert client.get("/health").json()["status"] == "healthy"
```

- [ ] **Step 4: 运行失败测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_app_factory`

Expected: FAIL because `app.main` does not exist.

- [ ] **Step 5: 最小实现应用工厂和兼容入口**

```python
# app/main.py
def create_app() -> FastAPI:
    app = FastAPI(...)
    configure_application_state(app)
    app.add_middleware(CORSMiddleware, ...)
    app.middleware("http")(attach_request_id)
    app.include_router(health_router)
    app.include_router(analytics_router)
    app.include_router(quality_router)
    app.include_router(pivot_router)
    return app

# main.py
from app.main import create_app

app = create_app()
```

- [ ] **Step 6: 运行新增测试和原有全量测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_app_factory && .venv/bin/python -m unittest discover -s tests -p 'test_*.py'`

Expected: PASS.

### Task 2: 数据契约、运行状态与综合分析服务

**Files:**

- Create: `python-analytics-service/app/schemas/__init__.py`
- Create: `python-analytics-service/app/schemas/requests.py`
- Create: `python-analytics-service/app/schemas/responses.py`
- Create: `python-analytics-service/app/core/__init__.py`
- Create: `python-analytics-service/app/core/state.py`
- Create: `python-analytics-service/app/core/errors.py`
- Create: `python-analytics-service/app/core/middleware.py`
- Create: `python-analytics-service/app/services/__init__.py`
- Create: `python-analytics-service/app/services/analytics_service.py`
- Modify: `python-analytics-service/main.py`
- Modify: `python-analytics-service/tests/test_api_contract.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- `AnalysisRequest`、`HazardData`、`QualityCheckRequest` and `UnifiedDataRequest` move to `app.schemas.requests`; `AnalysisResponse` moves to `app.schemas.responses`.
- `AnalyticsService` exposes `comprehensive_analysis(request)`, `statistics(request)`, `predictions(request)`, `etl(request)`, `risk_assessment(request)`, `metrics()` and `clear_cache()`.
- `configure_application_state(app)` sets `app.state.analytics_service`, `app.state.quality_service` and `app.state.pivot_service`.

- [ ] **Step 1: 写失败测试，确认模型和缓存依赖可从新模块导入**

```python
from app.schemas.requests import AnalysisRequest
from app.services.analytics_service import AnalyticsService


def test_cache_key_changes_when_analysis_type_changes():
    service = AnalyticsService()
    first = AnalysisRequest(hazards=[HAZARD], analysisType="comprehensive")
    second = AnalysisRequest(hazards=[HAZARD], analysisType="statistics")

    assert service.cache_key(first) != service.cache_key(second)
```

- [ ] **Step 2: 运行失败测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_contract.AnalysisContractTests.test_cache_key_changes_when_analysis_type_changes`

Expected: FAIL because the new imports do not exist.

- [ ] **Step 3: 迁移模型、缓存、指标和计算调度**

Move Pydantic classes without changing fields or validators. Move `GLOBAL_CACHE`, `REQUEST_METRICS`, engine instances, cache helpers and `run_*` functions into `AnalyticsService`; retain the existing SHA-256 serialization, TTL eviction and `ThreadPoolExecutor(max_workers=3)`.

- [ ] **Step 4: 添加 request ID 中间件和安全内部错误转换**

```python
async def attach_request_id(request: Request, call_next: RequestResponseEndpoint) -> Response:
    request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-Id"] = request_id
    return response

def raise_analysis_internal_error(request: Request) -> NoReturn:
    raise HTTPException(status_code=500, detail={
        "code": "ANALYSIS_INTERNAL_ERROR",
        "message": "Analysis service failed to process the request.",
        "requestId": request.state.request_id,
    })
```

- [ ] **Step 5: 更新测试 import 和替换点**

Update tests to import schemas from `app.schemas` and patch the service instance on `api.app.state.analytics_service`; preserve assertions for 422 constraints, cache behavior and `asyncio.to_thread` arguments.

- [ ] **Step 6: 运行契约及线程调度测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_contract tests.test_api_routes.AnalysisThreadDispatchHttpRouteTests tests.test_api_routes.AnalysisCacheHttpRouteTests`

Expected: PASS.

### Task 3: 基础和分析路由

**Files:**

- Create: `python-analytics-service/app/routes/__init__.py`
- Create: `python-analytics-service/app/routes/health.py`
- Create: `python-analytics-service/app/routes/analytics.py`
- Create: `python-analytics-service/app/dependencies.py`
- Modify: `python-analytics-service/app/main.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- `get_analytics_service(request: Request) -> AnalyticsService` returns `request.app.state.analytics_service`.
- `health_router` exposes `/`, `/health`, `/metrics`, `/cache/clear`; `analytics_router` exposes the five existing primary analysis paths.

- [ ] **Step 1: 写失败的路由委托测试**

```python
def test_statistics_route_delegates_to_application_service():
    with TestClient(create_app()) as client, patch.object(
        client.app.state.analytics_service,
        "statistics",
        return_value={"summary": "ok"},
    ) as statistics:
        response = client.post("/api/v1/statistics", json={"hazards": [HAZARD]})

    assert response.json() == {"success": True, "data": {"summary": "ok"}}
    statistics.assert_called_once()
```

- [ ] **Step 2: 运行失败测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_routes.AnalysisThreadDispatchHttpRouteTests.test_statistics_dispatches_work_outside_event_loop`

Expected: FAIL because the router and app-state dependency do not exist.

- [ ] **Step 3: 实现 health 与 primary analytics routers**

Each primary endpoint receives `AnalysisRequest`, delegates once to `AnalyticsService` through the dependency, preserves its original response envelope, and converts unexpected analysis exceptions through `raise_analysis_internal_error`. `/metrics` and `/cache/clear` retain `AdminAccess`.

- [ ] **Step 4: 运行 HTTP 路由测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_routes.AnalysisThreadDispatchHttpRouteTests tests.test_api_routes.AnalysisCacheHttpRouteTests tests.test_api_routes.ManagementRouteTests`

Expected: PASS.

### Task 4: 质量与统一模型服务、路由

**Files:**

- Create: `python-analytics-service/app/services/quality_service.py`
- Create: `python-analytics-service/app/routes/quality.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- `QualityService` exposes `assess(request)`, `transform(request)`, `merge(request)`, `thresholds()` and `history(limit)`.
- `quality_router` preserves `/api/v1/quality/*` and `/api/v1/unified-model/*` paths and response envelopes.

- [ ] **Step 1: 写失败的统一模型路由委托测试**

```python
def test_unified_merge_route_uses_application_quality_service():
    app = create_app()
    with TestClient(app) as client, patch.object(
        app.state.quality_service,
        "merge",
        return_value={"total_records": 1},
    ) as merge:
        response = client.post("/api/v1/unified-model/merge", json={"usgs_data": []})

    assert response.status_code == 200
    assert response.json()["data"]["total_records"] == 1
    merge.assert_called_once()
```

- [ ] **Step 2: 运行失败测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_routes.UnifiedModelHttpRouteTests`

Expected: FAIL because `quality_service` has not been attached to application state.

- [ ] **Step 3: 移动质量和统一模型调度**

Move existing DataFrame conversion, `np.nan` replacement, record serialization, source comparison and quality history calls without altering output field names. The router retains the present HTTP exception behavior for this refactor.

- [ ] **Step 4: 运行质量和统一模型测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_api_contract tests.test_api_routes.UnifiedModelHttpRouteTests`

Expected: PASS.

### Task 5: 透视服务、路由和部署收口

**Files:**

- Create: `python-analytics-service/app/services/pivot_service.py`
- Create: `python-analytics-service/app/routes/pivot.py`
- Modify: `python-analytics-service/app/main.py`
- Modify: `python-analytics-service/main.py`
- Modify: `python-analytics-service/start.sh`
- Modify: `scripts/start-python-service.sh`
- Modify: `python-analytics-service/README.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `python-analytics-service/tests/test_api_contract.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- `PivotService` exposes `create(request)`, `query(request)`, `trend_analysis(request)`, `risk_score(request)` and `summary(request)`.
- `pivot_router` preserves all five `/api/v1/pivot/*` paths, parameters, empty-result messages and output field names.

- [ ] **Step 1: 写失败的透视服务状态隔离测试**

```python
def test_pivot_route_uses_service_bound_to_its_application():
    first = create_app()
    second = create_app()

    assert first.state.pivot_service is not second.state.pivot_service
```

- [ ] **Step 2: 运行失败测试**

Run: `cd python-analytics-service && .venv/bin/python -m unittest tests.test_app_factory.test_pivot_route_uses_service_bound_to_its_application`

Expected: FAIL because `pivot_service` has not been configured on `app.state`.

- [ ] **Step 3: 移动透视调度并注册 router**

Move DataFrame construction, time range conversion, analyzer calls, output serialization and `processingTime` calculation to `PivotService`. Route functions only parse `AnalysisRequest`, call one service method, and return the existing data shape.

- [ ] **Step 4: 维持启动兼容性**

Use `uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True, log_level="info")` in the direct entrypoint. Retain `from main import app` in `start.sh`; amend README with the app directory ownership and existing commands.

- [ ] **Step 5: 运行 Python 全量回归**

Run: `cd python-analytics-service && .venv/bin/python -m unittest discover -s tests -p 'test_*.py'`

Expected: PASS with all API contract, route, result semantics, logging and app factory tests.

- [ ] **Step 6: 执行项目完整验证**

Run: `pnpm run lint && pnpm run format:check && pnpm test && pnpm run typecheck:client && pnpm run typecheck:server && pnpm run build && git diff --check`

Expected: all commands exit 0; inspect any existing bundle-size warning separately from failures.

## Plan self-review

- Coverage: app factory、模型、应用状态、基础接口、三组业务路由、部署入口、测试迁移、文档和完整验证均有对应任务。
- No-placeholder scan: 计划中的所有生产改动均指定文件、接口、测试和命令。
- Type consistency: `create_app`、`AnalyticsService`、`QualityService`、`PivotService` 和 `app.state` 的属性名在任务间一致。
