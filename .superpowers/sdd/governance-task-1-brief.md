## Task 1

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
