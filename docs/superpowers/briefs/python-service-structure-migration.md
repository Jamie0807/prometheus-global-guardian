# Python 服务结构整理：完整迁移任务

## 目标

将 `python-analytics-service/main.py` 中的 FastAPI 应用装配、HTTP 路由、请求/响应模型和业务调度迁移到 `app/` 包；保持当前 HTTP API、部署入口和计算行为不变。

## 必须完成的结构

```text
python-analytics-service/
  main.py                         # 仅保留 app 兼容导出与直接启动入口
  app/
    __init__.py
    main.py                       # create_app 和路由注册
    dependencies.py               # 从 request.app.state 获取服务
    core/{__init__.py,state.py,errors.py,middleware.py}
    schemas/{__init__.py,requests.py,responses.py}
    services/{__init__.py,analytics_service.py,quality_service.py,pivot_service.py}
    routes/{__init__.py,health.py,analytics.py,quality.py,pivot.py}
```

## 绑定约束

- 保持所有已有 URL、HTTP 方法、请求字段及 Pydantic 约束、成功响应字段、管理接口 404 策略、CORS、缓存 TTL 300 秒和最多 100 项不变。
- `/api/v1/analyze` 维持完整请求语义的 SHA-256 缓存键、缓存指标和三个计算任务的 `ThreadPoolExecutor(max_workers=3)` 并行。
- `/api/v1/statistics`、`/api/v1/predictions`、`/api/v1/etl/process` 和 `/api/v1/risk-assessment` 必须继续通过 `asyncio.to_thread` 调度同步计算。
- `create_app()` 每次调用都创建独立的 `analytics_service`、`quality_service` 和 `pivot_service`，并放到 `app.state`。
- 根 `main.py` 必须继续导出 `app`，使 `python main.py`、`uvicorn main:app`、Docker 和 `start.sh` 可用。
- 路由只做 HTTP 输入输出、依赖取得和异常到 HTTP 响应的转换；不得直接构造引擎、访问缓存、指标或计算算法。服务层不得导入 FastAPI HTTP 类型。
- 不改变 `analytics/` 下算法；不改变质量/统一模型/透视接口当前异常响应语义。
- 保留请求 ID 中间件和分析接口的安全内部错误响应。
- 更新测试以通过 `app.state` 注入或 mock 服务，不再 patch 根 `main.py` 的计算引擎或缓存全局变量。
- 添加可观察的应用工厂隔离测试，至少验证两次 `create_app()` 的服务实例不同，以及根 `main.app` 的 `/health` 可用。
- 不修改与本任务无关的用户既有文档变更；不暂存、不提交、不推送。

## TDD 与验证

1. 先在 `tests/test_app_factory.py` 写应用工厂测试并运行，记录新模块尚不存在的失败输出。
2. 再实施迁移，并运行：

```bash
cd python-analytics-service && .venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v
```

3. 运行 `git diff --check`。

## 参考

- 当前实现：`python-analytics-service/main.py`
- HTTP 契约测试：`python-analytics-service/tests/test_api_contract.py`、`python-analytics-service/tests/test_api_routes.py`
- 设计：`docs/superpowers/specs/2026-09-10-python-service-structure-design.md`
