# AGENTS.md

## 高优先级规则

- 本文件是当前项目的高优先级协作约束。
- 用户最新、明确的指令优先级最高；如与本文件冲突，以用户指令为准。
- 默认只修改当前需求涉及的文件，保留工作区中与当前需求无关的既有变更。
- 每次编码前先运行 `git status --short`，识别用户已有改动。
- 每次需求、功能或缺陷修复都应先选择适用的 Superpowers 流程完成拆解、规划和验证；计划和进度记录使用中文。
- 只有需求范围、方案或长期取舍不明确时，才使用 Grill Me（`grilling`）澄清决策；用户明确的简单需求不应被无关问答阻塞。
- 先检查可用 skill，再按当前技术栈选择最佳实践 skill；缺少必要 skill 时，使用安装流程补齐，并记录其适用范围。
- 复杂需求拆成可验证任务；有两个或以上互不修改相同文件的独立任务时，优先使用子智能体执行、任务级复核和最终整体复核。
- 子智能体实现必须遵循“独立实现子智能体 + 任务级复核 + 最终整体复核”的流程。
- 并行开发的独立功能默认使用 Git worktree 隔离；在独立 worktree 中完成实现、测试与复核，再按用户明确指令处理集成或提交。
- 开发过程中遇到失败，先定位根因，再修改；不得用反复重跑代替分析。
- 不记录、打印、提交或打包密钥、令牌、密码、个人数据和生产配置；新增环境变量必须同步提供安全的示例与文档。
- 仅执行当前需求直接需要的变更；依赖升级、架构重构和生成文件必须有明确理由并在交付中说明。

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
- push、创建或合并 PR、发布、部署、数据库迁移，以及对外发送消息都需要用户明确授权。

## Superpowers 与需求流程

- 新需求先判断是正式规格、轻量规格还是既有规格的增量更新。
- 跨模块、用户可见、高风险或预计多步骤的需求，先生成并评审 Spec 设计文档，再生成可执行任务计划；Spec 和计划分别保存到 `docs/superpowers/specs/` 与 `docs/superpowers/plans/`。
- 小型、边界明确的修复使用轻量规格：在计划或提交说明中写清目标、范围、验收条件和验证命令，避免为一行改动创建空泛文档。
- 多步骤需求默认使用适用的 `brainstorming`、`writing-plans`、`test-driven-development`、`subagent-driven-development`、`verification-before-completion` 和 `requesting-code-review` 流程；不适用时说明原因。
- 适用时使用项目技术栈 skill：React、TypeScript、Vite、Express、Mapbox、Recharts、FastAPI、Playwright 等。
- 实现前先阅读相关文件和现有模式；不要凭假设重写模块。
- 新功能或缺陷修复默认必须遵循 TDD：先写并运行能够失败的测试（RED），再写最小实现使其通过（GREEN），随后只在测试保护下重构；仅文档、格式或纯配置调整可不新增测试，但仍须执行适用验证。
- 单元和组件测试使用 Vitest；Express BFF 使用项目既有 Node 测试；Python 服务使用项目既有 Python 测试；端到端用户流程使用 Playwright。测试类型必须匹配风险与组件边界，不以端到端测试替代所有测试。
- 完成前必须自主验收，并提供命令、实际输出和必要的浏览器或接口证据；不以“应该可以”代替验证。

## 编码与格式

- 使用 TypeScript 类型、`unknown`、类型守卫、判别联合和 `import type`；避免新增无必要的 `any`。
- 遵循现有目录、命名、模块边界和 API 兼容约定。
- 不做无关重构，不覆盖或回滚用户变更。
- 手动编辑使用 `apply_patch`；保持 ASCII，除非项目文件已有明确的非 ASCII 内容。
- Prettier 只用于格式化或检查，不把自动格式化当作功能验证。
- 新增或修改公开接口时，明确输入、输出、错误语义、兼容性和调用方；必要时更新契约测试与文档。
- 每次修改应保持可回滚、可审查；避免把重构、行为变更和依赖升级混在同一提交。

## 自动化验证

编码后的自动化验证必须使用项目内配置，并根据改动范围执行：

```bash
pnpm run lint
pnpm run format:check
pnpm test
pnpm run test:component
pnpm run test:e2e
pnpm run test:python
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run build
git diff --check
```

- 测试、类型检查或构建失败时，先判断是代码问题、测试问题、配置问题还是环境问题，并记录结论。
- 只改动格式时至少运行 Prettier 检查和 `git diff --check`。
- 拼写检查必须使用项目内已配置的 Spellcheck 命令；当前项目尚未配置该命令，在引入并验证配置前不得声称已完成 Spellcheck。
- 本地验证与 CI 应共享同一批脚本或其明确子集；新增质量门禁时同步更新 CI、文档和本文件。
- 提交前额外运行 commitlint；未经用户明确要求，不自动提交。

## 标准化产物沉淀

- 可复用的工作流、检查表、脚本、测试夹具和 skill 在至少两次独立需求中证明有效后，再沉淀为项目标准；产物必须写明触发条件、输入、输出、限制和验证方式。
- 新的架构决策、外部服务边界、数据契约和安全规则应更新相应 Spec、设计文档或运行手册，避免只存在于对话记录中。
- 每次迭代结束时，识别能降低下一次交付成本的规则或自动化；只沉淀稳定、可验证且不过度限制后续开发的内容。

## 项目约定

- 本项目是 Vite + React + TypeScript 前端、Express BFF 和 FastAPI 分析服务组合项目。
- `src/services/` 是业务请求和外部服务的主要实现边界。
- `tests/` 包含自动化测试；修改公开行为时同步添加或更新测试。
- 前端构建产物不得包含模型 Key、DisasterAware 凭据、Python 服务凭据等服务端秘密。
- 用户要求的回复、计划、进度和开发说明默认使用中文。
