# Web 运行单元物理迁移实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变登录、地图、通知、Analytics、AI、报告和 BFF API 行为的前提下，将 React/Vite 浏览器运行单元从根目录 `src/` 迁移到 `apps/web/`，保持根目录脚本、根 `dist/` 客户端产物和 Express 静态服务兼容。

**Architecture:** 根目录继续作为仓库级构建编排层，`apps/web/` 成为唯一 Web 实现目录，`packages/*` 提供共享契约和领域能力；本阶段不迁移 `server/`、`server.ts` 或 `python-analytics-service/`。Vite 使用 `apps/web` 作为 root，但显式输出到根 `dist/`，因此现有 BFF 和 Docker runtime 不需要改变客户端产物路径。浏览器代码通过 `@pgg/hazard-domain` 公共入口使用灾害领域能力，BFF 在本阶段继续使用 `shared/hazards/` 兼容入口。

**Tech Stack:** pnpm 10 workspace、React 19、TypeScript 5.9、Vite 7、Vitest、React Testing Library、Playwright、Express、Node 原生测试、现有 Docker Compose 与架构检查脚本。

## Global Constraints

- 先保留当前工作区已有的 `README.md` 未暂存修改，不覆盖、不回滚、不把它混入本阶段变更。
- 只迁移 Web 物理目录和相关配置、测试路径、架构门禁及文档；不改变 API 路径、会话策略、数据库 Schema、AI Provider、灾害算法、页面视觉和运行时业务语义。
- 不迁移 `server/`、`server.ts`、`python-analytics-service/`；`apps/bff/` 与 `services/analytics/` 只在后续架构阶段处理。
- 不保留根 `src/` re-export 兼容层。迁移完成后，`apps/web/src/` 是前端唯一生产实现位置。
- `shared/hazards/` 兼容入口本阶段继续保留；只有后续所有运行单元完成调用方迁移后才评估删除。
- 根 package 为浏览器代码声明 `@pgg/hazard-domain: "workspace:*"`，并使用包公共入口；不新增对 `packages/hazard-domain/src/*` 内部文件的生产导入。
- 新增或修改 TypeScript 使用 `unknown`、类型守卫和 `import type`，不新增无必要的 `any`。
- 需要修改的测试先写失败断言，再实现迁移使其通过；纯路径批量替换也必须运行受影响测试和类型检查。
- 不自动执行 `git add`、`git commit`、push、合并或创建 PR；本计划完成后等待用户明确指令处理 Git 历史。
- 每个任务结束都运行 `git diff --check`，并确认改动只属于本计划和必要的 `pnpm-lock.yaml` 更新。

---

### Task 1: 建立 Web 迁移边界的失败测试

**Files:**

- Modify: `tests/service-architecture-boundaries.test.ts`
- Modify: `scripts/check-architecture.mjs`
- Modify: `vite.config.ts`
- Create during the test step: `apps/web/index.html`, `apps/web/src/index.tsx`（实现步骤再正式迁移完整目录）

**Interfaces:**

- Produces: 可验证的 Web 目录、Vite root/output 和浏览器运行单元依赖边界。
- Consumes: 现有 `checkArchitecture(rootDirectory)` 测试 helper、TypeScript AST import 扫描器和根 `vite.config.ts`。

- [ ] **Step 1: 记录迁移前状态**

  运行：

  ```bash
  git status --short
  test -d src
  test ! -d apps/web
  ```

  预期：只显示已有的 `README.md` 修改和本 Spec/计划文件；根 `src/` 存在，`apps/web/` 尚未存在。不要处理已有无关生成目录。

- [ ] **Step 2: 先增加会失败的目录和构建契约测试**

  在 `tests/service-architecture-boundaries.test.ts` 增加测试，读取真实仓库文件并锁定以下约束：

  ```ts
  it("uses apps/web as the browser entrypoint", () => {
    const viteConfig = readFileSync(path.join(repositoryRoot, "vite.config.ts"), "utf8");
    expect(existsSync(path.join(repositoryRoot, "apps/web/index.html"))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, "apps/web/src/index.tsx"))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, "src"))).toBe(false);
    expect(viteConfig).toContain('root: "apps/web"');
    expect(viteConfig).toContain('outDir: path.resolve(repositoryRoot, "dist")');
  });
  ```

  先运行：

  ```bash
  pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
  ```

  预期：新测试因目录、Vite root、根 `src` 清理尚未完成而失败（RED）。失败必须来自断言，不得用跳过测试或宽松断言掩盖。

- [ ] **Step 3: 先增加会失败的 Web 依赖方向测试**

  在同一测试文件中使用现有 `withFixture`，写入 `apps/web/src/forbidden.ts`，包含相对导入 `../../../server/server.ts`，断言 `checkArchitecture(fixture)` 返回稳定错误：

  ```text
  apps/web must not import server runtime: apps/web/src/forbidden.ts -> ../../../server/server.ts
  ```

  再写入 `apps/web/src/internal.ts`，包含 `../../../packages/hazard-domain/src/hazard-event`，断言返回：

  ```text
  production code must use a package entrypoint: apps/web/src/internal.ts -> ../../../packages/hazard-domain/src/hazard-event
  ```

  先运行同一个 Vitest 文件，预期这两个新边界断言也失败，因为检查器尚未扫描 `apps/web`。

- [ ] **Step 4: 检查失败范围**

  运行：

  ```bash
  git diff --check
  git status --short
  ```

  预期：只出现测试和未完成迁移所需的配置草稿；此时不提交代码。

### Task 2: 移动 Web 实现并更新客户端构建配置

**Files:**

- Move: `index.html` → `apps/web/index.html`
- Move: `src/` → `apps/web/src/`
- Modify: `vite.config.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `tsconfig.app.json`
- Modify: `tsconfig.type-tests.json`
- Modify: `eslint.config.js`
- Modify: `tests/type-tests/analytics-contracts.test-d.ts`
- Modify: frontend imports under `apps/web/src/**` that reference `shared/hazards/**`

**Interfaces:**

- Produces: `apps/web/index.html`、`apps/web/src/**` 和根 `dist/` 输出之间的稳定构建边界。
- Consumes: Task 1 的 RED 测试、`@pgg/hazard-domain` workspace package 和现有 React/Vite 文件内容。

- [ ] **Step 1: 用文件移动完成物理迁移**

  使用文件系统移动（保留 Git 可识别的重命名）：

  ```bash
  mkdir -p apps/web
  git mv index.html apps/web/index.html
  git mv src apps/web/src
  ```

  修改 `apps/web/index.html` 的入口为 `./src/index.tsx`。保留 HTML 的语言、meta、title 和公开配置占位符，不修改页面行为。

- [ ] **Step 2: 更新 Vite root 和根 dist 输出**

  在 `vite.config.ts` 增加 `import path from "node:path"` 和基于 `import.meta.url` 的仓库根目录变量，使用：

  ```ts
  const repositoryRoot = fileURLToPath(new URL(".", import.meta.url));

  export default defineConfig({
    root: "apps/web",
    // ... 保留现有 plugins、server.proxy、manualChunks 和警告阈值
    build: {
      outDir: path.resolve(repositoryRoot, "dist"),
      emptyOutDir: true,
      // 保留现有 rollupOptions.output.manualChunks
    },
  });
  ```

  同时从 `node:url` 导入 `fileURLToPath`。`outDir` 必须解析到仓库根 `dist/`；不要让产物落入 `apps/web/dist/`。测试必须能够确定最终目录是根 `dist/`。

- [ ] **Step 3: 声明 Web 对共享领域包的依赖**

  在根 `package.json` 的 `dependencies` 增加：

  ```json
  "@pgg/hazard-domain": "workspace:*"
  ```

  将迁移到 `apps/web/src` 的浏览器代码中以下相对导入改为包公共入口 `@pgg/hazard-domain`：
  - `hazard-event`、`hazard-layer-registry` 及其类型导入；
  - `src/services/analytics/analyticsService.ts`、`src/services/analytics/analyticsTypes.ts`；
  - `src/services/analytics/contracts/hazardInput.ts`；
  - `src/services/hazards/hazardAdapters.ts`、`src/services/hazards/contracts/hazardFeed.ts`；
  - `src/services/ai/aiAssistantService.ts` 和 `src/types/index.ts` 中仍引用旧灾害实现的导入。

  以 `rg -n "shared/hazards|packages/hazard-domain/src" apps/web/src` 逐项清理；不要改动 BFF 现有 `shared/hazards` 兼容入口调用。

- [ ] **Step 4: 更新 TypeScript 与 ESLint 范围**
  - `tsconfig.app.json` 的 `include` 改为 `apps/web`、`shared`、`packages`，继续排除 `node_modules`、`dist`、`dist-server`。
  - `tsconfig.type-tests.json` 将 `src` 替换为 `apps/web`，保留 `packages` 和 `tests/type-tests/**/*.test-d.ts`。
  - `eslint.config.js` 中 Analytics 特殊规则的所有 `src/...` glob 改为 `apps/web/...`；通用 `**/*.{ts,tsx}` 规则保持不变。
  - `tests/type-tests/analytics-contracts.test-d.ts` 中的前端模块路径改为 `../../apps/web/src/...`；不把测试目录迁到 `apps/web`。

- [ ] **Step 5: 更新锁文件并先做客户端绿测**

  运行：

  ```bash
  pnpm install --lockfile-only
  pnpm run typecheck:client
  pnpm run build:client
  pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
  ```

  预期：lockfile 记录 workspace 依赖；客户端类型检查和 Vite 构建通过；构建产物出现在根 `dist/`，且 Web 迁移契约测试转绿。若出现旧 `src` 导入，继续修正真实调用方，不添加根目录 wrapper。

- [ ] **Step 6: 检查迁移后的源目录**

  运行：

  ```bash
  test ! -d src
  test -f apps/web/index.html
  test -f apps/web/src/index.tsx
  rg -n "(^|[\"'`])(/?src/|\.\./src/)" apps/web tests vite.config.ts tsconfig*.json package.json eslint.config.js
  git diff --check
  ```

  预期：根 `src/` 不存在；生产代码、测试和配置不再使用旧根 `src` 入口。README 和历史说明中的架构文字暂时留到 Task 5 统一更新。

### Task 3: 更新 Service、组件和类型测试路径

**Files:**

- Modify: all `tests/service-*.test.ts` files importing frontend modules
- Modify: all `tests/component/**/*.test.tsx` files importing frontend modules
- Modify: `tests/type-tests/analytics-contracts.test-d.ts`
- Modify: `vitest.component.config.ts`
- Modify: `vitest.config.ts` only if an include/root path is explicitly tied to `src`
- Modify: `playwright.config.ts` only if the migrated Vite root requires an explicit root or preview setting

**Interfaces:**

- Produces: 根 `tests/` 继续是测试运行单元，所有浏览器模块通过 `apps/web/src/**` 被测试引用。
- Consumes: Task 2 完成后的 Web 目录和根脚本接口；不改变测试命令名称。

- [ ] **Step 1: 生成待迁移路径清单并写路径断言**

  运行：

  ```bash
  rg -l "from ['\"]\.\./src/|from ['\"]\.\./\.\./src/|from ['\"]\.\./\.\./\.\./src/|src/" tests
  ```

  按实际结果建立修改清单，至少覆盖 Service 测试中的 `analytics`、`hazards`、`auth`、`http`、`map`、`report` 模块，以及组件测试中的 Analytics、Map、状态、错误边界和 AI 组件。不要把 `dist-server` 的 BFF import 路径替换成 Web 路径。

- [ ] **Step 2: 先运行受影响测试确认 RED**

  在路径尚未全部更新时运行：

  ```bash
  pnpm run test:services
  pnpm run test:component
  ```

  预期：仍有旧 `../src/...` 导入失败；记录第一个真实失败模块，避免通过 alias 或重新创建根 `src` 目录绕过迁移。

- [ ] **Step 3: 更新 Service 测试导入**

  将测试中指向前端实现的相对路径按测试文件深度改为 `../apps/web/src/...`；保留 BFF 测试对 `server/`、`server.ts` 和 `dist-server` 的路径。对前端纯函数和 Service 的 import 使用实际模块位置核对，不做全仓库无条件文本替换。

- [ ] **Step 4: 更新组件测试与组件配置**

  将 `tests/component/**/*.test.tsx` 的前端 import 改为 `../../apps/web/src/...`。`vitest.component.config.ts` 保持 setup 文件在 `tests/component/setup.ts`，确认 include 仍为 `tests/component/**/*.test.tsx`；若配置中出现 `src`，改成 `apps/web/src`。

- [ ] **Step 5: 更新类型测试和 E2E 入口检查**

  更新 `tests/type-tests/analytics-contracts.test-d.ts` 的路径。检查 `tests/e2e` 是否直接读取根 `src` 或旧 `index.html`；若有则改为生产入口行为检查，不把 E2E 测试迁移到 Web 目录。确认 Playwright 仍运行 `pnpm run build && PORT=4174 pnpm start`，baseURL 和 testDir 不变。

- [ ] **Step 6: 运行受影响测试和差异检查**

  运行：

  ```bash
  pnpm run test:services
  pnpm run test:component
  pnpm run typecheck:contracts
  git diff --check
  ```

  预期：Service、组件和契约类型测试通过；所有测试仍从根 `tests/` 运行，未改变测试语义或数量。

### Task 4: 扩展架构门禁并验证 Docker/运行时边界

**Files:**

- Modify: `scripts/check-architecture.mjs`
- Modify: `tests/service-architecture-boundaries.test.ts`
- Inspect and modify only if required: `Dockerfile`, `.dockerignore`, `server.ts`, `playwright.config.ts`
- Modify: `tsconfig.server.json` only if the Web move accidentally changes its include boundary

**Interfaces:**

- Produces: `check:architecture` 能扫描 `apps/web`，拒绝浏览器代码依赖服务端/Python/数据库运行时，并拒绝共享包内部路径。
- Compatibility: 根 `dist/`、`dist-server/`、Express 静态服务、Docker 端口和 Playwright 命令保持原有接口。

- [ ] **Step 1: 为检查器补充边界测试并确认 RED**

  在 `tests/service-architecture-boundaries.test.ts` 增加 fixture：
  - `apps/web/src/server-import.ts` 导入 `../../../server/server.ts`，预期 `apps/web must not import server runtime: ...`；
  - `apps/web/src/bff-import.ts` 导入 `../../../apps/bff/client.ts`，预期拒绝 `apps/bff`；
  - `apps/web/src/python-import.ts` 导入 `../../../python-analytics-service/app/main.py`，预期拒绝 Python 运行时；
  - `apps/web/src/db-import.ts` 导入 `../../../server/db/client.ts`，预期拒绝数据库模块；
  - `apps/web/src/package-internal.ts` 导入 `../../../packages/hazard-domain/src/hazard-event`，预期使用包公共入口；
  - 注释和字符串中的同样文本不应触发错误，沿用现有 TypeScript AST 解析行为。

  运行：

  ```bash
  pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
  ```

  预期：新增 fixture 断言先失败，证明测试确实覆盖新门禁。

- [ ] **Step 2: 让检查器扫描 Web 生产代码**

  在 `scripts/check-architecture.mjs` 中：
  - 保留现有 package metadata、包反向依赖和兼容 re-export 规则；
  - 将 `apps` 纳入 production source scan；
  - 对位于 `apps/web` 的文件解析相对 import，拒绝解析到 `server`、`server.ts`、`apps/bff`、`services/analytics`、`python-analytics-service` 或数据库模块；
  - 继续拒绝所有生产代码直接解析到 `packages/hazard-domain/src` 内部路径，允许的公共入口为 `@pgg/hazard-domain`；
  - 当根 `src` 目录存在时返回稳定错误，例如 `root src directory must be removed after web migration: src`，迁移完成后由真实仓库检查确认不再出现；
  - 忽略 `.git`、`.venv`、`__pycache__`、`dist`、`dist-server`、`node_modules` 等生成目录。

- [ ] **Step 3: 运行架构检查并修正真实违规**

  运行：

  ```bash
  pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
  pnpm run check:architecture
  ```

  预期：fixture 测试与真实仓库检查全部通过；若出现 Web 到服务端的真实相对导入，修正调用方向或抽取到共享包，不能简单把规则放宽。

- [ ] **Step 4: 验证 TypeScript、Docker 和静态服务边界**

  检查并按实际需要调整：
  - `tsconfig.server.json` 不把 `apps/web` 误纳入 BFF 编译，保持 `server.ts`、`server/**`、`shared/**`、`packages/**` 的范围；
  - `server.ts` 编译后仍从 `dist-server/server.js` 的相邻根 `dist/` 提供客户端；
  - `Dockerfile` 根 build context 的 `COPY . .` 已包含 `apps/` 和 `packages/`，runtime 继续复制 `/app/dist` 与 `/app/dist-server`；如检查发现显式 COPY 列表遗漏新目录，只补最小必要路径；
  - `.dockerignore` 不忽略 `apps/web`、`packages` 或 `apps/web/index.html`；
  - Playwright `webServer.command` 仍使用根构建脚本和 `pnpm start`。

  运行：

  ```bash
  pnpm run typecheck:server
  pnpm run build
  test -f dist/index.html
  test -f dist-server/server.js
  ```

  预期：BFF 类型检查、客户端和服务端构建通过，两个根产物都存在；不启动外部数据库或发送外部请求。

### Task 5: 更新架构文档、待优化清单并完成自主验收

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/TESTING_BASELINE.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/superpowers/specs/2026-09-24-web-runtime-migration-design.md` only if implementation reveals a clarified path or constraint

**Interfaces:**

- Produces: 文档准确描述 `apps/web` 已完成、`apps/bff` 和 `services/analytics` 仍是后续阶段，并保留根脚本和共享包边界说明。
- Consumes: Task 2–4 的实际文件结构、通过的检查命令和真实环境阻断信息。

- [ ] **Step 1: 更新项目结构和边界说明**

  在 README 的中英文结构树、项目规格和测试基线中：
  - 将前端实现路径从 `src/` 改为 `apps/web/src/`；
  - 将浏览器入口写为 `apps/web/index.html`；
  - 保留根 `package.json`、Vite、Vitest、Playwright、Dockerfile 作为仓库编排入口；
  - 写明客户端产物仍输出到根 `dist/`，Express 继续提供该目录；
  - 写明 `@pgg/hazard-domain` 是 Web 的公共依赖入口，`shared/hazards/` 仍是 BFF 迁移期兼容入口；
  - 删除“Web 仍位于根 `src/`”的现状描述，改为 BFF/Python 物理迁移待后续阶段。

  使用 `rg -n "src/|root src|仍位于.*src|apps/web|services/analytics" README.md docs/PROJECT_SPEC.md docs/TESTING_BASELINE.md` 逐处核对，历史变更记录如需保留必须明确标注为历史状态。

- [ ] **Step 2: 更新待优化清单状态**

  在 `docs/PROJECT_OPTIMIZATION_BACKLOG.md`：
  - 将“Web/BFF/Python 运行单元物理迁移”拆分为当前 Web 迁移已完成、BFF/Python 迁移后续两条可追踪内容，或在同一条中明确阶段状态；
  - 记录本阶段实际完成项：`apps/web` 目录、根 `dist` 输出、Web 依赖门禁、测试路径和文档同步；
  - 保留后续 `apps/bff/`、`services/analytics/` 以及兼容入口清理的待办，不把它们写成已完成。

- [ ] **Step 3: 运行完整的本地可执行验证集**

  依次运行：

  ```bash
  pnpm run lint
  pnpm run format:check
  pnpm run typecheck:client
  pnpm run typecheck:server
  pnpm run typecheck:contracts
  pnpm run check:architecture
  pnpm run test:services
  pnpm run test:component
  pnpm run build
  git diff --check
  ```

  再按环境允许运行：

  ```bash
  pnpm run test:e2e
  pnpm run test:python
  ```

  预期：前一组命令全部通过；E2E/Python 若受本机 Node、浏览器、数据库或 Python 依赖阻断，记录实际命令、首个错误、根因和可在 CI/匹配环境复现的替代验证，不将环境失败描述为代码通过。

- [ ] **Step 4: 完成最终静态检查和交付前复核**

  运行：

  ```bash
  test ! -d src
  test -f apps/web/index.html
  test -f apps/web/src/index.tsx
  rg -n "from ['\"][^'\"]*src/|packages/hazard-domain/src|server/server|python-analytics-service" apps/web/src tests scripts vite.config.ts tsconfig*.json eslint.config.js
  git status --short
  git diff --stat
  git diff --check
  ```

  预期：Web 生产实现和测试不再使用根 `src`；只允许由门禁规则覆盖的历史兼容入口引用；工作区只包含本阶段文件、必要锁文件以及用户原有 `README.md` 修改。输出实际验证结果后等待用户决定是否提交或合并。

## 交付边界

- 本计划不包含提交、推送、合并或 PR。用户若后续明确要求提交，需先确认暂存区只包含本阶段文件，使用 commitlint 校验英文 Conventional Commit 信息，再按项目约定执行 `pnpm commit`。
- 本阶段完成后，下一阶段才处理 `server/` → `apps/bff/`、`python-analytics-service/` → `services/analytics/` 和 `shared/hazards/` 兼容入口清理；不得在本阶段顺手扩展范围。
