# Task 2 测试基线说明更新报告

执行日期：2026-09-12
执行目录：`/Users/jamie/Documents/文稿 - Jamie的MacBook Pro/code/prometheus-global-guardian/.worktrees/documentation-baseline`

## 改动范围

仅修改 `docs/TESTING_BASELINE.md`。开始前的 `git status --short` 已存在以下非本任务改动，均未修改或回退：

- ` M docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- `?? .superpowers/sdd/documentation-baseline/`
- `?? docs/superpowers/plans/2026-09-12-documentation-baseline.md`
- `?? docs/superpowers/specs/2026-09-12-documentation-baseline-design.md`

## 改动依据

已阅读计划 Task 2（`docs/superpowers/plans/2026-09-12-documentation-baseline.md` 第 53--72 行）和 Task 1 事实报告。文档内容以 `package.json` 的脚本边界和 `.github/workflows/quality.yml` 的 CI job 为准：

- `test:baseline` 顺序执行 lint、Prettier、客户端/服务端/契约类型检查、`test:unit`、组件、E2E 和构建；因此它是完整 Node 基线，包含 `typecheck:contracts`，不包含 Python。
- CI 将 Node 基线放入 `frontend-bff` job，并将 Python 3.13、依赖安装和 `test:python` 放入独立 `python` job。
- Task 1 的依赖恢复后复测为：Service 15 文件、177/177 通过；组件 15 文件、59/59 通过；BFF 74 项中 40 项通过、34 项仅因 `listen EPERM: operation not permitted 0.0.0.0` 失败。
- E2E 配置只匹配 1 个 `*.spec.ts`，但本次实际执行为 0 项：Node 20.19.0 下 pnpm 10.15.1 加载缺少 `node:sqlite`，导致 `webServer` 未启动。
- Python 3.13 在本环境不可用；Python 3.9 的 `Ran 12 tests`、5 个导入错误只作为环境诊断，未写作基线结果。保留 Python 39 时明确为当前代码最近一次已验证基线，非本 worktree 重跑结果。

## 文档结果

- 用按范围的表格替代过期数量，并分别写出配置的测试文件或用例与本次实际工具输出。
- 删除合并 Node 通过总数，以免掩盖 BFF 的受限沙箱结果和未执行的 E2E。
- 补充 BFF 端口绑定与 E2E `node:sqlite` 的可复现环境限制，明确它们不分别代表断言回归或应用构建失败。
- 将 Python unittest 覆盖范围、39 项基线的来源和 CI 的独立执行方式写明。

## 验证

执行：

```sh
pnpm exec prettier --write docs/TESTING_BASELINE.md
git diff --check
```

实际输出：

```text
docs/TESTING_BASELINE.md 31ms
```

`git diff --check` 没有输出，退出码为 0。未运行测试套件：本任务只更新文档，测试事实来自 Task 1 的已执行结果。

## 最终复核文案修正

- 将目的说明中的“后续 CI 接入”改为“现有 CI 质量工作流”，准确反映项目已有的 CI 使用。
- 将 CI 描述改为质量工作流在各自触发条件下分别运行 Node 基线与 Python 测试，并明确该描述不表示分支保护已将它们设为 required checks。

验证命令：

```sh
pnpm exec prettier --write docs/TESTING_BASELINE.md
git diff --check
```

实际结果：Prettier 输出 `docs/TESTING_BASELINE.md 23ms (unchanged)`，退出码为 0；`git diff --check` 无输出、退出码为 0。未提交。
