# BFF 运行单元物理迁移设计

状态：已确认，作为运行单元与共享包架构治理第二阶段的第一批实现。

## 目标

将 Express BFF 的入口和实现从根目录 `server.ts`、`server/` 归档到 `apps/bff/`，同时保持 HTTP API、静态客户端托管、认证、AI 持久化、Analytics 代理、数据库连接和 Docker Compose 服务协议不变。

## 设计决策

1. `apps/bff/index.ts` 是正式启动入口；BFF 模块位于 `apps/bff/{ai,analytics,auth,db,hazards,security}`。
2. 根 `package.json)、TypeScript、Vitest、Dockerfile 和 Compose 继续作为仓库编排入口，不为 BFF 新增独立 workspace 包。
3. TypeScript 继续使用根 `tsconfig.server.json`，`rootDir` 保持仓库根，产物入口变为 `dist-server/apps/bff/index.js`。
4. BFF 依据编译入口位置计算仓库根目录，继续从根 `dist/` 托管 Vite 客户端。
5. Prisma 生成目录迁移到 `apps/bff/generated/prisma/`，数据库 schema、migration 和运行命令保持根 `prisma/` 边界。
6. BFF 生产代码直接从 `@pgg/hazard-domain` 公共入口导入灾害领域能力；`shared/hazards/` 兼容转导出本批暂保留。
7. `apps/web` 不得依赖 `apps/bff` 内部实现；测试可以直接导入 BFF 模块以保持现有 Node 测试边界。

## 不变项

- `/api/*` 路由、`/health`、认证与 AI 会话语义不变。
- Docker Compose 服务名 `web`、端口 `8080`、数据库服务 `db`、Analytics 服务 `analytics` 不变。
- Vite 仍把客户端构建到根 `dist/`，Playwright 仍通过 `pnpm run build && pnpm start` 启动 BFF。
- 不改数据库 schema、migration、API 响应契约或 AI provider 行为。

## 验收

- 根目录不存在 `server.ts` 和 `server/`，正式入口存在 `apps/bff/index.ts`。
- `dist-server/apps/bff/index.js` 可启动并提供静态页面与健康接口，`dist-server/server.js` 不再生成。
- 架构检查拒绝根 BFF 残留、缺失正式入口以及 Web/共享包越界依赖。
- Node lint、格式、类型检查、BFF/Service/组件测试和构建通过；可用环境再执行 E2E 与 Docker 冒烟。
