# PostgreSQL 持久化运维手册

## 适用范围与前提

本手册适用于本地或私有单机 Docker Compose 部署。数据库是 Compose 的 `db` 服务（PostgreSQL 16），账号、会话、AI 对话和记忆由 Prisma migration 管理。操作者需在项目根目录执行命令，准备好 Docker Compose、项目要求的 Node.js/pnpm，以及与目标数据库匹配的私有 `DATABASE_URL`、`POSTGRES_*` 和服务配置。先确认当前 Compose 项目及数据库卷，避免把测试项目当成正式项目。

`pnpm db:check`、`pnpm db:backup`、`pnpm db:backup:prune` 和 `pnpm db:restore:verify` 使用当前 Compose 配置；可用 `COMPOSE_FILE` 和 `PERSISTENCE_COMPOSE_PROJECT` 选择项目。`pnpm db:migrate:deploy` 由宿主机 Prisma 使用当前 `DATABASE_URL` 连接数据库；该地址必须是宿主机可访问的目标地址。检查和恢复演练会运行一次性 `web` 容器执行 Prisma migration status，因此首次使用前需准备好该镜像；首次构建和下载依赖可能耗时。不要在命令行参数、日志或文档中写入实际凭据。

## 首次启动与迁移

启动目标 Compose 数据库并等待健康检查通过，核对 `DATABASE_URL` 指向该数据库，再手动应用仓库 migration。应用启动不会隐式迁移。

```bash
docker compose up -d db
pnpm db:migrate:deploy
pnpm db:check
```

`pnpm db:check` 检查连接、`public` schema、账号与 AI 的六张表、`_prisma_migrations` 和 Prisma migration status；任一步失败时退出码非零。全新数据库在 migration 之前运行检查会失败，不能把它解释为数据库损坏。

## 日常备份、演练与清理

正常顺序是先检查数据库，再创建备份，随后验证恢复演练，最后清理过期工件。任一步失败时停止后续操作，先定位原因；尤其不要在备份或演练失败后继续清理。命令不会自动定时执行，需由操作者按运行频率手动执行。

```bash
pnpm db:check
pnpm db:backup
pnpm db:restore:verify
pnpm db:backup:prune
```

备份默认写入项目根目录被 Git 忽略的 `backups/`；可用 `PERSISTENCE_BACKUP_DIR` 指定仓库外目录。仓库内的自定义目录只能位于 `backups/` 下，路径不能含符号链接。每次备份生成 `pgg-postgres-YYYYMMDD-HHmmss.dump` 和同名 `.dump.sha256` manifest，使用 PostgreSQL custom format，manifest 记录文件名、大小、SHA-256、数据库、schema 和创建时间，不含连接串或密码。`db:restore:verify` 默认选择最新的完整且校验通过的备份，也可在命令后给出指定 dump 路径；它先检查大小与 SHA-256，再导入临时 PostgreSQL 容器和独立临时卷，检查关键表与 migration status，结束时清理临时容器和卷。校验或清理失败会返回非零状态。

`db:backup:prune` 按运行主机的本地自然日保留今天及之前 6 天，共 7 个自然日。它只删除备份目录中符合固定命名规则且超过窗口的普通 dump 和 manifest 文件；其他文件不会作为备份工件清理。保留窗口不是按 168 小时滚动。清理前应确认近期备份与恢复演练成功，并根据业务需求把更长期副本单独保存。

## 迁移前检查与失败处理

每次更改 schema 前，确认目标 Compose 项目、`DATABASE_URL`、待发布 migration、磁盘空间和维护窗口；完成一次新备份与恢复演练，保留旧数据卷及备份，再执行前向迁移和迁移后检查。

```bash
pnpm db:check
pnpm db:backup
pnpm db:restore:verify
pnpm db:migrate:deploy
pnpm db:check
```

Prisma migration 只前向执行，不自动生成或执行 down migration。迁移失败时保留数据库卷、备份和现场，检查 Prisma migration status、容器日志及失败步骤，再制定修复 migration。备份失败时检查 Compose 数据库健康、备份目录权限和剩余空间；恢复演练失败时检查 manifest 校验、临时容器/卷和 `web` 镜像状态。不要通过重复清理或覆盖数据掩盖错误。

## 恢复边界与数据保护

`db:restore:verify` 是备份工件校验和隔离数据库恢复演练，不会覆盖当前 Compose 数据库，也不等于正式生产恢复。发生真实数据故障时，先停止写入、保留现有数据库卷和故障现场，选择并校验备份，记录恢复目标与数据丢失窗口，再制定经人工审核的受控恢复步骤。**禁止把删除正式数据库 volume 当成恢复捷径**；也禁止对正式数据库执行 `drop`、`truncate` 或 clean restore 来完成演练。

备份包含用户账号、会话、AI 对话和记忆等敏感数据。限制备份目录、工件及复制件的访问权限，不提交 Git、不上传到公开位置、不在日志或工单中粘贴备份内容、`DATABASE_URL`、密码或令牌。删除备份时遵守本地保留策略及实际数据处理要求。

公网生产部署所需的异地或对象存储、自动调度、集中告警、密钥管理、多实例协调和正式恢复预案仍需单独设计；本手册不把单机演练视为这些能力的验收。
