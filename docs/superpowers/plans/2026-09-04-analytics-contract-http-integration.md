# P0 后续阶段：FastAPI HTTP 路由契约测试

## 目标

在第一阶段已经统一前端 `Hazard`、Analytics Service 和 Python Pydantic 请求模型的基础上，补齐真实 FastAPI HTTP 路由层测试。测试通过 ASGI `TestClient` 发送请求，验证路由、请求体校验、状态码、参数传递和响应结构，而不是只直接调用 Python 函数。

## 范围

### 任务 1：HTTP 测试依赖与路由测试

文件范围：

- `python-analytics-service/requirements.txt`
- `python-analytics-service/tests/test_api_routes.py`

要求：

1. 使用 FastAPI `TestClient`，不启动外部 HTTP 服务，不访问真实第三方数据源。
2. 覆盖 `/api/v1/pivot/create`、`query`、`trend-analysis`、`risk-score` 和 `summary` 五个路由的合法请求 2xx 响应。
3. 覆盖无 `hazards`、误用 `data`、非法枚举、非法 `time_range`、非正 `time_window` 和额外字段等请求返回 422。
4. 通过受控的分析器替身验证路由确实把 `time_dim`、`geo_dim`、`aggfunc`、筛选项和 `time_window` 传给分析器；测试不能把断言建立在替身自身行为上。
5. 验证查询参数回显和空结果响应，确保前端能区分“请求合法但暂无结果”和 HTTP 错误。

测试先行：先写测试并运行，确认缺少 HTTP 测试支持或目标行为时失败；再加入最小测试依赖和测试实现，运行 Python 测试集确认通过。

### 任务 2：文档和基线同步

文件范围：

- `python-analytics-service/README.md`
- `README.md`
- `docs/TESTING_BASELINE.md`
- `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

要求：

1. 说明 Python API 契约测试分为模型/端点单元测试和 `TestClient` HTTP 路由测试，并给出可复制的命令。
2. 更新 Python 测试目录结构，加入 `test_api_routes.py`。
3. 测试基线准确区分当前已具备的 Python 契约测试与尚未纳入统一 `pnpm run test:baseline` 的 Python 算法测试、CI 接入和真实外部服务集成测试。
4. 将 P0“统一灾害数据与 Analytics API 契约”更新为第二阶段完成，并保留跨语言共享契约、CI 接入等后续工作。

## 验证

按顺序执行：

```bash
PYTHONDONTWRITEBYTECODE=1 UV_CACHE_DIR=/tmp/prometheus-uv-cache \
uv run --offline --python 3.11 --with-requirements requirements.txt \
python -m unittest discover -s tests -p 'test_*.py'
pnpm run format:check
pnpm run lint
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
pnpm test
git diff --check
```

`pnpm test` 如因沙箱禁止监听本地端口而失败，记录为环境限制后使用已批准的非沙箱执行重跑，不修改业务代码绕过测试。

## 约束

- 本阶段不自动执行 `git add`、`git commit`、push 或创建 PR。
- 不顺带重构 Python 服务目录、不重写分析算法、不把 Python 测试强行并入根目录 pnpm 命令。
- 保留第一阶段已提交的实现，只补测试、测试依赖和对应文档。
