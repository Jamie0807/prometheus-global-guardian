# 测试基线

最近核对日期：2026-09-27。本文件只记录可执行测试入口、测试责任、已核验的证据和环境限制；它不把历史数量当作永久不变的质量指标，也不替代 `README.md` 中的启动说明。

## 1. 命令入口

| 命令                          | 类型             | 职责                                                                                                    |
| ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm test`                   | 单元测试别名     | 等价于 `pnpm run test:unit`。                                                                           |
| `pnpm run test:bff`           | BFF 单元测试     | 编译服务端测试产物，运行 BFF Node 原生测试。                                                            |
| `pnpm run test:services`      | Service 单元测试 | 运行 Web、BFF 和集成目录中的 Vitest 测试。                                                              |
| `pnpm run test:component`     | React 组件测试   | 使用 Vitest、React Testing Library 和 jsdom 验证用户可观察行为。                                        |
| `pnpm run test:e2e`           | 浏览器冒烟测试   | 构建并启动本地生产服务，用 Playwright 验证 `apps/web/tests/e2e` 的关键流程。                            |
| `pnpm run test:python`        | Python 测试      | 运行 Analytics 服务的 `unittest` 测试集。                                                               |
| `pnpm run check:architecture` | 架构检查         | 检查运行单元入口、共享包元数据、目录归属和依赖方向。                                                    |
| `pnpm run check:docker`       | Docker 配置检查  | 校验本地完整栈和隔离测试数据库 Compose 配置，不启动服务。                                               |
| `pnpm run test:baseline`      | 完整 Node 基线   | 依次执行 lint、格式、三项 TypeScript 类型检查、架构检查、Docker 配置检查、unit、component、E2E 和构建。 |

`test:baseline` 不包含 Python 测试。CI 的 `frontend-bff` job 使用 Node 20.19.0、pnpm 10.15.1 和 Chromium 执行 Node 基线；独立 `python` job 使用 Python 3.13 安装 `services/analytics/requirements.txt` 后执行 `test:python`。项目脚本通过 `tooling/node/with-node-version.sh` 使用 `.nvmrc` 版本。

## 2. 测试责任与文件位置

| 边界                    | 位置                                                         | 主要覆盖                                                             |
| ----------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Web Service、组件和 E2E | `apps/web/tests/`                                            | HTTP、parser、灾害适配、AI Service、组件状态和关键浏览器流程。       |
| BFF Node 与 Vitest      | `apps/bff/tests/`                                            | Provider 配置、AI 路由、SSE 转换、持久化、认证、代理和请求安全边界。 |
| 跨运行单元契约          | `tests/integration/`、`packages/contracts/tests/type-tests/` | TypeScript/Python 共享输入、响应信封和类型正反例。                   |
| Python API 与算法       | `services/analytics/tests/`                                  | 应用工厂、Pydantic、FastAPI 路由、服务编排、预测、风险和质量语义。   |
| 持久化运维              | `infra/persistence/tests/`                                   | migration、检查、备份、恢复演练和保留清理。                          |

测试按边界保护行为，不以 E2E 替代单元和契约测试。修改 Workflow AI 请求时，至少覆盖：实时上下文可用、显式空快照、实时上下文缺失、RAG-only 问题不依赖实时上下文四类语义。

## 3. 最近验证证据

### 3.1 2026-09-27：Workflow 上下文契约

针对 `apps/bff/ai/ai-provider.ts` 执行：

```bash
pnpm run build:server:test
./tooling/node/with-node-version.sh node --test dist-server/apps/bff/tests/ai-provider.test.js
```

结果为 23/23 通过。覆盖内容包括：

- `hazard_context_available` 区分实时上下文缺失和实时快照为空；
- 缺失时发送 `hazard_context: null`，并向 Workflow 输入附加不可用状态标记；
- 可用时 `byType` 作为全量统计来源，`recent` 仅作为有限代表样本；
- 实时上下文安全清洗，不转发原始 URL、坐标和未允许字段；
- 本地 Workflow 调用和浏览器手工测试验证：上下文关闭时返回“无法判断”，没有把空值解释为“当前没有灾害”。

这组验证不覆盖外部 ai-workflow 的文档上传、索引质量、检索召回、RAG 提示词和模型服务可用性；这些属于外部 Workflow 的运行边界。

### 3.2 2026-09-25：架构治理验证

`check:architecture`、`check:docker`、lint、格式检查、客户端/服务端/契约类型检查、组件测试、构建和 `git diff --check` 均退出 0。Service 测试在测试占位 `DATABASE_URL` 下为 323/323，组件测试为 108/108。该记录是当日证据，不替代下一次完整基线。

### 3.3 历史完整基线

以下结果来自 2026-09-21 账号与 AI 持久化分支的历史基线，仅用于追溯，不作为当前数量承诺：

| 范围             | 测试文件或用例         | 历史结果     |
| ---------------- | ---------------------- | ------------ |
| BFF 单元测试     | 7 个 Node 原生测试文件 | 95/95 通过   |
| Service 单元测试 | 20 个 Vitest 文件      | 245/245 通过 |
| React 组件测试   | 19 个 Vitest 文件      | 108/108 通过 |
| Playwright E2E   | 1 个 `*.spec.ts` 文件  | 1/1 通过     |
| Python unittest  | 7 个 `test_*.py` 模块  | 57/57 通过   |

## 4. 测试边界

自动化测试覆盖 BFF Provider、AI 路由和流式转换、DisasterAware 代理边界、前端 HTTP、灾害数据适配、地图 GeoJSON/LOD、Analytics 结果适配、AI Service、FastAPI 路由和分析结果语义。E2E 使用 Playwright route mock 隔离认证会话、DisasterAware、公开灾害源、Mapbox、Analytics 和 AI Provider，不访问真实第三方服务，也不要求真实账号或模型 Key。

当前不完整覆盖：

- 外部 ai-workflow 的真实文档上传、向量索引和召回质量；
- 真实第三方数据源和真实模型 Provider 的集成稳定性；
- 基于截图差异的桌面/移动端视觉回归；
- 所有弹窗、路由和辅助功能路径；
- Python 核心算法的生产样本校准；
- 公网部署、跨实例 SSE 恢复、集中观测和部署回滚。

持久化运维测试必须使用 `Docker/compose/docker-compose.yml` 与 `Docker/compose/docker-compose.test.yml` 的独立 Compose 项目、测试专用 `DATABASE_URL`、独立卷和 `127.0.0.1:55439`，不能接触开发或生产数据库。

## 5. 环境限制与失败解释

- BFF 集成测试需要 PostgreSQL、有效 migration 和正常网络命名空间；受限沙箱中可能出现 `listen EPERM`，不能据此判断代码失败。
- 历史本机验证曾出现 Node 原生 `argon2` 的 `SIGSEGV`、Vitest `ERR_IPC_CHANNEL_CLOSED` 和 Playwright `node:sqlite` 环境错误；这些记录应与代码断言分开处理，完整基线应在 CI 或匹配运行时重跑。
- 当前 pnpm 进程若使用 Node 24.16.0 会输出 engine warning；项目要求 `>=20.19 <21`，应优先使用 `.nvmrc` 或 Docker/CI 运行时。
- Python 测试需要 Python 3.13 和 `services/analytics/requirements.txt`；主机缺少依赖时使用 CI 或临时 Python 3.13 容器。

## 6. 推荐执行顺序

日常修改先执行对应边界的定向测试；提交前在匹配运行时执行：

```bash
pnpm run test:baseline
pnpm run test:python
```

纯 Markdown 或说明文档调整至少执行：

```bash
pnpm run format:check
git diff --check
```

命令受环境阻断时，记录实际命令、完整错误、根因和替代验证，不把未执行的测试描述为通过。
