# Web 运行单元物理迁移设计

## 1. 背景

第一阶段已将跨语言 JSON 契约迁移到 `packages/contracts/`，将灾害领域 TypeScript 实现迁移到 `packages/hazard-domain/`，并建立了共享包与运行单元的依赖方向检查。React/Vite 代码仍位于根目录 `src/`，与根目录的 Express BFF、数据库配置和构建编排混在同一层。

本阶段先迁移 Web 运行单元，为后续 BFF 和 Python Analytics 迁移建立可复用的目录、配置和门禁模式。迁移只调整物理目录和构建入口，不改变业务 API、登录会话、数据库、灾害数据、Analytics、AI 或 UI 行为。

## 2. 目标与非目标

### 目标

- 将前端实现和浏览器入口收敛到 `apps/web/`。
- 保留根目录作为仓库级构建编排入口，继续提供 `pnpm run dev`、`build:client`、组件测试、E2E 和 Docker 构建命令。
- 让 Vite 以 `apps/web/` 为 root，并继续把生产客户端输出到根目录 `dist/`，供现有 Express 静态服务和 Docker runtime 镜像使用。
- 更新 TypeScript、Vitest、Playwright、Docker、格式检查、架构检查、测试和文档中的前端路径。
- 建立 `apps/web` 的依赖边界：只能依赖共享包和浏览器可用代码，不能依赖 `server`、`server.ts`、数据库模块或 Python 源码。
- 保持根目录 `src/` 删除后，开发、构建、组件测试、Service 测试和 E2E 的行为不变。

### 非目标

- 本阶段不迁移 `server/`、`server.ts` 或 `python-analytics-service/`。
- 不修改 API 路径、会话策略、数据库 Schema、AI Provider、灾害数据算法或页面视觉行为。
- 不新增 Turborepo、Nx、构建系统或运行时依赖。
- 不保留根目录 `src/` 的重复 re-export 副本；迁移完成后，前端唯一实现位于 `apps/web/src/`。
- 不删除 `shared/hazards/` 兼容入口；它属于共享领域包迁移的后续清理范围。

## 3. 目标结构

```text
apps/
└── web/
    ├── index.html
    └── src/
        ├── App.tsx
        ├── index.tsx
        ├── components/
        ├── config/
        ├── features/
        ├── hooks/
        ├── services/
        ├── state/
        ├── types/
        ├── utils/
        ├── workers/
        └── index.css
packages/
├── contracts/
└── hazard-domain/
server/
server.ts
python-analytics-service/
tests/
```

根目录继续保留 `package.json`、`vite.config.ts`、Vitest/Playwright 配置、TypeScript 配置、`Dockerfile` 和 Docker Compose。根目录脚本是仓库编排入口，不属于 Web 运行单元。

## 4. 配置与依赖边界

### Vite 与生产构建

- `vite.config.ts` 设置 `root: "apps/web"`。
- `build.outDir` 使用根目录的 `dist` 绝对路径或等价配置，避免输出到 `apps/web/dist`。
- Vite proxy、manual chunks、chunk 警告阈值和公开 `VITE_*` 配置保持现有语义。
- `apps/web/index.html` 使用相对入口 `./src/index.tsx`，不再依赖根目录 `/src/index.tsx`。
- 根 workspace 为 Web 声明 `@pgg/hazard-domain: "workspace:*"`，前端领域代码通过包公共入口导入；BFF 现有调用方在本阶段继续使用 `shared/hazards/` 兼容入口。

### TypeScript 与测试

- `tsconfig.app.json` 的前端 include 改为 `apps/web`，同时继续包含 `shared` 和 `packages` 所需的公共类型。
- `vitest.component.config.ts` 的 setup 文件和组件 include 改为 `apps/web/src`，组件测试仍留在根 `tests/component/`。
- Service 测试中的前端纯函数和服务模块导入统一改为 `../apps/web/src/...`；测试目录本身不迁移。
- `playwright.config.ts` 继续以根脚本构建并启动 BFF，baseURL、端口和测试目录保持不变。

### Docker 与静态服务

- Docker build context 继续为仓库根目录，复制 `apps/` 和 `packages/`。
- build stage 仍执行根目录 `pnpm run build`，runtime stage 仍复制根目录 `dist` 和 `dist-server`。
- Express 静态服务继续从根目录 `dist` 提供客户端；不改变容器端口或服务启动命令。

### 架构门禁

- `check:architecture` 将 `apps/web` 视为浏览器运行单元。
- `apps/web` 不得相对导入 `server`、`server.ts`、`apps/bff`、`services/analytics`、数据库模块或 Python 源码。
- 生产代码不得绕过共享包公共入口导入 `packages/hazard-domain/src` 内部文件。
- 迁移期间根目录 `src` 作为禁止残留路径检查；完成后不得存在根 `src` 实现目录。

## 5. 迁移步骤

1. 增加迁移前失败测试，锁定 `apps/web/index.html`、`apps/web/src/index.tsx`、Vite root、输出目录和依赖方向规则。
2. 移动 `src/` 和 `index.html` 到 `apps/web/`，保持文件内容不变。
3. 更新 Vite、TypeScript、Vitest、Playwright、Docker、格式检查和架构检查配置。
4. 批量更新根 `tests/`、类型测试和文档中的前端导入路径。
5. 运行客户端类型检查、组件测试、Service 测试、构建和 E2E；遇到环境失败时记录根因，不用重试掩盖问题。
6. 删除根目录 `src/` 残留引用，确认 `rg` 不再发现生产代码或测试读取旧路径。
7. 更新 README、`docs/PROJECT_SPEC.md`、`docs/TESTING_BASELINE.md` 和 `docs/PROJECT_OPTIMIZATION_BACKLOG.md`，将 Web 物理迁移标记为完成，BFF/Python 迁移仍标记为后续阶段。

## 6. 兼容与回滚

- 根目录脚本名称和调用方式保持不变，因此本地开发、CI、Docker 和 E2E 不需要新增命令。
- 迁移期间不创建根 `src` 的兼容实现；如果某个工具仍依赖旧路径，优先更新该工具配置或测试入口。
- 若构建或 E2E 无法在迁移后通过，回滚迁移提交即可恢复第一阶段的 `src/` 结构；不修改数据库或外部服务状态。
- 只有新目录下的构建、类型检查和测试全部通过，才进入后续 BFF 物理迁移。

## 7. 验收标准

- `apps/web/index.html` 和 `apps/web/src/` 是前端唯一实现位置，根目录 `src/` 不存在。
- `pnpm run dev`、`pnpm run build:client` 和 `pnpm run build` 仍可使用，客户端产物位于根 `dist/`。
- `pnpm run typecheck:client`、`pnpm run test:component`、`pnpm run test:services`、`pnpm run test:e2e`、`pnpm run check:architecture`、`pnpm run lint`、`pnpm run format:check` 和 `git diff --check` 通过；环境阻断项必须单独记录。
- 登录、地图、通知、Analytics、AI 助手和报告导出行为保持现有测试覆盖与运行语义。
- 文档和架构门禁准确反映 `apps/web` 已完成、`apps/bff` 与 `services/analytics` 尚未迁移的状态。
