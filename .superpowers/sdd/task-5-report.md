# Web 运行单元迁移 Task 5 报告

## 状态

完成。文档已同步，最终整体验收完成；未暂存、提交、推送或合并。

## 文档变更

- `README.md`：目录树、Web 入口、根 `dist/` 输出、共享包公共入口和后续 BFF/Python 迁移状态已更新。
- `docs/PROJECT_SPEC.md`：目录地图、Service 边界、依赖规则、运行命令和事实路径已更新为 `apps/web/`。
- `docs/TESTING_BASELINE.md`：架构门禁、测试入口、根 `dist/` 和后续运行单元迁移状态已更新。
- `docs/PROJECT_OPTIMIZATION_BACKLOG.md`：新增 Web 物理迁移完成项，并将 BFF/Python 物理迁移保留为后续待办。
- `vite.config.ts`：最终复核补充 `envDir: repositoryRoot`，确保根 `.env` 与 `.env.[mode]` 中的公开 `VITE_*` 配置继续生效；对应架构测试已增加断言。

## 验证证据

通过：

- `pnpm run lint`：0 error；仅生成的 Prisma 文件有既有 eslint-disable warning。
- `pnpm run format:check`：通过。
- `pnpm run typecheck:client`：通过。
- `pnpm run typecheck:server`：通过，Prisma Client 生成成功。
- `pnpm run typecheck:contracts`：通过。
- `pnpm run check:architecture`：通过。
- `pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts`：36/36 通过。
- `pnpm run test:services`：21 个文件通过，310/310 个已收集用例通过；`tests/server-hazard-event-registry.test.ts` 因未设置 `DATABASE_URL` 在收集阶段阻断。
- `pnpm run test:component`：19 个文件、108/108 通过。
- `pnpm run build`：通过，客户端输出根 `dist/`，服务端输出 `dist-server/`。
- `pnpm run test:e2e`：WebServer 因未设置 `DATABASE_URL` 无法启动，未将 E2E 计为通过。
- `pnpm run test:python`：本机 Python 3.9 缺少 `pandas`、`fastapi`、`pydantic`、`numpy`；未将 Python 测试计为通过。项目 Python 依赖应在 CI/Python 3.13 环境验证。
- `git diff --check`：通过。

## 最终结构检查

- 根 `src/` 不存在。
- `apps/web/index.html` 和 `apps/web/src/index.tsx` 存在。
- 根 `dist/index.html` 和 `dist-server/server.js` 存在。
- Web 生产代码与测试路径已迁移到 `apps/web/src`；BFF、Python 和兼容入口仍保留原位置。
- 最终复核确认 Docker COPY/runtime、Express `../dist` 静态服务和 Playwright 根 build/start 接口未改变。

## 限制

- 当前命令环境使用宿主 Node 24 调用 pnpm，项目脚本通过 `with-node-version.sh` 使用 Node 20.19.0；存在 engine warning。
- E2E、需要数据库的 BFF Service 收集和本机 Python 测试需要匹配的 PostgreSQL/Python 依赖环境；这些阻断不改变本次 Web 物理迁移验证结论。
- Mapbox vendor chunk 的既有体积 warning 未在本架构迁移中处理。
