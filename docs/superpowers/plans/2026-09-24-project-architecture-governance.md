# 全项目运行单元与共享包架构治理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变业务 API、数据库和运行行为的前提下，将跨语言契约与 TypeScript 灾害领域代码收敛为可检查的共享包，并建立后续 Web、BFF、Analytics 运行单元迁移的边界。

**Architecture:** 第一阶段保留根目录 Node 构建编排和现有运行入口，只把 `contracts/` 迁移到 `packages/contracts/`，把 `shared/hazards/` 迁移到 `packages/hazard-domain/`，并保留兼容 re-export。架构检查脚本验证包不能反向依赖运行单元、生产代码不能引用共享包内部路径；Web、BFF 和 Python 运行单元的物理迁移留到后续阶段。

**Tech Stack:** pnpm 10 workspace、TypeScript 5.9、Vite、Vitest、Express、FastAPI、Python unittest、Node.js 原生脚本、GitHub Actions。

## Global Constraints

- 只修改架构治理直接涉及的文件，不改业务 API、数据库 Schema、认证策略、Python 算法和 UI 行为。
- 保留 `shared/hazards/` 兼容 re-export，所有消费者迁移完成前不得删除旧入口。
- `packages/contracts/` 只保存语言无关 JSON 契约，不生成绑定某一语言的运行时代码。
- `packages/hazard-domain/` 不依赖 React、Express、FastAPI、HTTP、环境变量、数据库或页面组件。
- 不引入 Turborepo、Nx 或新的依赖分析框架；架构检查使用现有 Node、TypeScript 和 ESLint 能力。
- 所有新增 TypeScript 使用 `unknown`、类型守卫和 `import type`，不新增无必要的 `any`。
- 不自动执行 `git add`、`git commit`、push 或合并；只有用户明确授权提交时才执行项目要求的 `pnpm commit`。
- 每个任务完成后保持工作区可构建、可测试，并用 `git diff --check` 检查空白错误。

---

### Task 1: 建立 workspace 和共享包骨架

**Files:**

- Modify: `pnpm-workspace.yaml`
- Modify: `package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/hazard-domain/package.json`
- Create: `packages/hazard-domain/src/index.ts`
- Create: `tests/service-architecture-boundaries.test.ts`
- Modify: `tsconfig.app.json`
- Modify: `tsconfig.server.json`
- Modify: `tsconfig.type-tests.json`

**Interfaces:**

- Produces: workspace 包 `@pgg/contracts`、`@pgg/hazard-domain`，以及由测试和后续任务调用的 `pnpm run check:architecture` 命令。
- Consumes: 当前根目录 package、`shared/hazards/` 的两个实现文件和现有 Vitest 配置。

- [ ] **Step 1: 先写 workspace 验收测试**

在 `tests/service-architecture-boundaries.test.ts` 增加包入口存在性测试，先使用明确的文件路径验证骨架尚未存在：

```ts
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(import.meta.dirname, "..");

describe("workspace architecture", () => {
  it("declares the package workspace and shared package entrypoints", () => {
    const workspace = readFileSync(path.join(repositoryRoot, "pnpm-workspace.yaml"), "utf8");

    expect(workspace).toContain("packages/*");
    expect(existsSync(path.join(repositoryRoot, "packages/contracts/package.json"))).toBe(true);
    expect(existsSync(path.join(repositoryRoot, "packages/hazard-domain/src/index.ts"))).toBe(true);
  });
});
```

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
```

预期：在骨架创建前失败，提示 workspace 或入口文件不存在。

- [ ] **Step 2: 声明 workspace 包目录**

将 `pnpm-workspace.yaml` 的 `packages` 从空数组改为：

```yaml
packages:
  - "packages/*"
```

保留现有 `onlyBuiltDependencies` 配置，不把 `apps` 或 Python 目录加入 pnpm workspace。

- [ ] **Step 3: 创建数据契约包元数据**

创建 `packages/contracts/package.json`：

```json
{
  "name": "@pgg/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "files": ["*.json"]
}
```

该包不添加运行时依赖，不声明 TypeScript 入口。

- [ ] **Step 4: 创建灾害领域包元数据和入口**

创建 `packages/hazard-domain/package.json`：

```json
{
  "name": "@pgg/hazard-domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  }
}
```

先创建 `packages/hazard-domain/src/index.ts` 的入口骨架，导出迁移后两个模块的公共符号；如果实现文件尚未移动，暂时让测试保持失败，不使用空实现掩盖缺失边界。

- [ ] **Step 5: 扩展 TypeScript 检查范围**

在 `tsconfig.app.json`、`tsconfig.server.json` 和 `tsconfig.type-tests.json` 的 `include` 中加入 `packages`，但排除后续生成的构建目录。根目录仍作为构建编排入口，不创建独立 package build 命令。

- [ ] **Step 6: 运行测试确认骨架转绿**

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
pnpm run typecheck:client
pnpm run typecheck:server
```

预期：workspace 入口测试通过；现有客户端和 BFF 类型检查没有新增错误。

- [ ] **Step 7: 检查本任务范围**

运行：

```bash
git diff --check
git status --short
```

预期：只包含 workspace、包骨架、TypeScript include 和对应测试变更。不要提交；如需提交，等待用户明确授权。

### Task 2: 迁移跨语言 JSON 契约

**Files:**

- Move: `contracts/analytics-error-envelope.json` → `packages/contracts/analytics-error-envelope.json`
- Move: `contracts/analytics-hazard-data.json` → `packages/contracts/analytics-hazard-data.json`
- Move: `contracts/analytics-response-envelope.json` → `packages/contracts/analytics-response-envelope.json`
- Move: `contracts/hazard-event.json` → `packages/contracts/hazard-event.json`
- Modify: `tests/service-cross-language-hazard-contract.test.ts`
- Modify: `tests/service-hazard-event-registry.test.ts`
- Modify: `tests/service-analytics-contracts.test.ts`
- Modify: `python-analytics-service/tests/test_cross_language_hazard_contract.py`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/TESTING_BASELINE.md`

**Interfaces:**

- Produces: 唯一规范契约目录 `packages/contracts/`。
- Consumes: Task 1 的 `@pgg/contracts` workspace 元数据；不改变 JSON 内容或版本字段。

- [ ] **Step 1: 先更新测试路径并确认 RED**

将 TypeScript 测试中的 `../contracts/` 和 `readFileSync("contracts/analytics-response-envelope.json")` 改为 `../packages/contracts/`，将 Python 测试中的仓库根路径改为：

```python
Path(__file__).resolve().parents[2] / "packages" / "contracts" / "hazard-event.json"
```

运行受影响测试：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 \
  tests/service-cross-language-hazard-contract.test.ts \
  tests/service-hazard-event-registry.test.ts \
  tests/service-analytics-contracts.test.ts
pnpm run test:python
```

预期：在文件移动前，测试因新路径不存在而失败。

- [ ] **Step 2: 移动契约文件并保留内容不变**

使用 `git mv contracts packages/contracts`，确认四个 JSON 文件的内容哈希与移动前一致。不要留下根目录 `contracts/` 的兼容副本，确保只有一个规范目录。

- [ ] **Step 3: 更新格式检查和文档引用**

在 `package.json` 的 `format:check` 中将四个 `contracts/*.json` 路径替换为 `packages/contracts/*.json`。更新 README、`docs/PROJECT_SPEC.md` 和 `docs/TESTING_BASELINE.md` 中的路径，但保留“TypeScript 与 Python 共同读取语言无关 JSON”语义。

- [ ] **Step 4: 运行契约测试确认 GREEN**

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 \
  tests/service-cross-language-hazard-contract.test.ts \
  tests/service-hazard-event-registry.test.ts \
  tests/service-analytics-contracts.test.ts
pnpm run test:python
pnpm run format:check
```

预期：受影响 TypeScript 测试、Python 测试和格式检查全部通过；四个 JSON 的版本和字段内容没有变化。

- [ ] **Step 5: 搜索旧契约路径**

运行：

```bash
rg -n "(^|[\\\"`/])contracts/|parents\[2\].*contracts" \
  README.md docs src server shared tests python-analytics-service package.json
```

预期：只剩 Spec/计划中描述历史路径的文字（如果有），生产代码和测试不再读取根目录 `contracts/`。

### Task 3: 迁移灾害领域共享代码并保留兼容入口

**Files:**

- Move: `shared/hazards/hazard-event.ts` → `packages/hazard-domain/src/hazard-event.ts`
- Move: `shared/hazards/hazard-layer-registry.ts` → `packages/hazard-domain/src/hazard-layer-registry.ts`
- Modify: `packages/hazard-domain/src/index.ts`
- Replace: `shared/hazards/hazard-event.ts` with compatibility re-export
- Replace: `shared/hazards/hazard-layer-registry.ts` with compatibility re-export
- Modify: `tests/service-hazard-event-registry.test.ts`
- Modify: `tests/server-hazard-event-registry.test.ts`
- Modify: `tsconfig.app.json`
- Modify: `tsconfig.server.json`
- Modify: `tsconfig.type-tests.json`

**Interfaces:**

- Produces: `packages/hazard-domain/src/index.ts` 的稳定公共入口。
- Compatibility: 旧 `shared/hazards/*.ts` 继续导出相同符号，直到后续运行单元迁移完成。

- [ ] **Step 1: 增加包入口契约测试**

在 `tests/service-hazard-event-registry.test.ts` 增加新入口测试：

```ts
import * as hazardDomain from "../packages/hazard-domain/src/index";
import * as legacyHazardDomain from "../shared/hazards/hazard-event";

it("exports the hazard event factory from the package entrypoint", () => {
  expect(hazardDomain.createHazardEventId("usgs", "event-1")).toBe("usgs:event-1");
  expect(legacyHazardDomain.createHazardEventId).toBe(hazardDomain.createHazardEventId);
});
```

同时为图层注册表比较包入口和兼容入口的结果。运行测试，预期在移动前因新入口不存在而失败。

- [ ] **Step 2: 移动实现到共享包**

使用 `git mv shared/hazards packages/hazard-domain/src`，在 `packages/hazard-domain/src/index.ts` 写入：

```ts
export type { HazardEvent, HazardLayerId, HazardSourceId } from "./hazard-event.js";
export { createHazardEventId } from "./hazard-event.js";
export type { HazardLayerDefinition } from "./hazard-layer-registry.js";
export { HAZARD_LAYER_REGISTRY, resolveHazardLayerId } from "./hazard-layer-registry.js";
```

不要在入口中重新定义类型或复制注册表。

- [ ] **Step 3: 写入兼容 re-export**

将 `shared/hazards/hazard-event.ts` 改为：

```ts
export * from "../../packages/hazard-domain/src/hazard-event.js";
```

将 `shared/hazards/hazard-layer-registry.ts` 改为：

```ts
export * from "../../packages/hazard-domain/src/hazard-layer-registry.js";
```

兼容文件只能转导出，不能包含第二份领域实现。

- [ ] **Step 4: 更新类型检查和入口测试**

确认三个 TypeScript 配置都包含 `packages/**/*.ts`，并运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 \
  tests/service-hazard-event-registry.test.ts \
  tests/server-hazard-event-registry.test.ts
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
```

预期：新包入口与旧兼容入口的函数引用相同，客户端、BFF 和类型测试通过。

- [ ] **Step 5: 保持生产导入兼容并验证不改变行为**

本阶段不修改 `server/hazards/hazard-source.ts`、`server/hazards/source-health.ts`、`src/services/hazards/hazardAdapters.ts` 等生产文件的现有 `shared/hazards` 导入；它们统一通过兼容 re-export 使用迁移后的实现。新增测试使用 `packages/hazard-domain/src/index.ts` 入口，任何生产文件都不得直接导入 `packages/hazard-domain/src/hazard-event.ts` 这类内部路径。包名运行时导入留到 Web/BFF 构建迁移阶段，避免在根目录 Node 编译链尚未 package 化时引入运行时解析问题。

运行灾害适配、来源健康、地图和事件注册表测试，确认 canonical 字段、事件 ID 和图层回退行为不变。

### Task 4: 增加架构边界检查

**Files:**

- Create: `scripts/check-architecture.mjs`
- Modify: `tests/service-architecture-boundaries.test.ts`
- Modify: `package.json`
- Modify: `.github/workflows/quality.yml`
- Modify: `docs/PROJECT_SPEC.md`
- Modify: `docs/TESTING_BASELINE.md`

**Interfaces:**

- Produces: `check:architecture` 脚本，成功时退出码为 0，发现越界依赖时退出码为 1 并列出文件与规则。
- Consumes: `packages/contracts/`、`packages/hazard-domain/`、现有源码目录和 package 入口。

- [ ] **Step 1: 先写失败的规则测试**

让 `checkArchitecture(rootDir)` 接受仓库根目录并返回 `string[]` 错误列表。在测试中创建临时目录，写入一个 `packages/demo/src/index.ts`，内容为 `import value from "../../src/App"`，断言结果包含 `packages must not import runtime units`。

再写入缺失的 `packages/contracts/package.json`，断言结果包含 `contracts package metadata is missing`。

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
```

预期：在检查器实现前失败。

- [ ] **Step 2: 实现纯 Node 检查器**

在 `scripts/check-architecture.mjs` 使用下面的实现。它返回稳定错误列表，CLI 只在入口处设置退出码；扫描不读取 `node_modules`、`dist`、`dist-server`、`.git` 或 Python 虚拟环境：

```js
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ignoredDirectories = new Set([
  ".git",
  ".venv",
  "__pycache__",
  "dist",
  "dist-server",
  "node_modules",
]);
const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const runtimeDirectories = ["src", "server", "apps", "services", "python-analytics-service"];

function listFiles(rootDirectory) {
  if (!existsSync(rootDirectory)) return [];
  const result = [];
  for (const entry of readdirSync(rootDirectory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const entryPath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(entryPath));
    else if (sourceExtensions.has(path.extname(entry.name)) || entry.name.endsWith(".json")) {
      result.push(entryPath);
    }
  }
  return result;
}

function readImportSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /\bfrom\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /^\s*import\s+["']([^"']+)["']/gm,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

function isInside(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function checkArchitecture(rootDirectory) {
  const root = path.resolve(rootDirectory);
  const errors = [];
  const contractsMetadata = path.join(root, "packages/contracts/package.json");
  const hazardMetadata = path.join(root, "packages/hazard-domain/package.json");
  const hazardEntry = path.join(root, "packages/hazard-domain/src/index.ts");

  if (!existsSync(contractsMetadata)) {
    errors.push("contracts package metadata is missing: packages/contracts/package.json");
  }
  if (!existsSync(hazardMetadata)) {
    errors.push("hazard domain package metadata is missing: packages/hazard-domain/package.json");
  }
  if (!existsSync(hazardEntry)) {
    errors.push("hazard domain package entry is missing: packages/hazard-domain/src/index.ts");
  }
  if (existsSync(path.join(root, "contracts"))) {
    errors.push("root contracts directory must be removed after migration: contracts");
  }

  const packageRoot = path.join(root, "packages");
  for (const file of listFiles(packageRoot)) {
    if (!sourceExtensions.has(path.extname(file))) continue;
    const source = readFileSync(file, "utf8");
    for (const specifier of readImportSpecifiers(source)) {
      if (!specifier.startsWith(".")) continue;
      const resolved = path.resolve(path.dirname(file), specifier);
      for (const directory of runtimeDirectories) {
        if (isInside(resolved, path.join(root, directory))) {
          errors.push(
            `packages must not import runtime units: ${path.relative(root, file)} -> ${specifier}`,
          );
        }
      }
    }
  }

  for (const directory of ["src", "server", "shared"]) {
    for (const file of listFiles(path.join(root, directory))) {
      if (!sourceExtensions.has(path.extname(file))) continue;
      if (isInside(file, path.join(root, "shared/hazards"))) continue;
      const source = readFileSync(file, "utf8");
      for (const specifier of readImportSpecifiers(source)) {
        if (!specifier.startsWith(".")) continue;
        const resolved = path.resolve(path.dirname(file), specifier);
        if (isInside(resolved, path.join(root, "packages/hazard-domain/src"))) {
          errors.push(
            `production code must use a package entrypoint: ${path.relative(root, file)} -> ${specifier}`,
          );
        }
      }
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = checkArchitecture(process.cwd());
  if (errors.length > 0) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  }
}
```

- [ ] **Step 3: 运行规则测试确认 GREEN**

运行：

```bash
pnpm exec vitest run --pool=forks --maxWorkers=1 tests/service-architecture-boundaries.test.ts
pnpm run check:architecture
```

预期：临时目录中的违规导入被拒绝，当前仓库返回 0。

- [ ] **Step 4: 接入本地脚本和 CI**

在 `package.json` 增加：

```json
"check:architecture": "./scripts/with-node-version.sh node scripts/check-architecture.mjs"
```

把该命令加入 `test:baseline` 的类型检查之后、单元测试之前，并在 `.github/workflows/quality.yml` 的 Node 任务中显式运行一次，保证架构门禁失败时不会被测试结果掩盖。

- [ ] **Step 5: 补充规则文档**

更新 `docs/PROJECT_SPEC.md` 和 `docs/TESTING_BASELINE.md`，写明运行单元、共享包入口、禁止的依赖方向和 `pnpm run check:architecture` 的职责。不要把后续尚未完成的 `apps/web`、`apps/bff` 迁移写成已完成能力。

### Task 5: 完成整体验证和迁移记录

**Files:**

- Modify: `README.md`
- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/TESTING_BASELINE.md`
- Modify: `.superpowers/sdd/progress.md`
- Modify: `package.json`
- Test: `tests/service-architecture-boundaries.test.ts`

**Interfaces:**

- Produces: 与实际目录、脚本和门禁一致的项目说明，以及第一阶段完成/后续阶段待办记录。
- Consumes: Tasks 1–4 的共享包、路径更新和架构检查结果。

- [ ] **Step 1: 更新项目结构和待优化清单**

在 README 的项目结构中记录 `packages/contracts`、`packages/hazard-domain`、运行单元目标目录和兼容迁移状态。在 `docs/PROJECT_OPTIMIZATION_BACKLOG.md` 增加或更新“全项目运行单元与共享包架构治理”条目：第一阶段标为完成，Web/BFF/Python 物理迁移列为后续阶段。

- [ ] **Step 2: 运行完整质量门禁**

按当前项目实际环境执行：

```bash
pnpm run check:architecture
pnpm run lint
pnpm run format:check
pnpm test
pnpm run test:python
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run test:component
pnpm run build
git diff --check
```

如果环境允许，再执行受影响的 `pnpm run test:e2e`；测试失败时先判断是代码、配置还是环境问题，不用重复重跑替代定位。

- [ ] **Step 3: 检查迁移范围和构建产物**

运行：

```bash
git status --short
git diff --stat
git ls-files 'backups/**' '.env*' 'dist/**' 'dist-server/**'
```

预期：没有备份、密钥、构建产物或虚拟环境被加入版本控制；变更只涉及 Spec 约定的包、路径、门禁、测试和文档。

- [ ] **Step 4: 记录阶段进度**

在 `.superpowers/sdd/progress.md` 记录 Tasks 1–5 的实际状态、验证命令和未完成的第二阶段运行单元迁移，不把兼容 re-export 删除或 Web/BFF 目录迁移提前标记为完成。

- [ ] **Step 5: 提交授权门**

实现和验证结束后停止在干净的可审查变更上。只有用户明确要求“提交代码”时，才执行：

```bash
printf '%s\n' 'refactor(architecture): govern runtime and shared package boundaries' | pnpm exec commitlint
pnpm commit
```

提交前确认暂存区只包含本次架构治理文件，不提交缓存、构建产物、虚拟环境或用户已有改动。

## 交付后的后续阶段

第一阶段完成后另开计划处理运行单元物理迁移：

1. 将 React/Vite 迁入 `apps/web`，同步 Vite、Playwright、组件测试和 Docker 构建上下文。
2. 将 Express BFF 迁入 `apps/bff`，拆分入口、路由、数据库和服务配置。
3. 将 Python 服务迁入 `services/analytics`，保持 Docker healthcheck、启动脚本和 Python 测试入口兼容。
4. 评估 `shared/logging.ts` 的浏览器/Node 适配包设计。

这些阶段不在本计划内，必须在第一阶段门禁稳定后分别设计、测试和审核。
