# 测试基线

## 目的

本文档记录项目当前可重复执行的自动化测试入口、测试边界和基线数量。它用于本地开发和后续 CI 接入，不代表已经覆盖所有生产风险。

## 命令分层

| 命令                      | 类型             | 当前职责                                                             |
| ------------------------- | ---------------- | -------------------------------------------------------------------- |
| `pnpm test`               | 单元测试别名     | 等价于 `pnpm run test:unit`                                          |
| `pnpm run test:unit`      | 单元测试         | 串行执行 BFF Node 原生测试和前端 Service Vitest 测试                 |
| `pnpm run test:bff`       | BFF 单元测试     | 编译服务端测试产物，再运行 Node 原生测试                             |
| `pnpm run test:services`  | Service 单元测试 | 运行 `tests/service-*.test.ts` 的 Vitest 测试                        |
| `pnpm run test:component` | React 组件测试   | 使用 Vitest、React Testing Library 和 jsdom 测试用户可观察的组件行为 |
| `pnpm run test:e2e`       | 浏览器冒烟测试   | 启动本地生产服务，用 Playwright 验证首页关键流程                     |
| `pnpm run test:baseline`  | 完整质量基线     | 依次执行 lint、格式、前后端类型检查、unit、component、e2e 和 build   |

任一命令失败都会终止后续基线步骤。项目命令通过 `scripts/with-node-version.sh` 使用 `.nvmrc` 中的 Node.js 版本。

## 当前数量

截至 2026-09-06，基线包含：

- BFF 单元测试：29 项。
- Service 单元测试：36 项。
- React 组件测试：8 项。
- Playwright E2E：1 项。
- 合计：74 项自动化测试。

独立执行的 Python 自动化测试：22 项，其中模型和端点单元测试 10 项、FastAPI HTTP 路由测试 7 项、预测/风险/质量结果语义测试 5 项；它们目前不计入上述根目录基线总数。

## 测试边界

单元测试验证 BFF provider、AI 路由和流式转换，以及前端 HTTP、灾害数据适配、地图 GeoJSON/LOD、灾害强度字段读取、Analytics 结果展示适配和 AI Service。组件测试验证状态面板、统计概览折线图、数据质量面板和 Mapbox/Worker mock 下的地图热力图切换。E2E 验证生产构建首页加载、灾害类型筛选、AI 助手打开和 mock 流式消息展示。

E2E 通过 Playwright route mock 隔离 DisasterAware、公开灾害源、Mapbox 和 AI provider，不访问真实第三方服务，也不要求本地配置真实账号或模型 Key。失败时保留截图，重试时保留 trace。

当前尚未纳入完整基线的范围：Python 核心算法测试、Python 契约测试接入统一命令、桌面与移动端视觉回归、所有弹窗和路由流程、真实外部服务集成测试，以及 CI/CD 中的自动执行。

## 已知非阻塞提示

- 若当前终端不是 Node.js 20.19.x，pnpm 可能先输出 engine warning；项目脚本会通过 nvm 自动切换到 `.nvmrc` 版本。
- Vite 构建会提示 Mapbox vendor chunk 较大，这是包体积治理待办，不影响当前测试通过。
- 依赖安装可能提示弃用包或被 pnpm 忽略的构建脚本；应在依赖治理任务中单独处理。

## 建议执行顺序

日常修改可先运行对应层级的测试，提交前运行：

```bash
pnpm run test:baseline
```

提交代码仍需遵循项目约束：不自动提交；只有用户明确要求提交时，才使用 `pnpm commit` 并通过 commitlint 校验提交信息。
