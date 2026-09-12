# 文档与测试基线核验设计

## 目标

使持续维护的项目说明文档准确反映 2026-09-12 `main` 分支的代码、脚本、测试数量和 CI 行为，同时保留带日期的历史计划、设计和过程记录原貌。

## 范围与分类

持续维护文档包括根目录 `README.md`、`python-analytics-service/README.md`、`docs/TESTING_BASELINE.md`、`docs/PROJECT_OPTIMIZATION_BACKLOG.md` 与 `AGENTS.md`。`docs/superpowers/` 和 `.superpowers/` 中的带日期计划、设计、brief 与进度记录是当时需求的历史档案，只审阅其存在性和引用，不修改内容。

本次必须更新 `docs/TESTING_BASELINE.md`：以当前可执行命令及其实际输出替换 2026-09-08 的测试数量、覆盖描述和基线执行顺序。完整 Node 基线仍不包含 Python 测试，因此文档必须明确 Python 是 CI 中的独立 job。

## 数据来源与一致性规则

测试数量以本次在隔离 worktree 中运行的测试工具最终摘要为准，不能以测试文件数量或 README 中的旧记录推算。命令职责以 `package.json` 为准，CI 行为以 `.github/workflows/quality.yml` 为准，服务路由、环境变量和安全边界以实现代码与配置为准。

审阅持续维护文档时，逐项比对以下事实：测试命令、Node/Python 版本与 CI、测试范围和数量、当前不部署状态、服务拓扑、运行入口、环境变量、架构治理完成项与待办。事实一致的文档不做无意义改写；发现过时陈述则以最小改动修正，并在最终报告中列出。

## 实施与验证

先在现有依赖可用的前提下执行 Service、组件、Python、BFF、E2E 与静态质量入口；若 BFF 端口绑定受沙箱限制，记录为环境限制，不将其计为产品测试失败。再更新测试基线文档和确有过时内容的持续维护文档。

文档改动完成后执行 `pnpm run format:check` 与 `git diff --check`。最终再次核验文档中的命令、数量和 CI 描述与脚本、配置、实际输出一致。

## 不做的事情

不改变应用行为、测试实现、CI 配置、依赖或历史需求文档；不提交、合并或删除分支，除非用户另行明确要求。
