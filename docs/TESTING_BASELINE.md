# 测试基线

## 目的

本文档记录项目当前可重复执行的自动化测试入口、测试边界和基线数量，供本地开发及现有 CI 质量工作流参考；它不代表已经覆盖所有生产风险。

## 命令分层

| 命令                      | 类型             | 当前职责                                                                     |
| ------------------------- | ---------------- | ---------------------------------------------------------------------------- |
| `pnpm test`               | 单元测试别名     | 等价于 `pnpm run test:unit`                                                  |
| `pnpm run test:unit`      | 单元测试         | 串行执行 BFF Node 原生测试和前端 Service Vitest 测试                         |
| `pnpm run test:bff`       | BFF 单元测试     | 编译服务端测试产物，再运行 Node 原生测试                                     |
| `pnpm run test:services`  | Service 单元测试 | 运行 `tests/service-*.test.ts` 的 Vitest 测试                                |
| `pnpm run test:component` | React 组件测试   | 使用 Vitest、React Testing Library 和 jsdom 测试用户可观察的组件行为         |
| `pnpm run test:e2e`       | 浏览器冒烟测试   | 构建并启动本地生产服务，用 Playwright 验证 `tests/e2e` 中的关键流程          |
| `pnpm run test:python`    | Python API 测试  | 运行分析服务 `tests/test_*.py` 的 unittest 测试集                            |
| `pnpm run test:baseline`  | 完整 Node 基线   | 依次执行 lint、格式、客户端/服务端/契约类型检查、unit、component、E2E 和构建 |

`test:baseline` 是完整 Node 质量基线，包含 `typecheck:contracts`，但不包含 Python 测试。`test:python` 由 CI 的独立 Python job 在安装依赖后的 Python 3.13 环境执行。任一命令失败都会终止后续基线步骤。项目命令通过 `scripts/with-node-version.sh` 使用 `.nvmrc` 中的 Node.js 版本。

## 当前数量

本次在当前工作区重跑了独立 Node 与 Python 测试入口。下表的“本次结果”只记录实际工具输出；Node 数量只指 `test:baseline` 覆盖的 BFF、Service、组件和 E2E 测试，不计独立 Python job。

| 范围             | 已配置的测试文件或用例 | 本次结果     |
| ---------------- | ---------------------- | ------------ |
| BFF 单元测试     | 6 个 Node 原生测试文件 | 84/84 通过   |
| Service 单元测试 | 17 个 Vitest 文件      | 194/194 通过 |
| React 组件测试   | 16 个 Vitest 文件      | 81/81 通过   |
| Playwright E2E   | 1 个 `*.spec.ts` 文件  | 1/1 通过     |
| Python unittest  | 7 个 `test_*.py` 模块  | 49/49 通过   |

本轮 Node、Python、浏览器和构建验证均完成；Node 24.16.0 会根据项目声明输出 engine warning，功能验证结果不受影响。

## 测试边界

单元测试验证 BFF provider、AI 路由和流式转换、DisasterAware 代理边界，以及前端 HTTP、灾害数据适配、地图 GeoJSON/LOD、灾害强度字段读取、Analytics 结果展示适配和 AI Service。BFF 边界覆盖路由白名单、编码路径绕过、请求体、query、请求头、限流、超时、token 缓存和错误脱敏。组件测试验证状态面板、统计概览折线图、数据质量面板和 Mapbox/Worker mock 下的地图热力图切换。E2E 验证生产构建首页加载、灾害类型筛选、AI 助手打开和 mock 流式消息展示。

E2E 通过 Playwright route mock 隔离 DisasterAware、公开灾害源、Mapbox 和 AI provider，不访问真实第三方服务，也不要求本地配置真实账号或模型 Key。失败时保留截图，重试时保留 trace。

Python unittest 覆盖应用工厂、跨语言灾害请求契约、Pydantic/API 契约、FastAPI 路由，以及预测、风险和质量结果语义；不需要启动服务，也不访问真实外部数据。`test_pivot_table.py` 是打印式透视与算法冒烟脚本，`test_service.py` 是依赖已启动服务的手工集成脚本；两者不是自动化测试套件。

当前尚未纳入完整 Node 基线的范围包括 Python 核心算法测试、桌面与移动端视觉回归、所有弹窗和路由流程，以及真实外部服务集成测试。质量工作流在各自的触发条件下分别运行 `pnpm run test:baseline` 与 `pnpm run test:python`；这描述工作流配置，不表示分支保护已将它们设为 required checks。

## 本次环境限制

本轮未发现阻断测试的环境限制；浏览器测试能够启动生产服务并通过关键流程。

## 已知非阻塞提示

- 若当前终端不是 Node.js 20.19.x，pnpm 可能先输出 engine warning；项目脚本会通过 nvm 自动切换到 `.nvmrc` 版本。
- Vite 构建会提示 Mapbox vendor chunk 较大，这是包体积治理待办，不影响当前测试通过。
- 依赖安装可能提示弃用包或被 pnpm 忽略的构建脚本；应在依赖治理任务中单独处理。

## 建议执行顺序

日常修改可先运行对应层级的测试。提交前在具备匹配 Node、pnpm 和浏览器依赖的环境运行：

```bash
pnpm run test:baseline
pnpm run test:python
```

GitHub Actions 的 `frontend-bff` job 使用 Node 20.19.0、pnpm 10.15.1 并安装 Chromium 后执行前一条命令；独立 `python` job 使用 Python 3.13、安装 `python-analytics-service/requirements.txt` 后执行后一条命令。

提交代码仍需遵循项目约束：不自动提交；只有用户明确要求提交时，才使用 `pnpm commit` 并通过 commitlint 校验提交信息。
