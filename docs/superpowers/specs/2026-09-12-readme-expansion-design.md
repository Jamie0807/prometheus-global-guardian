# README 恢复式完善设计

## 目标

以 `b6a2b8d` 中的完整根 README 为内容基底，恢复项目展示和开发交接所需的大部分信息，并逐项修正为当前代码事实。根 README 继续保留中英双语；Python 分析服务 README 保持现有服务手册，不在本任务修改。

## 内容策略

- 恢复并更新项目概览、核心能力、系统架构、服务拓扑、技术栈、运行要求、配置、启动、测试、Docker、AI、API、数据源、安全、运行说明和目录结构。
- 保留有解释价值的具体能力，例如多源灾害、Mapbox 图层、Analytics、AI 流、BFF 安全边界和 Python 服务。
- 删除重复、历史实施过程、无对应代码的承诺和过深的实现细节；英文与中文章节表达同一事实。

## 当前事实

- React/Vite 浏览器经 Express BFF 访问授权、灾害和 AI；浏览器直接访问 FastAPI `/api/v1/*`。
- Map 状态归 `MapStateProvider`，UI 页面与弹窗归 `UIStateProvider`；App 不再中转数据或可见性布尔值。
- 报告导出是 JSON 下载，不是 HTML。
- GitHub Actions 分别运行前端/BFF 基线和 Python 测试；当前组件、Service 和 Python 测试基线分别为 59、177、39 项。
- 当前不部署；Docker Compose 仅描述本地完整栈启动。
- 受限沙箱运行 BFF 监听测试可能出现 `listen EPERM`，不应作为产品回归描述。

## 验收

- 恢复版根 README 的信息量接近旧完整版本，但不保留失真内容。
- 不出现 HTML 报告、旧 App 状态中转、浏览器凭据或已部署承诺。
- `pnpm run format:check` 与 `git diff --check` 通过。
