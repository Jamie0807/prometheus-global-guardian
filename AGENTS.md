# AGENTS.md

## 高优先级规则

- 本文件是当前项目的高优先级协作约束。
- 用户最新、明确的指令优先级最高；如与本文件冲突，以用户指令为准。
- 默认只修改当前需求涉及的文件，保留工作区中与当前需求无关的既有变更。
- 每次编码前先运行 `git status --short`，识别用户已有改动。
- 每次需求、功能或缺陷修复都应先使用适用的 Superpowers 流程拆解、规划和验证；计划和进度记录使用中文。
- 复杂需求拆成可验证任务；有两个或以上独立任务时，优先使用子智能体执行和复核。
- 子智能体实现必须遵循“独立实现子智能体 + 任务级复核 + 最终整体复核”的流程。
- 新需求默认使用 Git worktree 隔离开发；在独立 worktree 中完成实现、测试与复核，再按用户明确指令处理集成或提交。
- 开发过程中遇到失败，先定位根因，再修改；不得用反复重跑代替分析。

## Git 与提交

- 编码完成后不得自动执行 `git add`、`git commit`、push、创建 PR 或修改 Git 历史。
- 只有用户明确要求提交代码时，才允许提交。
- 用户要求提交时，使用 `pnpm commit` 完成提交，不直接调用 `git commit`。
- 提交前先使用 commitlint 校验提交信息：

  ```bash
  printf '%s\n' 'type(scope): subject' | pnpm exec commitlint
  ```

- 提交信息遵循 Conventional Commits，例如 `feat:`、`fix:`、`docs:`、`refactor:`、`test:`、`build:`、`chore:`。
- 提交主题（`type(scope): subject` 的 `subject`）必须使用英文，除非用户明确要求使用其他语言。
- 提交前确认暂存区只包含本次需求文件，不提交 `node_modules`、缓存、临时文件、构建产物或未确认的生成物。
- 不执行 `git reset --hard`、`git checkout --`、强制推送等破坏性操作，除非用户明确要求并确认。

## Superpowers 与需求流程

- 新需求先判断是正式规格、轻量规格还是既有规格的增量更新。
- 多步骤需求默认使用 `brainstorming`、`writing-plans`、`test-driven-development`、`subagent-driven-development`、`verification-before-completion` 和 `requesting-code-review`。
- 适用时使用项目技术栈 skill：React、TypeScript、Vite、Express、Mapbox、Recharts、FastAPI、Playwright 等。
- 实现前先阅读相关文件和现有模式；不要凭假设重写模块。
- 新功能或缺陷修复默认必须遵循 TDD：先写并运行能够失败的测试（RED），再写最小实现使其通过（GREEN），随后只在测试保护下重构；仅文档、格式或纯配置调整可不新增测试，但仍须执行适用验证。
- 完成前必须提供命令和实际输出作为验证证据，不以“应该可以”代替验证。

## 编码与格式

- 使用 TypeScript 类型、`unknown`、类型守卫、判别联合和 `import type`；避免新增无必要的 `any`。
- 遵循现有目录、命名、模块边界和 API 兼容约定。
- 不做无关重构，不覆盖或回滚用户变更。
- 手动编辑使用 `apply_patch`；保持 ASCII，除非项目文件已有明确的非 ASCII 内容。
- Prettier 只用于格式化或检查，不把自动格式化当作功能验证。

## 自动化验证

编码后的自动化验证必须使用当前项目工具，并根据改动范围执行：

```bash
pnpm run lint
pnpm run format:check
pnpm test
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run build
git diff --check
```

- 测试、类型检查或构建失败时，先判断是代码问题、测试问题、配置问题还是环境问题，并记录结论。
- 只改动格式时至少运行 Prettier 检查和 `git diff --check`。
- 提交前额外运行 commitlint；未经用户明确要求，不自动提交。

## 项目约定

- 本项目是 Vite + React + TypeScript 前端、Express BFF 和 FastAPI 分析服务组合项目。
- `src/services/` 是业务请求和外部服务的主要实现边界。
- `tests/` 包含自动化测试；修改公开行为时同步添加或更新测试。
- 前端构建产物不得包含模型 Key、DisasterAware 凭据、Python 服务凭据等服务端秘密。
- 用户要求的回复、计划、进度和开发说明默认使用中文。
