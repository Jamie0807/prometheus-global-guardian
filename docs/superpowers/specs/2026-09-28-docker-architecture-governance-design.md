# Docker 架构治理设计

## 1. 目标

将当前项目的 Docker 构建文件、Compose 编排、Docker 使用说明和架构门禁统一收口到 `Docker/` 目录，同时保持仓库根目录作为 Docker build context，避免改变现有 `COPY` 路径和运行单元边界。

治理完成后，项目应能明确区分：

- `Docker/build/`：应用镜像构建文件；
- `Docker/compose/`：本地完整栈和隔离测试数据库编排；
- `Docker/README.md`：Docker 启动、迁移、配置和数据保护说明；
- 根 `.dockerignore`：统一 build context 的忽略规则。

## 2. 当前问题

当前 Docker 文件分布在根目录和 `services/analytics/`：

```text
Dockerfile
docker-compose.yml
docker-compose.test.yml
services/analytics/Dockerfile
```

这种布局使镜像构建入口、Compose 入口和服务源码边界混在不同目录中；架构检查、持久化运维脚本、测试和文档也直接依赖这些旧路径。

## 3. 方案与边界

采用集中式 Docker 目录，但保留仓库根目录为构建上下文：

```text
Docker/
├── README.md
├── build/
│   ├── web-bff.Dockerfile
│   └── analytics.Dockerfile
└── compose/
    ├── docker-compose.yml
    └── docker-compose.test.yml
```

### 3.1 镜像构建

- `Docker/build/web-bff.Dockerfile` 负责 React 静态资源和 Express BFF 的完整运行镜像；
- `Docker/build/analytics.Dockerfile` 负责 FastAPI Analytics 镜像；
- 两个镜像都使用仓库根目录作为 build context，Dockerfile 通过根路径复制 `apps/`、`packages/`、`prisma/` 和 `services/analytics/`；
- 保持现有 Node `20.19`、Python `3.13` 和 pnpm 锁文件约束，不使用未锁定的 `latest` 基础镜像；
- 根 `.dockerignore` 继续服务于两个构建 context，不在 `Docker/` 内复制第二份忽略规则。

### 3.2 Compose 编排

- `Docker/compose/docker-compose.yml` 是本地完整栈入口，定义 Web/BFF、PostgreSQL 和 Analytics；
- `Docker/compose/docker-compose.test.yml` 只覆盖隔离测试数据库的环境、端口和数据卷；
- Compose 的 build context 固定为仓库根目录，`dockerfile` 路径使用 `Docker/build/...`；
- 测试和持久化运维必须显式使用新的 Compose 路径，不能依赖根目录自动发现旧文件；
- 数据库 migration 仍由命令显式执行，容器启动不自动迁移；
- 密钥继续通过环境变量注入，不进入 Dockerfile、镜像层或前端构建产物。

### 3.3 治理与兼容性

- 架构门禁要求新 Docker 目录入口存在，并拒绝根目录旧 Dockerfile、旧 Compose 文件和 `services/analytics/Dockerfile` 回流；
- `check:docker` 使用绝对解析后的仓库路径执行两个 Compose 配置校验，不启动容器、不访问数据卷；
- 持久化运维脚本默认指向 `Docker/compose/docker-compose.yml`，但保留 `COMPOSE_FILE` 环境变量覆盖能力；
- README、项目规格、测试基线、持久化运维手册和优化清单统一使用新路径；
- 不在本次治理中添加云平台部署、镜像发布、CI 自动部署或公网生产配置。

## 4. 验收标准

1. 新 Docker 目录结构存在，旧 Docker 文件路径不存在。
2. `docker compose -f Docker/compose/docker-compose.yml config --quiet` 通过。
3. `docker compose -f Docker/compose/docker-compose.yml -f Docker/compose/docker-compose.test.yml config --quiet` 通过。
4. `pnpm run check:architecture` 能检测新路径和旧路径回流。
5. 持久化命令在未设置 `COMPOSE_FILE` 时使用新完整栈 Compose，设置 `COMPOSE_FILE` 时仍由 Docker Compose 解析覆盖文件。
6. 相关单元/集成测试、格式检查和 `git diff --check` 通过。
7. 文档不再把根目录旧路径描述为当前 Docker 入口。

## 5. 非目标

- 不改变 Web、BFF、FastAPI、PostgreSQL 的业务职责；
- 不改变 Compose 服务名、容器端口、测试数据库端口和卷隔离语义；
- 不把 PostgreSQL、Analytics 或 AI Workflow 密钥放进前端或 Git；
- 不因为目录整理引入 Redis、Qdrant、对象存储或新的生产基础设施。
