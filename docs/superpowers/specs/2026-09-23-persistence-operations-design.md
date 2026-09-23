# 持久化运维设计

状态：已确认设计，待实现
日期：2026-09-23

## 目标

为当前本地/单机自托管部署增加可复现的 PostgreSQL 备份、备份保留、恢复演练、数据库检查和迁移运维流程。运维命令以手动执行为主，默认把备份写入项目目录下的 `backups/`，按日期保留最近 7 天。

## 背景与边界

当前服务通过 Docker Compose 运行单个 PostgreSQL 16 容器，账号、会话、AI 对话和长期记忆由 Prisma migration 管理。服务启动不会隐式执行 migration，数据库卷由 Compose 命名卷持久化。

本阶段只覆盖本地或私有单机部署。备份文件不提交 Git，不引入常驻定时任务，不设计对象存储、多实例协调、跨主机复制、邮箱通知或公网生产密钥管理。灾害历史数据和 PostGIS 仍不在本阶段范围内。

## 方案

采用项目脚本配合数据库容器工具的方式。脚本通过 `docker compose exec` 或一次性 Compose 任务容器调用与数据库镜像匹配的 `pg_dump`、`pg_restore` 和 `psql`，避免依赖宿主机 PostgreSQL 客户端版本。

默认命令如下：

```text
pnpm db:backup
pnpm db:backup:prune
pnpm db:restore:verify
pnpm db:check
```

备份目录由 `PERSISTENCE_BACKUP_DIR` 配置，未设置时使用 `backups/`。目录会被加入 `.gitignore`。备份文件采用带时间戳的 PostgreSQL custom format，并生成同名校验文件或 manifest，记录文件大小、SHA-256、数据库名称、schema 和创建时间；不记录密码和连接串。

## 命令契约

### `db:backup`

1. 检查数据库容器处于运行状态并能连接目标数据库。
2. 创建备份目录，拒绝把输出写入 Git 跟踪文件。
3. 使用 `pg_dump --format=custom --no-owner --no-acl` 生成临时文件。
4. 对临时文件完成非空检查和 SHA-256 计算后，以原子 rename 写入最终文件和 manifest。
5. 任意步骤失败时删除临时文件，保留已有备份并返回非零状态。

### `db:backup:prune`

1. 读取备份目录中由命名规则生成的备份及 manifest。
2. 按本地日期计算保留窗口，保留今天及之前 6 天的备份。
3. 只删除超过 7 天且同时满足命名规则的文件，不触碰其他文件。
4. 输出删除数量和保留数量；目录不存在时返回成功并说明没有可清理内容。

### `db:restore:verify`

1. 要求存在指定备份文件，默认选择最近一个经过 manifest 校验的备份。
2. 校验 SHA-256 和文件非空状态，不匹配时拒绝恢复。
3. 创建临时 PostgreSQL 数据库容器和独立临时卷，不能连接或写入 Compose 正式数据库。
4. 使用 `pg_restore` 导入备份，执行关键表读取检查和 `prisma migrate status` 检查。
5. 输出验证摘要后删除临时容器和临时卷；清理失败时返回非零状态并保留容器名称供排查。

该命令是恢复演练，不提供覆盖当前数据库的自动恢复。真实恢复必须由操作者先停止应用、保留现有卷和备份，再依据运行手册手动执行。

### `db:check`

检查以下条件并分别输出可读结果：数据库连接可用、migration history 存在且无 pending migration、`public` schema 存在、`users`、`auth_sessions`、`ai_conversations`、`ai_messages`、`ai_memory_items` 和 `ai_memory_suggestions` 表存在。任一检查失败返回非零状态。

## 迁移与回滚策略

- 发布前先运行 `db:backup` 和 `db:check`。
- 应用 migration 使用已有的 `pnpm db:migrate:deploy`，不在应用启动时自动迁移。
- Prisma migration 只向前执行，不生成自动 down migration。
- migration 失败时保留数据库和备份现场，先查看 Prisma migration 状态和容器日志；禁止通过删除数据库卷恢复“正常”。
- 需要回退行为时优先编写新的修复 migration；需要恢复数据时先用 `db:restore:verify` 验证备份，再由操作者执行受控恢复。

## 错误与安全约束

- 所有命令使用非零退出码表达失败，并将错误写到 stderr。
- 日志只能包含数据库名、备份文件名、数量和状态码，不打印 `DATABASE_URL`、密码、令牌或备份内容。
- 恢复演练必须使用独立临时数据库和卷；脚本对正式 Compose 数据库使用只读连接检查，不能执行 drop、truncate 或 clean restore。
- 备份目录权限按当前用户可读写设置；运行手册明确备份文件包含用户和 AI 数据，需按敏感数据处理。
- 备份文件名只允许固定字符集和时间戳，防止路径穿越；外部传入的备份路径必须解析到配置的备份目录或显式允许的绝对路径。

## 测试与验收

- 为备份命名、保留窗口、manifest 校验和路径安全添加单元测试，先验证失败再实现。
- 使用隔离的 PostgreSQL Compose 数据库执行一次完整流程：migration、`db:check`、`db:backup`、清理策略、`db:restore:verify`。
- 验收成功条件：备份文件非空且可校验；恢复演练能读取关键表；7 天前备份被清理、窗口内备份保留；正式数据库卷和数据在演练后不变；所有命令的错误路径返回非零状态。
- 文档验收包括从全新 Compose 数据库开始的完整命令顺序，以及失败后不破坏正式数据的说明。

## 交付物

- `scripts/` 下的备份、清理、恢复演练和数据库检查命令。
- `package.json` 中的 `db:backup`、`db:backup:prune`、`db:restore:verify`、`db:check` 脚本入口。
- `.gitignore` 中的 `backups/` 规则。
- `docs/OPERATIONS_PERSISTENCE.md` 运行手册。
- 对应的单元测试和隔离 PostgreSQL 验证记录。
