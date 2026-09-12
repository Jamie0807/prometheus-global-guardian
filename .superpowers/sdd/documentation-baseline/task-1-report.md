# Task 1 测试事实报告

执行日期：2026-09-12
执行目录：`/Users/jamie/Documents/文稿 - Jamie的MacBook Pro/code/prometheus-global-guardian/.worktrees/documentation-baseline`

## 静态脚本与 CI 事实

- `package.json` 的测试入口为：
  - `test:bff`：先执行 `build:server:test`，再以 Node 原生测试运行 5 个编译后的 BFF 测试文件：`ai-provider`、`ai-router`、`ai-stream`、`server-auth`、`request-boundaries`。
  - `test:services`：Vitest，`vitest.config.ts` 限定 `tests/service-*.test.ts`；当前静态匹配 15 个测试文件。
  - `test:component`：Vitest + jsdom，`vitest.component.config.ts` 限定 `tests/component/**/*.test.tsx`；当前静态匹配 15 个测试文件。
  - `test:e2e`：Playwright，`playwright.config.ts` 的 `testDir` 为 `tests/e2e`，当前静态匹配 1 个 `*.spec.ts` 文件；`webServer` 先运行 `pnpm run build`，再用 `PORT=4174 pnpm start` 启动服务。
  - `test:python`：`scripts/test-python.sh` 优先使用 `python-analytics-service/.venv/bin/python`，否则使用 `python3`，并以 unittest 发现 `python-analytics-service/tests/test_*.py`；当前静态匹配 6 个测试模块。
  - `test:baseline`：依次运行 lint、Prettier、客户端/服务端/契约类型检查、`test:unit`（BFF + services）、component、E2E 和 build。
- `.github/workflows/quality.yml` 在 `pull_request` 与向 `main` 的 `push` 触发：
  - `frontend-bff` job 使用 `ubuntu-latest`、`pnpm 10.15.1`、`.nvmrc` 指定的 Node，执行冻结安装、`pnpm exec playwright install --with-deps chromium` 和 `pnpm run test:baseline`；失败时上传 Playwright 产物。
  - `python` job 使用 `ubuntu-latest`、`.nvmrc` 指定的 Node 与 Python 3.13，安装 `python-analytics-service/requirements.txt` 后运行 `pnpm run test:python`。

## 执行命令与实际结果

| 命令 | 退出码 | 本次实际最终输出的测试数量 | 结论 |
| --- | ---: | --- | --- |
| `pnpm run test:services` | 1 | 未启动 Vitest（0 个测试结果） | 环境失败 |
| `pnpm run test:component` | 1 | 未启动 Vitest（0 个测试结果） | 环境失败 |
| `pnpm run test:python` | 1 | `Ran 12 tests`；7 个通过、5 个 import error | 环境失败 |
| `pnpm run test:bff` | 1 | 未进入 Node 测试阶段（0 个测试结果） | 环境失败 |
| `pnpm run test:e2e` | 1 | 未启动 Playwright（0 个测试结果） | 环境失败 |

按任务简报实际执行的命令：

```sh
pnpm run test:services
pnpm run test:component
pnpm run test:python
pnpm run test:bff
pnpm run test:e2e
```

## 失败诊断

### Node 测试环境

该 worktree 内没有 `node_modules`，`../node_modules` 也不存在；仓库主目录的 `../../node_modules` 不会被该 worktree 的包解析自动采用。因而四个 Node 测试入口均在测试执行前失败：

- services/component：`./scripts/with-node-version.sh: line 58: vitest: command not found`
- BFF：构建阶段报 `tsc: command not found`，因此后续 `node --test` 没有执行；这不是 `listen EPERM`，没有可记录的 BFF 通过/失败测试数。
- E2E：`playwright: command not found`，因此 Playwright 未构建或启动 web server，也没有测试结果。

环境还显示 Node `v24.16.0`，而 `package.json` 要求 `>=20.19 <21`，`.nvmrc` 为 `20.19.0`。即使安装依赖，运行基线前也应使用项目指定的 Node 20.19.0。

### Python 测试环境

脚本未找到本地 `.venv`，改用 macOS Command Line Tools 的 `Python 3.9.6`。该解释器未安装 `requirements.txt` 中所需依赖，导致 5 个测试模块无法导入：

- `test_api_contract`：缺少 `pandas`
- `test_api_routes`：缺少 `fastapi`
- `test_app_factory`：缺少 `fastapi`
- `test_cross_language_hazard_contract`：缺少 `pydantic`
- `test_result_semantics`：缺少 `numpy`

unittest 的最终输出为 `Ran 12 tests in 0.002s` 与 `FAILED (errors=5)`；点号输出显示其余 7 个已发现测试通过。CI 则使用 Python 3.13 并先安装 requirements，因此本地结果不能代表 CI 测试断言状态。

## 范围与复核

- 本任务未修改项目源代码、测试或配置；仅按任务要求写入本报告。
- `git diff --check` 在报告写入后的工作区检查未输出错误；工作区还包含已有的未跟踪计划、设计文档和任务目录。
- 首轮未执行依赖安装或重试；依赖恢复后按任务要求完成 Node 复测。BFF 已尝试端口监听并明确得到 `EPERM`，E2E 则在 web server 命令加载 pnpm 时失败，详见以下复测诊断。

## 依赖恢复后的 Node 复测（本次 Node 基线）

worktree 的 `node_modules` 已链接至主工作区后，按以下命令重新执行 Node 测试入口：

```sh
pnpm run test:services
pnpm run test:component
pnpm run test:bff
pnpm run test:e2e
```

| 命令 | 退出码 | 实际最终输出 | 结论 |
| --- | ---: | --- | --- |
| `pnpm run test:services` | 0 | 15 个文件、177 项通过 | 通过 |
| `pnpm run test:component` | 0 | 15 个文件、59 项通过 | 通过 |
| `pnpm run test:bff` | 1 | 74 项：40 项通过、34 项失败 | 仅受监听权限限制 |
| `pnpm run test:e2e` | 1 | Playwright 测试未启动（0 项测试结果） | web server 启动环境失败 |

### BFF 复测诊断

`build:server:test` 已成功完成，随后 Node 原生测试运行完 74 项。40 项通过；34 项失败均来自 `server-auth.test.js` 中需要启动 Express 测试应用的用例，错误一致为 `listen EPERM: operation not permitted 0.0.0.0`（`code: EPERM`）。没有观察到断言失败、编译错误或其他失败类型。因此 BFF 的实际汇总应记录为 **40 通过、34 个沙箱端口监听限制失败**，不能把该 34 项归因为代码回归。

### E2E 复测诊断

Playwright 已被调用，但配置的 `webServer` 命令 `pnpm run build && PORT=4174 pnpm start` 未能启动，因此没有执行浏览器测试。包装器将测试进程切换到 Node `v20.19.0`；同时全局 `pnpm 10.15.1` 报告其需要 Node `>=22.13`，并在加载时因 Node 20 没有 `node:sqlite` 抛出 `ERR_UNKNOWN_BUILTIN_MODULE`。这是 pnpm 与项目 Node 基线之间的本地工具链不兼容，不是应用构建、Playwright 断言或端口监听结果。

### Python 基线限制

Python 3.13 当前不可用。之前以 Python 3.9.6 运行 `test:python` 得到的 `Ran 12 tests`、5 个导入错误，**不作为基线测试结果**，仅保留为缺少 Python 依赖的环境诊断。CI 的 Python job 使用 3.13 并安装 requirements；需在匹配的 Python 3.13 环境中重新运行 `pnpm run test:python` 后，才能记录 Python 基线数量。
