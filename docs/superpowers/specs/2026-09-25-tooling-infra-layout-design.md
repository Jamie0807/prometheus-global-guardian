# 工具与运维脚本分层治理设计

状态：已确认，待实施。

## 目标

按职责归档开发工具、数据库运维和分析服务脚本，根 `package.json` 继续提供稳定命令入口。

## 目录规则

- `tooling/architecture/check.mjs`：架构边界检查。
- `tooling/node/with-node-version.sh`：Node 版本包装器。
- `infra/persistence/backup-utils.mjs`、`db-ops.mjs` 和类型声明：数据库检查、备份、清理与恢复演练。
- `services/analytics/start.sh`、`test.sh`：分析服务启动和 Python 测试入口。
- 根 `package.json` 只保留命令编排，脚本命令改为调用新路径。

## 迁移规则

- 原 `scripts/check-architecture.mjs`、`scripts/with-node-version.sh`、`scripts/persistence/*` 和 Python 包装脚本迁移到目标目录。
- 更新 Docker、CI、文档、测试和架构门禁中的路径引用。
- 不改变命令参数、环境变量、退出码、备份安全边界和 Docker 服务协议。
- `scripts/` 在迁移完成后不再作为业务工具目录保留。

## 约束

- 运维脚本不得读取或打印密码、令牌、连接串等敏感值。
- 不在本阶段引入新的任务运行器或依赖管理工具。
- 不改变数据库 schema、migration 或备份保留策略。

## 验收

- 既有 `pnpm` 命令名称和行为保持不变。
- 架构检查、lint、类型检查、构建、Node 测试、Python 测试和持久化测试通过。
- 生产代码和文档不再引用旧 `scripts/` 路径。
