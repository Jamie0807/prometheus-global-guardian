# Python 管理面边界治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 保护 Python Analytics 的指标和缓存管理接口，收紧跨域策略和 Docker 端口暴露，而不改变浏览器的分析 API 契约。

**架构：** `python-analytics-service/security.py` 提供环境变量读取、CORS 来源解析和 FastAPI 管理令牌依赖；`main.py` 只组合依赖与路由。Compose 将公开端口限制为本机回环地址。

**技术栈：** Python 3.13、FastAPI、Pydantic、unittest、Docker Compose。

## 全局约束

- 不更改 `/api/v1/*` 的路径、请求模型或浏览器客户端调用。
- `ANALYTICS_ADMIN_TOKEN` 仅可从服务端环境读取，不能出现在 `VITE_*`、日志或响应中。
- 新行为遵循 TDD：先运行新增失败测试，再编写最小实现。
- 不自动暂存或提交本任务改动。

### Task 1: 定义并测试 Python 管理访问边界

**Files:**

- Create: `python-analytics-service/security.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`

**Interfaces:**

- Produces: `get_cors_origins()` 和 `require_admin_access()`。
- Consumes: `ANALYTICS_CORS_ORIGINS`、`ANALYTICS_ADMIN_TOKEN` 环境变量。

- [x] **Step 1: 写入失败测试**

```python
response = client.get("/metrics")
assert response.status_code == 404

with patch.dict(os.environ, {"ANALYTICS_ADMIN_TOKEN": "test-token"}):
    response = client.post("/cache/clear", headers={"X-Analytics-Admin-Token": "test-token"})
assert response.status_code == 200
```

- [x] **Step 2: 运行失败测试**

Run: `python -m unittest tests.test_api_routes.PythonManagementBoundaryTests -v`

Expected: FAIL，因为当前管理端点无需令牌即可访问。

- [x] **Step 3: 编写最小实现**

```python
def require_admin_access(
    admin_token: Annotated[str | None, Header(alias="X-Analytics-Admin-Token")] = None,
) -> None:
    expected = os.environ.get("ANALYTICS_ADMIN_TOKEN", "")
    if not expected or not admin_token or not secrets.compare_digest(admin_token, expected):
        raise HTTPException(status_code=404, detail="Not Found")
```

- [x] **Step 4: 验证通过**

Run: `python -m unittest tests.test_api_routes.PythonManagementBoundaryTests -v`

Expected: PASS。

### Task 2: 收紧 CORS 与 Compose 暴露面

**Files:**

- Modify: `python-analytics-service/main.py`
- Modify: `python-analytics-service/tests/test_api_routes.py`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Interfaces:**

- Consumes: `get_cors_origins()`。
- Produces: 仅允许显式来源、无 Cookie 的 CORS 响应，以及本机绑定的 Compose 端口。

- [x] **Step 1: 写入失败测试**

```python
response = client.options(
    "/api/v1/quality/thresholds",
    headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
)
assert response.headers.get("access-control-allow-origin") is None
```

- [x] **Step 2: 运行失败测试**

Run: `python -m unittest tests.test_api_routes.PythonManagementBoundaryTests -v`

Expected: FAIL，因为当前 CORS 使用通配方法/请求头并允许凭据。

- [x] **Step 3: 编写最小实现与配置**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Analytics-Admin-Token"],
)
```

将 Compose 端口改为 `127.0.0.1:8001:8001`，并增加环境变量样例。

- [x] **Step 4: 验证通过**

Run: `python -m unittest tests.test_api_routes.PythonManagementBoundaryTests -v && docker compose config`

Expected: PASS，Compose 配置包含回环端口绑定。

### Task 3: 更新文档与整体回归

**Files:**

- Modify: `README.md`
- Modify: `python-analytics-service/README.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

- [x] **Step 1: 更新接口与部署说明**

说明管理令牌、CORS 覆盖配置、回环端口限制和保持公开的 `/health`。

- [x] **Step 2: 运行验证**

Run: `python -m unittest discover -s python-analytics-service/tests -p 'test_*.py'`

Expected: Python 自动化测试全部通过。

- [x] **Step 3: 运行项目基线**

Run: `pnpm run test:baseline && git diff --check`

Expected: 所有根目录验证通过，差异没有空白错误。
