# 最小 CI 门禁与 Python 测试入口设计

## 目标

为仓库建立一个最小、可复现的 GitHub Actions 质量门禁，并提供本地与 CI 共用的 Python 测试入口。门禁应在 Pull Request 和合并到 `main` 后验证 Node/BFF 与 Python 分析服务的现有自动化测试。

## 范围

- 新增 `.github/workflows/quality.yml`。
- 新增根目录命令 `pnpm run test:python`。
- 更新测试相关文档，说明本地入口、CI 责任和测试边界。

本次不调整产品功能、部署流程、Python 依赖版本或 `test:baseline` 的 Node 测试范围。

## 工作流

工作流在下列事件运行：

- 所有 Pull Request。
- 推送到 `main`。

工作流仅需要 `contents: read` 权限，并包含两个并行任务：

1. `frontend-bff` 使用 `.nvmrc` 中的 Node 20.19.0 与 `packageManager` 中的 pnpm 10.15.1，执行 `pnpm install --frozen-lockfile` 与 `pnpm run test:baseline`。
2. `python` 使用 Python 3.13，安装 `python-analytics-service/requirements.txt` 后执行 `pnpm run test:python`。

两个任务分别缓存 pnpm store 与 pip 下载内容，缓存键依赖 `pnpm-lock.yaml` 和 Python requirements 文件。

## Python 测试入口

`pnpm run test:python` 从仓库根目录进入 `python-analytics-service`，执行：

```bash
python -m unittest discover -s tests -p 'test_*.py'
```

该命令运行 26 个不依赖已启动服务的 Python API 契约、路由和结果语义测试。它保持在 `test:baseline` 之外，因此日常 Node 开发不要求本地存在 Python 环境；CI 通过单独的 Python 任务强制执行该检查。

## 失败诊断

`frontend-bff` 任务失败时上传 Playwright 的 `test-results` 与 `playwright-report`，保留 7 天。Python 测试失败的完整 unittest 输出由 GitHub Actions 日志保留，不额外生成测试报告格式。

## 文档与验证

根目录 README、Python 服务 README 和 `docs/TESTING_BASELINE.md` 会使用统一入口描述 Python 测试，记录当前 26 个 Python 测试和 CI 的双任务边界。

实现完成后在本地验证：

```bash
pnpm run test:python
pnpm run format:check
pnpm run test:baseline
git diff --check
```

GitHub Actions 的事件触发与工件上传由首次推送后的远程运行验证。
