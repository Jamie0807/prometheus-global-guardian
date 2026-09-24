# 全项目运行单元与共享包架构治理设计

状态：已确认，等待实施。

需求类型：跨模块架构治理与低风险结构迁移。

## 1. 背景与现状

项目已经包含多个运行单元：Vite React 浏览器客户端、Express BFF、FastAPI 分析服务、PostgreSQL、运维脚本和跨语言 JSON 契约。当前根目录仍以一个 Node 包为主要组织方式，`pnpm-workspace.yaml` 尚未声明实际 workspace 包。

当前结构存在三类治理问题：

1. Web 代码位于 `src/`，BFF 由根目录 `server.ts` 和 `server/` 组成，两个运行单元没有统一的 `apps/` 归属。
2. Python 服务已有独立目录，但运行单元登记、基础设施目录和共享契约之间没有统一的结构规则。
3. `shared/` 和 `contracts/` 已经承担共享边界，却没有包级入口、包级类型范围和依赖方向门禁，新增代码容易直接引用内部文件。

本需求采用渐进式治理，不把目录迁移、依赖升级和业务行为改造混在一起。

## 2. 目标

### 2.1 总体目标

- 明确每个可独立启动、构建、测试和部署的运行单元。
- 为跨运行单元复用内容建立稳定的共享包入口。
- 让共享包不依赖具体运行单元，运行单元之间不通过内部文件路径耦合。
- 把目录约定、导入方向和验证命令纳入可执行的质量门禁。
- 以小批次迁移保留现有 Web、BFF、Python、数据库和 API 行为。

### 2.2 第一阶段目标

第一阶段只迁移稳定共享边界：

- 将跨语言 JSON 契约收敛到 `packages/contracts/`。
- 将 TypeScript 灾害领域共享代码收敛到 `packages/hazard-domain/`。
- 为共享包增加唯一入口、包级元数据和类型检查范围。
- 保留 `shared/hazards/` 的兼容 re-export，让现有消费者能够逐步迁移。
- 建立 `apps/`、`services/`、`packages/`、`infra/` 的运行单元登记与目录规则。

## 3. 目标目录结构

```text
prometheus-global-guardian/
├── apps/
│   ├── web/                    # React/Vite 浏览器运行单元，后续迁移
│   └── bff/                    # Express BFF 运行单元，后续迁移
├── services/
│   └── analytics/              # FastAPI 分析运行单元，保留独立进程
├── packages/
│   ├── contracts/              # 跨语言 JSON 契约和版本说明
│   ├── hazard-domain/          # TypeScript 灾害领域共享能力
│   └── tooling/                # 后续共享质量工具配置
├── infra/                      # Docker Compose、容器和环境模板
├── scripts/                    # 开发、测试和运维脚本
├── tests/                      # 跨运行单元测试
├── docs/                       # 架构、运行手册、Spec 和计划
└── prisma/                     # 数据模型与迁移，保持独立边界
```

第一阶段不要求立即创建空的 `apps/web`、`apps/bff` 或 `services/analytics` 兼容目录。它们先作为目标运行单元和迁移登记，实际代码在后续批次按运行单元迁移。

## 4. 运行单元边界

| 运行单元   | 当前入口                                          | 目标归属             | 主要职责                                          | 不负责的内容                        |
| ---------- | ------------------------------------------------- | -------------------- | ------------------------------------------------- | ----------------------------------- |
| Web        | `src/index.tsx`、Vite                             | `apps/web`           | React UI、Mapbox、浏览器状态和用户交互            | 数据库、服务端凭据、Python 内部逻辑 |
| BFF        | `server.ts`                                       | `apps/bff`           | HTTP API、用户会话、上游代理、AI 持久化和静态服务 | React 组件、Python 算法实现         |
| Analytics  | `python-analytics-service/main.py`、`app/main.py` | `services/analytics` | 统计、预测、风险、质量、ETL 和透视接口            | 浏览器会话、PostgreSQL 用户持久化   |
| PostgreSQL | Docker Compose `db` 服务                          | `infra` 运行依赖     | 用户、会话、AI 对话和记忆数据                     | 业务 API 路由                       |
| 运维工具   | `scripts/`                                        | `scripts`            | 备份、恢复演练、测试辅助和版本封装                | 业务运行时状态                      |

运行单元之间使用明确协议通信：浏览器通过 BFF HTTP API，BFF 通过受保护的 Analytics HTTP API，Python 与 TypeScript 通过 JSON 契约文件保持跨语言一致。运行单元不得通过相对路径导入另一个运行单元的内部实现。

## 5. 共享包设计

### 5.1 `packages/hazard-domain`

该包只提供不依赖运行时的灾害领域能力：

- `HazardEvent`
- `HazardSourceId`
- `HazardLayerId`
- `createHazardEventId`
- `resolveHazardLayerId`
- `HAZARD_LAYER_REGISTRY`

该包不得依赖 React、Express、FastAPI、HTTP 客户端、环境变量、数据库、Mapbox 或页面组件。包入口只暴露稳定 API，消费者不得导入 `src/` 下的内部文件。

第一阶段将现有 `shared/hazards/` 实现迁移到该包，并保留同名兼容 re-export。新代码优先使用包入口，旧相对路径在后续消费者迁移完成后删除。

### 5.2 `packages/contracts`

该包只保存跨语言 JSON 契约及版本说明，包括灾害事件、Analytics 请求/响应和错误信封。JSON 内容、字段含义和版本兼容规则不在本阶段改变。

- Python 测试和服务通过明确的契约路径读取 JSON。
- TypeScript 测试通过包入口或包内 fixture 读取 JSON。
- 契约包不导出与 TypeScript 实现绑定的运行时代码。
- 任何契约字段变更必须同步更新对应 Spec、Python 校验、TypeScript 解析和契约测试。

### 5.3 暂不迁移的共享代码

`shared/logging.ts` 暂不迁移。它同时服务浏览器和 Node，包含不同运行时的日志行为；在没有明确的运行时适配接口前，不把它与灾害领域包混合。后续如需共享日志，将另行设计浏览器/Node 适配边界。

## 6. 依赖方向规则

```text
apps/web ───────┐
apps/bff ───────┼──> packages/hazard-domain
                │
tests ──────────┼──> packages/hazard-domain
                └──> packages/contracts

services/analytics ──> packages/contracts（仅读取 JSON）
packages/hazard-domain ──> 无业务运行单元依赖
packages/contracts ─────> 无代码依赖
```

必须满足以下规则：

1. `packages/*` 不得导入 `apps/*`、`services/*`、页面组件、数据库或运行时配置。
2. `apps/web` 不得导入 `apps/bff` 或 `services/analytics` 的内部文件。
3. `apps/bff` 不得导入 Python 源码或浏览器组件。
4. Analytics 只通过 HTTP 请求和 JSON 契约与 TypeScript 系统交互，不生成对 TypeScript 源码的依赖。
5. 生产代码只能从包公共入口导入共享能力，不得引用包内部文件路径。
6. 测试可以读取 fixture 和跨边界验证，但测试辅助模块不得被生产包反向依赖。

## 7. 第一阶段迁移顺序

### 7.1 包骨架

- 让 `pnpm-workspace.yaml` 匹配 `packages/*`。
- 创建两个包的 `package.json`、公共入口和包级类型检查范围。
- 保持根目录 package 继续作为初始构建编排入口，不立即改变所有脚本。

### 7.2 契约迁移

- 将根目录 `contracts/*.json` 移到 `packages/contracts/`。
- 更新 Python 测试、TypeScript 测试、README 和 `format:check` 文件清单。
- 用路径断言确认旧契约目录不再产生新的生产引用。

### 7.3 灾害领域迁移

- 将 `shared/hazards/` 的实现移动到 `packages/hazard-domain/src/`。
- 增加稳定入口文件和包级导出。
- 将旧路径改为兼容 re-export。
- 分批更新 BFF、前端 Service、Worker 和测试中的新导入。

### 7.4 架构门禁

增加轻量 `scripts/check-architecture.mjs`，使用仓库现有 Node 工具检查：

- 包入口文件存在且导出路径稳定。
- `packages/*` 不出现指向运行单元的导入。
- 生产代码不出现共享包内部路径导入。
- 契约文件位于统一目录，格式检查覆盖新路径。

该脚本纳入本地质量命令和 CI；不在第一阶段引入大型依赖分析工具。

## 8. 验证与验收

第一阶段必须通过：

```bash
pnpm run lint
pnpm run format:check
pnpm test
pnpm run test:python
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run build
git diff --check
```

同时增加共享边界测试，至少覆盖：

- 灾害事件 ID 和图层注册表从新包入口导出。
- 旧 `shared/hazards/` 路径的兼容导出与新包结果一致。
- TypeScript 和 Python 从新契约路径读取相同 JSON 内容。
- 架构门禁能拒绝包到运行单元的反向导入和生产代码的内部路径导入。
- Web、BFF、Analytics 的公开启动方式、API 路径、Docker 服务名和数据库迁移行为保持不变。

验收不以“目录已经移动”作为唯一标准；必须同时证明构建、类型检查、Node/Python 测试和契约语义没有回归。

## 9. 回滚与后续阶段

第一阶段不改数据库 Schema、API 响应、Docker 服务协议、认证策略或 Python 算法。每个迁移步骤使用独立提交，出现包解析或构建问题时可以回退到兼容 re-export 仍存在的状态。

第二阶段再迁移运行单元：

1. 将 React/Vite 归入 `apps/web`，保留根目录开发入口作为过渡。
2. 将 Express BFF 归入 `apps/bff`，拆分入口、路由和服务的构建配置。
3. 将 `python-analytics-service` 归入 `services/analytics`，保留 Docker 上下文和启动命令兼容。
4. 评估 `shared/logging.ts` 是否值得拆成浏览器/Node 两个适配包。
5. 共享配置稳定后，再考虑 `packages/tooling` 和更严格的依赖图检查。

只有第二阶段所有消费者迁移完成，并且新旧入口均通过完整质量门禁后，才删除兼容目录和旧相对路径。

## 10. 非目标

本 Spec 不包含以下内容：

- 一次性迁移全部业务代码。
- 改写 Python 算法或 FastAPI API。
- 引入 Turborepo、Nx 或其他大型构建编排器。
- 生成跨语言客户端代码替代现有 JSON 契约。
- 依赖升级、数据库迁移、认证策略调整或 UI 行为修改。

## 11. 完成定义

第一阶段完成必须同时满足：

1. workspace 能识别两个共享包。
2. 契约文件只有一个规范目录，TypeScript 和 Python 测试都使用该目录。
3. 灾害领域共享代码有唯一公共入口，旧入口只承担兼容转导出。
4. 架构门禁能阻止新增越界依赖。
5. 现有 Node、Python、组件和构建质量门禁通过。
6. 文档、目录约定和后续迁移边界与实际代码一致。
