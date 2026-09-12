# README 收尾梳理设计

## 目标

将根目录 `README.md` 与 `python-analytics-service/README.md` 收敛为准确、可执行且便于项目展示的开发文档。根 README 保留中英双语；Python 分析服务 README 保持中文为主。

## 范围

### 根 README

- 用相同章节结构提供英文与中文内容：项目概览、能力、架构、运行要求、快速启动、配置、安全边界、测试、项目结构和当前状态。
- 如实说明 React/Vite 前端、Express BFF、FastAPI 分析服务与外部数据及 AI Provider 的职责边界。
- 更新状态归属为 `MapStateProvider` 和 `UIStateProvider`；明确 App 只做授权初始化、Provider 组合与渲染选择。
- 把报告导出说明更新为 JSON 下载。
- 说明项目当前未部署；Docker Compose 仅是本地完整栈启动路径。
- 列出可执行的质量命令、GitHub Actions 覆盖范围，以及受限沙箱运行 `pnpm test` 时 BFF 监听 `0.0.0.0` 的已知环境限制。
- 保留配置示例，但只列公开前端变量与服务端变量名称，不包含真实凭据。

### Python 分析服务 README

- 说明 FastAPI 服务边界：浏览器直接访问 `/api/v1/*`，Express BFF 不代理分析请求。
- 更新本地启动、Docker 启动、管理员令牌、CORS 与日志配置说明。
- 以接口组而不是逐个实现细节介绍 API；保留完整路由表。
- 用 `pnpm run test:python` 作为首选测试入口，说明其覆盖范围及手工脚本的定位。
- 使目录树匹配应用工厂、routes、schemas、services、core 与 analytics 模块。

## 非目标

- 不修改产品代码、接口行为、Docker 配置、CI 配置或部署策略。
- 不新增第三方文档系统，不拆分新的运行手册。
- 不把仍未实施的报告闭环、跨实例状态持久化或公网发布能力写为已完成。

## 质量标准

- 两份 README 的命令、端口、变量名、测试数量和边界描述与当前代码和脚本一致。
- 英文与中文根 README 章节内容表达同一事实，不保留旧的 HTML 报告说法。
- 运行 Prettier 检查与 `git diff --check`；使用文本检索确认未保留失真的关键描述。
