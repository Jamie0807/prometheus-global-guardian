# 项目工程治理实施计划

> **子智能体执行要求：** 使用 `subagent-driven-development`，由独立实现子智能体完成，再由独立复核子智能体检查。计划、进度和报告使用中文。

## 目标

为当前 Vite + React + TypeScript + Express 项目建立稳定的 pnpm 工具链，确保编码验证统一使用 ESLint、Prettier 和测试，并确保用户明确要求提交时通过 commitlint 和 `pnpm commit` 完成。

## 约束

- 不自动执行 `git add`、`git commit` 或 push。
- 只有用户明确要求提交代码时，才允许执行 `pnpm commit`。
- 保留现有 npm scripts 的功能语义，新增 pnpm 可用的等价命令。
- 不修改业务代码，不覆盖工作区已有的业务变更。
- 提交信息使用 Conventional Commits。

## 文件

- 新增：`commitlint.config.cjs`
- 新增：`.prettierrc.json`、`.prettierignore`
- 新增：`.husky/pre-commit`、`.husky/commit-msg`
- 修改：`package.json`、`package-lock.json`、`pnpm-lock.yaml`

## 任务

- [ ] 补充 Prettier、commitlint、Commitizen/cz-git、Husky 和 lint-staged 配置。
- [ ] 增加 `format:check`、`lint:staged` 和 `commit` 命令，并保留现有 lint、test、build 命令。
- [ ] 使用现有 `package-lock.json` 迁移生成 `pnpm-lock.yaml`，确认依赖可安装。
- [ ] 验证 `pnpm run lint`、`pnpm exec prettier --check .`、相关测试和 commitlint。
- [ ] 确认没有产生提交。

## 验收

- [ ] `pnpm commit` 指向 Commitizen/cz-git，而不是直接执行 `git commit`。
- [ ] `pnpm exec commitlint` 能拒绝不符合 Conventional Commits 的信息。
- [ ] `pnpm exec prettier --check .` 可执行且不会改写文件。
- [ ] ESLint、Prettier、测试和构建命令记录在 `AGENTS.md` 与 `README.md` 的开发说明中。
- [ ] 工作区没有自动产生 commit 或 push。
