# PostgreSQL 持久化运维手册

最近核对日期：2026-09-27。本手册只覆盖本地或私有单机 Docker Compose 的 PostgreSQL 操作，不把单机演练描述为公网生产能力。所有命令应在项目根目录执行。

## 1. 数据范围与边界

| 数据                                     | 是否由本项目 PostgreSQL 保存 | 说明                                                 |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| 用户账号、服务端会话、CSRF 关联数据      | 是                           | 由 Prisma schema 和 migration 管理。                 |
| AI 对话、消息、同会话摘要                | 是                           | 按用户所有权隔离；原始消息保留，摘要只服务同一会话。 |
| 实时灾害上下文                           | 否                           | 由 BFF 在 AI 请求期间组装并转发，不写入数据库。      |
| ai-workflow RAG 文档、向量索引和召回结果 | 否                           | 由外部 Workflow 服务管理，不包含在本项目备份中。     |
| 灾害历史快照、PostGIS 空间索引           | 否                           | 尚未实施，需另立历史数据设计。                       |

旧的用户确认式 Memory 持久化已经移除。服务启动不会隐式执行数据库迁移；迁移、备份和恢复都必须由操作者显式运行。

## 2. 前置检查

开始前确认：

1. 当前 Compose 项目和数据库卷不是测试或生产以外的错误目标；
2. `DATABASE_URL`、`POSTGRES_*` 和服务配置指向目标数据库；
3. Docker Compose、项目要求的 Node.js/pnpm 和可用磁盘空间均已准备；
4. 不把真实密码、令牌或连接串写进命令、日志、提交或文档。

检查和恢复演练会运行一次性 `web` 容器执行 Prisma migration status，因此首次使用前应准备好 `web` 镜像。

## 3. 首次启动与迁移

```bash
docker compose up -d db
pnpm db:migrate:deploy
pnpm db:check
```

`db:check` 检查数据库连接、`public` schema、账号/会话/AI 表、`_prisma_migrations` 和 migration status。全新数据库在 migration 前检查失败是预期结果，不代表数据库损坏。

## 4. 日常备份与恢复演练

推荐顺序是检查、备份、恢复演练、清理；任一步失败都停止后续操作：

```bash
pnpm db:check
pnpm db:backup
pnpm db:restore:verify
pnpm db:backup:prune
```

默认工件写入 Git 忽略的 `backups/`；可使用 `PERSISTENCE_BACKUP_DIR` 指向仓库外目录。每次备份包含 custom-format dump 和同名 SHA-256 manifest，manifest 不保存连接串或密码。

`db:restore:verify` 默认选择最新且校验通过的完整备份，也可传入指定 dump 路径。它先验证大小和 SHA-256，再导入临时 PostgreSQL 容器及独立卷，检查关键表和 migration status，结束时清理临时资源。它不会覆盖当前 Compose 数据库，也不等于正式生产恢复。

`db:backup:prune` 按运行主机的本地自然日保留今天及之前 6 天，共 7 个自然日；只删除固定命名规则的 dump 和 manifest，不清理其他文件。清理前应确认近期备份和恢复演练成功。

## 5. Schema 变更流程

每次 schema 变更前先确认目标项目、`DATABASE_URL`、磁盘空间、维护窗口，并完成一次新备份和恢复演练：

```bash
pnpm db:check
pnpm db:backup
pnpm db:restore:verify
pnpm db:migrate:deploy
pnpm db:check
```

Prisma migration 只前向执行，不自动生成或执行 down migration。迁移失败时保留数据库卷、备份和现场，检查 migration status、容器日志和失败步骤，再编写修复 migration；禁止通过删除 volume、`drop`、`truncate` 或 clean restore 掩盖错误。

## 6. 数据保护与恢复边界

备份包含用户账号、会话、AI 对话、消息和同会话摘要等敏感数据；实时灾害上下文和外部 RAG 文档不在这些备份中。限制备份目录、工件和复制件的访问权限，不提交 Git、不上传公开位置、不在日志或工单粘贴备份内容、`DATABASE_URL`、密码或令牌。

发生真实数据故障时，先停止写入、保留数据库卷和故障现场，选择并校验备份，记录恢复目标与数据丢失窗口，再制定人工审核的受控恢复步骤。公网所需的异地/对象存储、自动调度、集中告警、密钥管理、多实例协调和正式恢复预案仍需单独设计。

## 7. 隔离测试数据库

持久化运维验证使用 `docker-compose.yml` 与 `docker-compose.test.yml` 叠加、独立 Compose 项目名、测试专用 `DATABASE_URL`、独立卷和 `127.0.0.1:55439` 端口。测试结束后才可对已确认的隔离项目执行 `down -v`；不得对正式 Compose 项目使用该命令。
