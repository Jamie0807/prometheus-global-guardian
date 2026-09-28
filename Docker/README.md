# Docker 基础设施

## 目录结构

```text
Docker/
├── build/
│   ├── web-bff.Dockerfile       # React 静态资源与 Express BFF 完整栈镜像
│   └── analytics.Dockerfile     # FastAPI Analytics 镜像
├── compose/
│   ├── docker-compose.yml       # 本地完整栈编排
│   └── docker-compose.test.yml  # 隔离测试数据库覆盖
└── README.md
```

Docker build context 固定为仓库根目录。这样 Dockerfile 可以访问 `apps/`、`packages/`、`prisma/` 和 `services/analytics/`，而 Docker 构建忽略规则仍统一由根目录的 `.dockerignore` 管理。

由于 Compose 文件位于子目录，所有本地 Compose 命令都显式使用 `--env-file .env`，确保加载仓库根目录的运行时配置和服务端密钥。
完整栈 Compose 项目名固定为 `prometheus-global-guardian`，Docker Desktop 中会按此名称显示项目分组。

## 本地启动

在仓库根目录执行：

```bash
cp .env.example .env
# 按 README.md 的说明填写服务端密钥和 Provider 配置。
docker compose --env-file .env -f Docker/compose/docker-compose.yml up --build -d
docker compose --env-file .env -f Docker/compose/docker-compose.yml ps
docker compose --env-file .env -f Docker/compose/docker-compose.yml exec web pnpm run db:migrate:deploy
```

访问 `http://localhost:8080`。数据库迁移必须显式执行，容器启动不会自动修改数据库 schema。

停止本地完整栈：

```bash
docker compose --env-file .env -f Docker/compose/docker-compose.yml down
```

## 配置检查与测试数据库

配置检查不启动容器，也不访问数据卷：

```bash
pnpm run check:docker
```

持久化和数据库集成测试使用隔离 Compose 覆盖，固定使用测试端口 `127.0.0.1:55439` 和 `postgres-auth-test-data` 卷：

```bash
docker compose \
  --env-file .env \
  -f Docker/compose/docker-compose.yml \
  -f Docker/compose/docker-compose.test.yml \
  -p pgg-test up -d db
```

不得对正式本地数据库执行 `down -v`。测试项目确认无后续使用后，才可以执行：

```bash
docker compose \
  --env-file .env \
  -f Docker/compose/docker-compose.yml \
  -f Docker/compose/docker-compose.test.yml \
  -p pgg-test down -v
```

## 镜像原则

- Node 镜像固定为 `node:20.19-slim`，Python 镜像固定为 `python:3.13-slim`。
- 依赖安装使用仓库锁定的 pnpm lockfile 或 Python requirements 文件。
- PostgreSQL 数据通过命名卷保存，容器删除不等于数据库删除。
- `DATABASE_URL`、会话密钥、Analytics token、DisasterAware 凭据和 AI Provider key 只能通过运行时环境变量注入。
- 不把 `.env`、备份文件、token 或模型密钥复制进镜像或提交到 Git。
- 本目录只描述本地或私有单机完整栈，不代表已经具备公网部署、镜像发布或自动 migration 能力。
