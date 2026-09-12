# 项目待优化清单

最近核对日期：2026-09-12。本文档以当前 `main` 分支代码、自动化测试脚本、GitHub Actions 与最近提交为准；已完成表示代码和验证入口已经落地，不表示项目已经部署。

## 当前判断

项目已具备 React + Vite 前端、Express BFF、FastAPI 分析服务、多源灾害聚合、Mapbox 地图、Analytics 看板与 AI 助手。当前适合结束本轮架构治理并整理简历；不部署的前提下，剩余事项不阻塞演示或代码归档。

- 前端业务请求统一收敛在 `src/services/`；Analytics、Hazard 和通用 HTTP 数据在进入领域层前均从 `unknown` 经运行时解析器校验。
- Analytics 灾害请求使用 TypeScript 与 Python 共用的 JSON fixture；两端已对字段默认值、长度、坐标、数值、未知字段和非有限数的接受边界对齐。
- BFF 仅代理声明的 DisasterAware 路由，并具备请求边界、服务端鉴权、超时、限流和脱敏错误契约；Python 管理接口已受令牌保护。
- AI 流式会话已支持取消、失败终态、请求隔离、历史预算和手动重试；不提供自动续传或跨实例会话治理。
- 地图与 UI 导航状态已分别由 `MapStateProvider` 和 `UIStateProvider` 归属；组件局部状态与跨实例持久化仍不在本轮范围内。
- 质量门禁包含 lint、格式、三项 TypeScript 类型检查、BFF/Service/组件/E2E 测试、构建及 Python unittest。GitHub Actions 分别运行前端/BFF 基线和 Python 测试。
- 本地 `pnpm test` 的 BFF 监听用例会受受限沙箱影响而出现 `listen EPERM`；这是运行环境限制。独立 Service、组件、Python 和构建门禁可在当前环境通过。

## 已完成能力

| 优化项                     | 当前结果                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 前后端错误与调试分级       | React、BFF 与 Python 使用统一日志等级和安全上下文；生产界面不展示原始异常或组件栈。                                                    |
| Python 服务结构整理        | 应用装配、路由、schema、core 与 service 分层；`main.py` 保持兼容启动入口。                                                             |
| AI 流式会话生命周期        | SSE 解码、取消、失败终态、请求序列隔离、历史预算与手动重试均有回归测试。                                                               |
| API / Service 层统一       | 组件通过 Service 层访问业务接口；认证、灾害、Analytics 与 AI 请求具备明确边界。                                                        |
| Analytics 前端边界类型治理 | 16 个 Analytics 响应边界及 Hazard/HTTP 边界均有运行时解析与稳定契约错误。                                                              |
| 跨语言灾害请求契约         | `contracts/analytics-hazard-data.json` 被 TypeScript 与 Python 测试共同读取；浏览器会在请求前拒绝非法映射值。                          |
| Python API 契约与可靠性    | 请求边界、稳定错误、缓存口径、线程隔离与核心算法异常语义已有实现和测试。                                                               |
| BFF 与 Python 管理面边界   | BFF allowlist、query/body 限制、上游超时与脱敏错误已落地；Python 管理路由要求令牌、CORS 限制显式来源。                                 |
| 地图与分析页面拆分         | MapView 已分为 feature 入口、Hook 与纯工具；Analytics 页面已拆为数据 Hook、转换与各 Tab。                                              |
| 外部灾害数据韧性           | 多源聚合具备超时、一次重试、进程内缓存、陈旧标记与来源级状态；刷新请求具备取消、去重和竞态保护。                                       |
| 前端状态归属梳理           | 地图数据、筛选、样式、刷新与来源元信息收口到地图状态域；页面、弹窗收口到 UI 状态域，App 仅保留授权和组合。                             |
| 前端输出安全               | 地图 Popup 用本地 DOM 与 `textContent` 渲染外部字段，不使用 `setHTML()`。                                                              |
| 最小 CI 与测试入口         | `.github/workflows/quality.yml` 使用 Node 20、pnpm 10 与 Python 3.13；`pnpm run test:python` 优先使用项目 `.venv`，CI 回退 `python3`。 |

## 当前质量基线

当前脚本及职责如下：

| 命令                           | 覆盖范围                                                  |
| ------------------------------ | --------------------------------------------------------- |
| `pnpm run lint`                | TypeScript、React、BFF 及配置的 ESLint 规则。             |
| `pnpm run format:check`        | 已纳入清单的 Markdown、JSON、TypeScript、测试与配置格式。 |
| `pnpm run typecheck:client`    | 前端 TypeScript 类型检查。                                |
| `pnpm run typecheck:server`    | Express BFF TypeScript 类型检查。                         |
| `pnpm run typecheck:contracts` | TypeScript 契约正反例类型检查。                           |
| `pnpm run test:services`       | Service、解析器、请求边界与 AI 流协议回归；当前 177 项。  |
| `pnpm run test:component`      | React Testing Library 组件回归；当前 59 项。              |
| `pnpm run test:python`         | FastAPI 模型、路由、服务与算法 unittest；当前 39 项。     |
| `pnpm run test:e2e`            | Playwright 桌面端关键流程冒烟。                           |
| `pnpm run build`               | Vite 生产构建与 BFF 编译。                                |

最近一次完整验证结果：Service 177/177、组件 59/59；Python 39 项为最近一次已验证基线。本次重跑中，BFF 受沙箱 `listen` EPERM 限制，E2E 未启动，Python 3.13 不可用。Node 运行时应使用项目声明的 `>=20.19 <21`；其他 Node 版本会输出 engine warning。

## 优先级矩阵

项目当前不计划部署。矩阵按后续开发价值排序；发布前项仅在决定公网部署后进入实施范围。

| 优先级 | 剩余优化范围                                    | 建议时机                 | 依赖与边界                                                                             |
| ------ | ----------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------- |
| P1     | 报告下载闭环                                    | 需要对外演示或交付报告时 | 统一下载格式、字段、数据时间、来源、文件名与内容测试；当前 JSON 下载与界面文案需对齐。 |
| P2     | 跨语言 Analytics 响应与 4D 输出契约扩展         | 输出模型稳定后           | 灾害请求共享样本已完成；评估覆盖响应模型、4D 输出或代码生成的收益。                    |
| P2     | 前端包体积预算与分包治理                        | 性能优化前               | Mapbox 生产 chunk 约 1.8 MB；先采集首屏与交互数据，再建立分包和预算。                  |
| P2     | 可访问性与多语言界面                            | UI 迭代时                | 补齐弹窗语义、焦点管理、键盘路径、locale 资源与移动端/视觉回归。                       |
| P2     | 可观测性、集中错误上报和指标告警                | 需要持续运行服务时       | 已有安全日志；后续接入集中采集、错误聚合、指标、trace 与告警。                         |
| P2     | 仓库/包结构调整与依赖清理                       | 大功能稳定后             | 评估 web、BFF 与 Python 的包边界、生产依赖、Docker 缓存与许可证/漏洞审计。             |
| P2     | 仓库卫生与运行时无关文件                        | 下次维护批次             | 明确 `.superpowers` 过程记录、历史副本、锁文件和临时产物的保留策略。                   |
| 发布前 | 公开 Analytics API 身份、共享限流与生产错误脱敏 | 决定公网部署前           | 管理令牌不覆盖公开业务 API；多实例限流需要网关或共享存储。                             |

## 关键边界与遗留风险

### AI 与会话

- AI Router 以规则匹配选择 Ark 或 Workflow，并只在响应开始前进行 provider 降级。
- 自动续传、跨标签并发限制、成本配额、会话持久化与跨实例限流不在当前范围内。

### Analytics 与数据模型

- 请求侧 HazardData 已双端对齐；Analytics 响应、4D 输出和生成式跨语言类型仍未统一。
- 预测置信度、风险阈值、估算 magnitude 与质量规则需要真实业务样本校准。
- 多来源事件的 severity 与 magnitude 不天然可比较；如需统一强度排名，应先定义业务换算规则。

### 安全与运行边界

- BFF 限流目前按单进程内存和直连 IP 计数；多实例环境须迁移到网关或共享存储，并显式配置可信代理。
- 浏览器仍可访问公开的 Python Analytics API；不部署时不构成当前阻塞，公网环境必须补身份、入口和限流设计。
- Popup 外部字段只按文本显示。若未来允许外部 URL 可点击，需要单独定义协议白名单、`rel` 属性和测试。

### 交付与测试

- 当前 GitHub Actions 运行前端/BFF 基线和 Python unittest，但不自动部署、不做视觉回归，也未接入依赖、镜像、许可证或 secret 扫描。
- `pnpm test` 在受限沙箱不能验证需要绑定 `0.0.0.0` 的 BFF 用例；应在本机或 CI 的正常网络命名空间执行完整 BFF 测试。
- Prettier 不解析 shell 脚本；`scripts/test-python.sh` 由 Bash 严格模式和实际 `pnpm run test:python` 执行验证。

## 后续执行原则

- 新增接口时，先定义输入/输出契约、失败语义和测试，再接入页面或路由。
- 对外部数据、浏览器事件和 JSON 响应保持 `unknown` 边界，解析成功后再进入领域类型。
- 服务端凭据只在 BFF 或 Python 服务端读取；不将模型 Key、DisasterAware 凭据或 Python 凭据打入前端构建产物。
- 不部署阶段优先保持测试可复现和提交边界清晰；发布相关的身份、共享限流与告警按实际发布计划单独立项。
