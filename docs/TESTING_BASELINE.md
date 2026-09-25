# 测试基线

## 目的

本文档记录项目当前可重复执行的自动化测试入口、测试边界和最近一次基线数量，供本地开发及现有 CI 质量工作流参考；它不代表已经覆盖所有生产风险。

## 命令分层

| 命令                          | 类型             | 当前职责                                                                               |
| ----------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `pnpm test`                   | 单元测试别名     | 等价于 `pnpm run test:unit`                                                            |
| `pnpm run test:unit`          | 单元测试         | 串行执行 BFF Node 原生测试和前端 Service Vitest 测试                                   |
| `pnpm run test:bff`           | BFF 单元测试     | 编译服务端测试产物，再运行 Node 原生测试                                               |
| `pnpm run test:services`      | Service 单元测试 | 运行 Web、BFF 与集成目录中的 Vitest 测试                                               |
| `pnpm run test:component`     | React 组件测试   | 使用 Vitest、React Testing Library 和 jsdom 测试用户可观察的组件行为                   |
| `pnpm run test:e2e`           | 浏览器冒烟测试   | 构建并启动本地生产服务，用 Playwright 验证 `apps/web/tests/e2e` 中的关键流程           |
| `pnpm run test:python`        | Python API 测试  | 运行分析服务 `tests/test_*.py` 的 unittest 测试集                                      |
| `pnpm run check:architecture` | 架构边界检查     | 检查共享包元数据、根目录契约残留和包与运行单元的相对导入方向                           |
| `pnpm run check:docker`       | Docker 配置检查  | 校验本地完整栈 Compose 与隔离测试数据库覆盖配置，不启动服务                            |
| `pnpm run test:baseline`      | 完整 Node 基线   | 依次执行 lint、格式、客户端/服务端/契约类型检查、架构检查、unit、component、E2E 和构建 |

`test:baseline` 是完整 Node 质量基线，包含 `typecheck:contracts`、`check:architecture` 和 `check:docker`，但不包含 Python 测试。`check:architecture` 检查 Web、BFF、Analytics 三个运行单元入口、旧目录残留、依赖方向、共享包反向导入运行单元及生产代码对共享包内部模块的引用，同时检查 Docker 编排文件的归属入口。Web 与 BFF 通过 `@pgg/hazard-domain` 公共入口使用共享领域包。Web 入口为 `apps/web/index.html`，BFF 入口为 `apps/bff/index.ts`，Analytics 入口为 `services/analytics/main.py`；Vite 产物位于根 `dist/`，BFF 编译入口为 `dist-server/apps/bff/index.js`。BFF 认证、对话持久化和迁移用例需要 PostgreSQL，运行前需设置测试专用 `DATABASE_URL` 并应用 `pnpm run db:migrate:deploy`；不要把开发或生产数据用于测试。GitHub Actions 启动一次性 PostgreSQL 服务，显式运行架构检查并应用仓库迁移。`test:python` 由 CI 的独立 Python job 在安装依赖后的 Python 3.13 环境执行。任一命令失败都会终止后续基线步骤。项目命令通过 `tooling/node/with-node-version.sh` 使用 `.nvmrc` 中的 Node.js 版本。

测试文件按边界归档：Web Service、组件和端到端测试位于 `apps/web/tests/`，BFF Node 与 Vitest 测试位于 `apps/bff/tests/`，契约类型测试位于 `packages/contracts/tests/type-tests/`，跨运行单元检查位于 `tests/integration/`，持久化运维测试位于 `infra/persistence/tests/`。

持久化运维命令不包含在 `test:baseline` 中。`pnpm db:check` 检查当前 Compose 数据库与 Prisma migration status；`pnpm db:backup` 生成 dump 和 SHA-256 manifest；`pnpm db:restore:verify` 在临时 PostgreSQL 容器及独立卷中校验并演练恢复；`pnpm db:backup:prune` 清理超过 7 个本地自然日窗口的匹配工件；`pnpm db:migrate:deploy` 手动应用前向 migration。命令顺序、数据保护和失败处理见 `docs/OPERATIONS_PERSISTENCE.md`。

## 当前数量

以下表格保留 2026-09-21 账号与 AI 持久化分支的完整历史基线。Node 数量只指 `test:baseline` 覆盖的 BFF、Service、组件和 E2E 测试，不计独立 Python job。

| 范围             | 已配置的测试文件或用例 | 本次结果     |
| ---------------- | ---------------------- | ------------ |
| BFF 单元测试     | 7 个 Node 原生测试文件 | 95/95 通过   |
| Service 单元测试 | 20 个 Vitest 文件      | 245/245 通过 |
| React 组件测试   | 19 个 Vitest 文件      | 108/108 通过 |
| Playwright E2E   | 1 个 `*.spec.ts` 文件  | 1/1 通过     |
| Python unittest  | 7 个 `test_*.py` 模块  | 57/57 通过   |

`pnpm run test:baseline` 的 lint、格式、客户端/服务端/契约类型检查及生产构建均通过。FastAPI 服务路由已要求 BFF 服务令牌，API 测试使用测试专用 token，同时断言缺失或错误 token 返回 404。AI 持久化集成测试使用独立 Compose PostgreSQL；第二次 `db:migrate:deploy` 输出 `No pending migrations to apply.`

2026-09-20 Orbital 地图升级的历史基线为：BFF 92/92、Service 245/245、组件 105/105、E2E 1/1、Python 56/56。

## 2026-09-25 运行单元架构治理验证

`pnpm run check:architecture`、`pnpm run check:docker`、`pnpm run lint`、`pnpm run format:check`、客户端/服务端/契约类型检查、`pnpm run test:component`、`pnpm run build` 和 `git diff --check` 均退出 0。架构检查包含在 `test:baseline` 中，也由 CI 的 Node job 显式运行。Service 测试在设置测试占位 `DATABASE_URL` 后为 23 个文件、323/323 通过；组件为 19 个文件、108/108 通过。Python 迁移后应使用 `pnpm run test:python` 验证，当前测试命令保持相同语义。占位 `DATABASE_URL` 只用于不连接数据库的检查，不能替代 PostgreSQL 集成测试所需的隔离测试库和 migration。

本机 `pnpm test` 在 38 项 BFF 测试通过后，三个需要认证/持久化的测试文件以 `SIGSEGV` 退出；单独调用项目 Node 20 下的 `argon2.hash()` 也会触发相同段错误，说明该结果受本机原生依赖环境阻断。Service 默认并行池在本机另出现 `ERR_IPC_CHANNEL_CLOSED`，故上述全量 Service 结果使用单 worker。`pnpm run test:e2e` 已尝试，但 Playwright 的 WebServer 在项目 Node 20 中调用本机全局 pnpm 时遇到 `ERR_UNKNOWN_BUILTIN_MODULE: node:sqlite`，服务未启动。这一轮不能据此声称 BFF 集成测试或 E2E 已通过；完整 Node 基线仍需在匹配运行时和隔离 PostgreSQL 的环境中执行。

## 测试边界

单元测试验证 BFF provider、AI 路由和流式转换、DisasterAware 代理边界，以及前端 HTTP、灾害数据适配、地图 GeoJSON/LOD、灾害强度字段读取、Analytics 结果展示适配和 AI Service。BFF 边界覆盖路由白名单、编码路径绕过、请求体、query、请求头、限流、超时、token 缓存和错误脱敏。组件测试覆盖状态面板与图例折叠、默认 2D/3D 切换、DEM 生命周期及失败降级、外部 Tiles 回退、地图标签和 Mapbox/Worker mock 下的热力图切换。E2E 验证生产构建首页、灾害筛选、AI 助手、2D/3D 控件状态，以及桌面和 390px 窄屏的浮层视口与重叠边界。

E2E 通过 Playwright route mock 隔离认证会话、DisasterAware、分析端点、公开灾害源、Mapbox 和 AI provider，检查已登录导航及 AI 会话请求，不访问真实第三方服务，也不要求本地配置真实账号或模型 Key。失败时保留截图，重试时保留 trace。

本地可使用 `docker-compose.test.yml` 启动独立测试数据库，避免触碰开发 Compose 项目的数据卷。测试结束后可用同一组 Compose 文件执行 `down -v` 删除该临时数据库。

持久化运维的真实 Docker 验证应使用 `docker-compose.yml` 与 `docker-compose.test.yml` 叠加、独立 Compose 项目名、测试专用 `DATABASE_URL` 和 `127.0.0.1:55439` 端口，从空测试卷依次执行 migration、`db:check`、`db:backup`、`db:restore:verify` 与 `db:backup:prune`。验收时确认 dump 非空且校验通过、过期工件被清理而窗口内工件保留、恢复演练只使用临时容器与卷、正式数据库卷和数据未被修改。`down -v` 只可用于已确认的隔离测试项目，不适用于正式 Compose 项目。

2026-09-24 已在独立 `pgg-persistence-test` Compose 项目中完成真实 Docker 验证：准备 `web` 镜像后，从空测试卷依次执行 migration、`db:check`、`db:backup`、`db:restore:verify` 和 `db:backup:prune`，全部退出 0；恢复演练的关键表与 Prisma migration status 检查通过，临时容器、卷和测试网络已清理。该证据只覆盖本地隔离流程，不代表公网生产备份或正式数据库恢复已验收。

Python unittest 覆盖应用工厂、跨语言灾害请求契约、Pydantic/API 契约、FastAPI 路由，以及预测、风险和质量结果语义；不需要启动服务，也不访问真实外部数据。TypeScript 与 Python 测试共同读取 `packages/contracts/` 中语言无关的 JSON 契约样本。`test_pivot_table.py` 是打印式透视与算法冒烟脚本，`test_service.py` 是依赖已启动服务的手工集成脚本；两者不是自动化测试套件。

当前尚未纳入完整 Node 基线的范围包括 Python 核心算法测试、基于截图差异的桌面与移动端视觉回归、所有弹窗和路由流程，以及真实外部服务集成测试。质量工作流在各自的触发条件下分别运行 `pnpm run test:baseline` 与 `pnpm run test:python`；这描述工作流配置，不表示分支保护已将它们设为 required checks。

## 本次环境限制

主机 Python 为 3.9，缺少项目依赖，不能直接运行面向 Python 3.13 的依赖集。Python CI 测试已在临时 Python 3.13 容器中安装 `services/analytics/requirements.txt` 并完成 57/57 测试；容器不保存进仓库的虚拟环境或依赖变更。前端/BFF 浏览器测试使用本地隔离 PostgreSQL 并通过关键流程。

## 已知非阻塞提示

- 当前 pnpm 启动进程为 Node 24.16.0 时会先输出 engine warning；项目脚本会通过 nvm 自动切换到 `.nvmrc` 指定的 Node 20.19.x。
- lint 对 Prisma 生成文件报告 7 条 unused-disable warning；这些文件由生成命令产出。
- Vite 构建会提示 Mapbox vendor chunk 较大，这是包体积治理待办，不影响当前测试通过。
- 依赖安装可能提示弃用包或被 pnpm 忽略的构建脚本；应在依赖治理任务中单独处理。

## 建议执行顺序

日常修改可先运行对应层级的测试。提交前在具备匹配 Node、pnpm 和浏览器依赖的环境运行：

```bash
pnpm run test:baseline
pnpm run test:python
```

GitHub Actions 的 `frontend-bff` job 使用 Node 20.19.0、pnpm 10.15.1 并安装 Chromium 后执行前一条命令；独立 `python` job 使用 Python 3.13、安装 `services/analytics/requirements.txt` 后执行后一条命令。

提交代码仍需遵循项目约束：不自动提交；只有用户明确要求提交时，才使用 `pnpm commit` 并通过 commitlint 校验提交信息。
