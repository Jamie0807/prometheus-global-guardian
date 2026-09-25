# 项目待优化清单

最近核对日期：2026-09-25。本文档以当前工作区代码、自动化脚本、GitHub Actions 与最近提交为准；账号/AI 持久化实现已合并到 `main`，尚未部署。

## 当前判断

项目已具备 React + Vite 前端、Express BFF、FastAPI 分析服务、多源灾害聚合、Mapbox 地图、Analytics 看板与 AI 助手。`main` 已加入 PostgreSQL 用户账号、全站登录门禁和账号隔离的 AI 会话/长期记忆持久化；仍以本地或私有自托管使用为目标，不代表已部署为公网服务。

- 前端业务请求统一收敛在 `apps/web/src/services/`；Analytics、Hazard 和通用 HTTP 数据在进入领域层前均从 `unknown` 经运行时解析器校验。
- 浏览器业务 API 统一通过 Express BFF；Analytics BFF 使用服务间令牌代理到私有 FastAPI，数据库、会话密钥和模型凭据不进入浏览器构建。
- `prisma/schema.prisma` 和版本化 migration 管理 PostgreSQL 用户、会话、AI 对话、消息及记忆；服务启动不会隐式执行数据库迁移。
- Analytics 灾害请求使用 TypeScript 与 Python 共用的 JSON fixture；两端已对字段默认值、长度、二维/三维坐标、数值、未知字段和非有限数的接受边界对齐，质量评估输入也会先完成长度与空值规范化。
- BFF 仅代理声明的 DisasterAware 路由，并具备请求边界、服务端鉴权、超时、限流和脱敏错误契约；Python 管理接口已受令牌保护。
- AI 流式会话已支持取消、失败终态、请求隔离、历史预算、手动重试、有限自动恢复和断点续传；BFF 启动时会把遗留助手 `STREAMING` 消息标记为失败以便重试。续传仍使用单实例有界内存，不支持跨实例恢复；恢复计时在订阅者断开或会话结束后启动，单帧限制为 64 KiB。
- 首页已完成 Orbital「深空态势」升级：精简品牌标题、可折叠玻璃态监控/图例浮层、加强国家与地点标签对比、优化灾害标记层级；默认 2D Mercator 平面地图，可切换 3D Globe Terrain。Globe 不挂载不兼容的 deck.gl 外部 3D Tiles，改用 Mapbox 原生建筑层并在高缩放时一次性提示；DEM 不可用时保留灾害地图。
- Mapbox 聚合点展开、单点安全 Popup、热力图头部开关、AI 首包等待态和 HTML 报告均已完成本地回归验证。
- 使用页面当前的 100 条灾害数据实际调用本机 FastAPI 的统计、预测和风险接口均返回 200，并可满足现有严格契约；风险评估对缺失震级的类型返回 `riskScore: 0` 和 `averageMagnitude: null`，正常震级数据仍按既有公式计算。截图中的格式错误应按运行中的分析服务版本或临时状态排查，不能以放宽客户端解析处理。
- 地图与 UI 导航状态已分别由 `MapStateProvider` 和 `UIStateProvider` 归属；组件局部状态与跨实例持久化仍不在本轮范围内。
- 统一灾害事件与图层注册表已落地：`eventId`、`sourceEventId`、`sourceId`、`layerId`、观测/更新时间和 `[0, 1]` 置信度由共享模型、BFF/浏览器/Python 边界共同校验；未知来源或图层回退为 `unknown`，旧字段保留兼容解析。
- 数据源健康检查已落地：四个来源的 `meta.sources[]` 在现有状态旁返回固定五分钟的进程内快照。仅真实 `load()` 尝试计数，空数组计成功，缓存、`stale` 和 fallback 占位不计数；错误只返回稳定枚举，进程重启会清空窗口。
- 本地/私有单机持久化运维已加入手动数据库检查、备份、7 个自然日保留清理、隔离恢复演练与运行手册；2026-09-24 已在独立 `pgg-persistence-test` Compose 项目中完成真实 Docker 全流程验证。正式公网生产运维仍需单独设计。
- 运行单元与共享包架构治理已完成：跨语言契约位于 `packages/contracts/`，灾害领域实现位于 `packages/hazard-domain/`；Web 位于 `apps/web/`，BFF 位于 `apps/bff/`，Analytics 位于 `services/analytics/`。Web 与 BFF 通过 `@pgg/hazard-domain` 公共入口使用共享领域包；日志能力由 `@pgg/logging` 提供。架构门禁会检查三个运行单元入口、共享包依赖方向、测试归档和旧目录残留。
- 全项目架构治理已完成：共享日志与灾害兼容层已归档到 `packages/` 公共包；测试按 Web、BFF、契约、集成和持久化边界分布；Node/架构工具归入 `tooling/`，数据库运维归入 `infra/persistence/`，Analytics 启动与测试脚本归入 `services/analytics/`。根目录命令名称保持兼容，路径门禁会阻止旧脚本回流。
- Docker 编排治理已完成：根 `Dockerfile` 与根 Compose 保留为项目级完整栈入口，`services/analytics/Dockerfile` 保持服务归属，`docker-compose.test.yml` 仅覆盖隔离测试数据库；`tooling/docker/check-compose.sh` 和架构门禁校验文件归属、服务入口、测试独立卷与端口覆盖，不新增平行 `docker/` 副本。
- 根目录编排治理已完成：`prisma.config.ts`、`playwright.config.ts`、Vite/Vitest/TypeScript 配置和仓库质量策略文件保留在根目录作为跨运行单元入口；依赖管理统一使用 pnpm，已移除重复的 `package-lock.json`，架构门禁会阻止它回流。
- 质量门禁包含 lint、格式、三项 TypeScript 类型检查、BFF/Service/组件/E2E 测试、构建及 Python unittest；AGENTS.md 已固化需求拆解、TDD、提交和自主验收约束。GitHub Actions 分别运行前端/BFF 基线和 Python 测试。
- 受限沙箱中运行 `pnpm test` 的 BFF 监听用例会出现 `listen EPERM`；这是运行环境限制。在具备本地端口权限的环境中，BFF 与 Service 测试均可完整通过。
- 已完成全球灾害可视化开源项目调研，技术栈、架构对比和优化建议记录在 `docs/OPEN_SOURCE_DISASTER_VISUALIZATION_RESEARCH.md`；本清单只同步其中的下一步高优先级事项。

## 下一步最高优先级

账号与 AI 持久化已合并到 `main`，包括 PostgreSQL/Prisma、账号注册/登录/退出/会话恢复、全站 API 会话门禁、Analytics BFF 服务间认证、用户隔离的对话及消息、上下文裁剪和摘要、用户确认的长期记忆管理与账号删除。该实现面向本地或私有自托管，尚未部署，也未完成公网生产运维准备。

合并前验收已完成：旧 AI/BFF/API 与组件测试已迁到登录态和持久化会话契约；PostgreSQL 集成测试覆盖重复消息幂等、生成前取消和重试；本地隔离 Compose 迁移、Node 基线、Python 3.13 测试及 CI PostgreSQL 配置均已验证。代码已合入 `main`。当前工作区已补齐本地/私有单机持久化运维命令、文档和独立 Docker 全流程验证，公网能力独立评估。

后续优先事项：

1. **补齐公网账号能力**：在决定公开服务前设计邮箱验证、密码找回、OAuth（如需要）、注册滥用防护和跨实例共享限流。
2. **独立评估灾害历史数据**：只有确认历史查询、回放、审计或空间索引需求后，再设计 PostGIS/灾害快照，不与账号和 AI 数据模型混作一项。

## 已完成能力

| 优化项                         | 当前结果                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 前后端错误与调试分级           | React、BFF 与 Python 使用统一日志等级和安全上下文；生产界面不展示原始异常或组件栈。                                                                                                                                                                                                                                        |
| Python 服务结构整理            | 应用装配、路由、schema、core 与 service 分层；`main.py` 保持兼容启动入口。                                                                                                                                                                                                                                                 |
| AI 流式会话生命周期            | SSE 解码、取消、失败终态、请求序列隔离、历史预算与手动重试均有回归测试。                                                                                                                                                                                                                                                   |
| API / Service 层统一           | 组件通过 Service 层访问业务接口；认证、灾害、Analytics 与 AI 请求具备明确边界。                                                                                                                                                                                                                                            |
| Analytics 前端边界类型治理     | 16 个 Analytics 响应边界及 Hazard/HTTP 边界均有运行时解析与稳定契约错误。                                                                                                                                                                                                                                                  |
| 跨语言灾害请求契约             | `packages/contracts/analytics-hazard-data.json` 被 TypeScript 与 Python 测试共同读取；浏览器会在请求前拒绝非法映射值，支持 GeoJSON 高程坐标并清洗质量评估文本输入。                                                                                                                                                        |
| Python API 契约与可靠性        | 请求边界、稳定错误、缓存口径、线程隔离与核心算法异常语义已有实现和测试；风险结果覆盖缺失与正常震级两种语义。                                                                                                                                                                                                               |
| Analytics 响应契约版本化       | `/api/v1` 业务接口统一成功/错误信封、请求追踪字段、输入摘要和版本；TypeScript 与 Python 共同读取成功/错误 JSON 样本，旧响应在迁移期保持兼容解析。                                                                                                                                                                          |
| BFF 与 Python 管理面边界       | BFF allowlist、query/body 限制、上游超时与脱敏错误已落地；Python 管理路由要求令牌、CORS 限制显式来源。                                                                                                                                                                                                                     |
| 地图与分析页面拆分             | MapView 已分为 feature 入口、Hook 与纯工具；Analytics 页面已拆为数据 Hook、转换与各 Tab。                                                                                                                                                                                                                                  |
| 外部灾害数据韧性               | 多源聚合具备超时、一次重试、进程内缓存、陈旧标记与来源级状态；刷新请求具备取消、去重和竞态保护。                                                                                                                                                                                                                           |
| 数据源健康检查与新鲜度         | DisasterAware、USGS、NASA EONET 与 GDACS 的 `meta.sources[]` 可携带固定五分钟进程内健康快照：真实 `load()` 的尝试/成功/失败、成功率、延迟、最近尝试/成功时间、连续失败和稳定错误码；空数组计成功，缓存、`stale` 和 fallback 占位不计数，进程重启清空窗口。                                                                 |
| 统一灾害事件与图层注册表       | `packages/hazard-domain/` 与 `packages/contracts/hazard-event.json` 定义 canonical `eventId`、`sourceEventId`、`sourceId`、`layerId`、观测/更新时间和置信度边界；BFF、浏览器 Worker、地图、Analytics、质量、AI 与 Python 共用，旧共享兼容目录已删除；旧字段兼容且未知类型回退为 `unknown`。                                |
| 运行单元与共享包架构治理       | `packages/contracts/` 保存四个语言无关 JSON 契约，`packages/hazard-domain/` 保存 TypeScript 灾害领域实现；Web、BFF、Analytics 分别位于 `apps/web/`、`apps/bff/`、`services/analytics/`，旧共享兼容目录已删除。`check:architecture` 检查运行单元入口、旧目录残留、包元数据、依赖方向和内部路径引用，并纳入 Node 基线与 CI。 |
| Web 运行单元物理迁移           | Web 实现已位于 `apps/web/src/`，入口为 `apps/web/index.html`；Vite 保持根 `dist/` 产物供 Express 托管，Web 使用 `@pgg/hazard-domain` 公共入口；架构门禁覆盖 Web，Service、组件和类型测试路径及项目文档已同步。                                                                                                             |
| SSE 断连自动恢复与会话续传     | BFF 为 AI 流分配受约束的请求 ID 和递增事件序号，并在单实例有界内存窗口内缓存转换后的事件；浏览器最多进行三次指数退避重连，携带 `Last-Event-ID` 恢复并去重。恢复计时仅在订阅者断开或会话终态后启动，单帧限制为 64 KiB；过期后回到安全错误和手动重试。                                                                       |
| 用户注册、全站认证与 AI 持久化 | 已合并到 `main`：PostgreSQL/Prisma、HttpOnly 服务端会话、登录门禁、账号隔离的对话/消息、48 KiB 上下文裁剪与摘要、用户确认的长期记忆管理及账号数据删除；AI 数据不会写入浏览器持久存储。已完成本地 Docker 验证，尚未部署公网。                                                                                               |
| 账号与 AI 持久化分支验收       | 已合并到 `main` 并完成验收：登录/恢复/退出、重复生成、完成响应重放、生成前取消及重试复用测试通过；CI 使用一次性 PostgreSQL 并应用 migration。公网生产运维仍未完成。                                                                                                                                                        |
| 本地/私有单机持久化运维        | 已实现 `db:check`、`db:backup`、`db:backup:prune`、`db:restore:verify` 与手动前向 migration 流程，并在独立 `pgg-persistence-test` Compose 项目完成 Docker 全流程验证，见 `docs/OPERATIONS_PERSISTENCE.md`。不含公网生产恢复、对象存储或集中告警。                                                                          |
| 前端状态归属梳理               | 地图数据、筛选、样式、刷新、热力图开关与来源元信息收口到地图状态域；页面、弹窗收口到 UI 状态域，App 仅保留授权和组合。                                                                                                                                                                                                     |
| 前端输出安全                   | 地图 Popup 用本地 DOM 与 `textContent` 渲染外部字段，不使用 `setHTML()`。                                                                                                                                                                                                                                                  |
| 最小 CI 与测试入口             | `.github/workflows/quality.yml` 使用 Node 20、pnpm 10 与 Python 3.13；`pnpm run test:python` 优先使用项目 `.venv`，CI 回退 `python3`。                                                                                                                                                                                     |
| 监控交互与可读报告             | 标题与面板左对齐，筛选框使用无障碍自绘箭头；聚合点可展开、单点显示安全 Popup、热力图开关位于设置右侧；AI 首包前无空白气泡；报告导出为可打印 HTML。                                                                                                                                                                         |
| Orbital 全球监控地图视觉升级   | 首页默认 2D Mercator 平面地图，提供可访问的 2D/3D 投影切换；3D 使用 Globe、轻量 DEM Terrain 与缩放受控的 Mapbox 原生建筑（外部 deck.gl Tiles 在 Globe 下回退）；深空玻璃面板可折叠，桌面/窄屏布局、标签对比及减少动态效果均有自动化验证。                                                                                  |
| 分析、通知与详情面板视觉统一   | Analytics 面板及图表类别配色统一到首页的深蓝/青蓝色阶；分析图标换为一致的线框 SVG，百分比进度条按数值填充；通知中心与图表详情弹窗采用深蓝玻璃面板和低饱和状态色，严重程度色保留在小标签中。                                                                                                                                |
| 中文注释与文件职责说明         | 源码注释已统一为中文，主要源文件顶部补充文件职责说明，并通过 ESLint 与 Prettier 维持格式一致。                                                                                                                                                                                                                             |
| Analytics 图表字段一致性       | 时间线、严重性分布和最新灾害列表统一读取顶层时间/严重性字段，同时兼容旧版嵌套字段；回归测试覆盖两种数据形态。                                                                                                                                                                                                              |
| 研发流程约束与自主验收         | AGENTS.md 已固化 Superpowers 需求流程、SDD/TDD、并行任务、质量门禁、提交约束和自主验收要求。                                                                                                                                                                                                                               |

## 当前质量基线

当前脚本及职责如下：

| 命令                           | 覆盖范围                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------- |
| `pnpm run lint`                | TypeScript、React、BFF 及配置的 ESLint 规则。                                     |
| `pnpm run format:check`        | 已纳入清单的 Markdown、JSON、TypeScript、测试与配置格式。                         |
| `pnpm run typecheck:client`    | 前端 TypeScript 类型检查。                                                        |
| `pnpm run typecheck:server`    | Express BFF TypeScript 类型检查。                                                 |
| `pnpm run typecheck:contracts` | TypeScript 契约正反例类型检查。                                                   |
| `pnpm run check:architecture`  | 共享包元数据、根目录编排文件、兼容入口和包与运行单元依赖方向检查。                |
| `pnpm run check:docker`        | 根 Compose 与测试覆盖 Compose 的结构、服务归属、隔离卷和端口配置检查。            |
| `pnpm run test:services`       | Service、解析器、请求边界、AI 流协议、统一灾害事件与 HTML 报告回归；本轮 323 项。 |
| `pnpm run test:component`      | React Testing Library 组件回归；本轮 108 项。                                     |
| `pnpm run test:python`         | FastAPI 模型、路由、服务、统一灾害事件与算法 unittest；本轮 57 项。               |
| `pnpm run test:e2e`            | Playwright 首页流程、2D/3D 控件与桌面/窄屏浮层布局冒烟。                          |
| `pnpm run build`               | Vite 生产构建与 BFF 编译。                                                        |

历史完整验证结果与本轮架构治理验证分别见 `docs/TESTING_BASELINE.md`。本轮 Service 323/323、组件 108/108、架构检查、Docker Compose 配置检查、lint、格式检查、客户端/服务端/契约类型检查和构建通过。BFF 原生 Node 集成测试仍需测试专用 PostgreSQL，E2E 也需先启动同一隔离数据库；不能把当前宿主机环境下未满足前置条件的结果视为通过。Node 运行时应使用项目声明的 `>=20.19 <21`；当前启动 pnpm 的 Node 24.16.0 会输出 engine warning。

## 优先级矩阵

项目当前不计划部署。矩阵按后续开发价值排序；发布前项仅在决定公网部署后进入实施范围。

| 优先级 | 剩余优化范围                           | 建议时机           | 依赖与边界                                                                                            |
| ------ | -------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| P1     | PostgreSQL/PostGIS 灾害历史数据设计    | 历史需求确认前     | PostgreSQL 已用于账号和 AI 数据；灾害历史快照、分析运行和空间索引仍需单独定义需求及数据保留策略。     |
| P2     | 前端包体积预算与分包治理               | 性能优化前         | Mapbox 生产 chunk 约 1.8 MB；先采集首屏与交互数据，再建立分包和预算。                                 |
| P2     | 可访问性与多语言界面                   | UI 迭代时          | 补齐弹窗语义、焦点管理、键盘路径、locale 资源与移动端/视觉回归。                                      |
| P2     | 可观测性、集中错误上报和指标告警       | 需要持续运行服务时 | 已有安全日志；后续接入集中采集、错误聚合、指标、trace 与告警。                                        |
| P2     | 仓库卫生与运行时无关文件               | 下次维护批次       | 明确 `.superpowers` 过程记录、历史副本、锁文件和临时产物的保留策略。                                  |
| 发布前 | 公开服务的账号验证、共享限流与生产运维 | 决定公网部署前     | 当前单机备份和恢复演练不覆盖公网账号验证/找回、共享限流、异地或对象存储备份、集中告警及正式恢复预案。 |

## 关键边界与遗留风险

### AI 与会话

- AI Router 以规则匹配选择 Ark 或 Workflow，并只在响应开始前进行 provider 降级。
- 已支持单实例短时会话缓存、事件序号、`Last-Event-ID` 自动恢复和最多三次指数退避。每会话最多缓存 256 个事件或 512 KiB，单帧上限 64 KiB；续传窗口从订阅者断开或会话终态后开始。进程重启、多实例共享会话、账户配额和跨实例治理仍不在范围内。
- `main` 已有浏览器账号、PostgreSQL 持久化和账号级对话隔离；SSE 续传事件缓存仍是单实例内存状态，跨实例恢复、账户配额和跨实例治理不在范围内。
- 跨标签并发限制、成本配额和跨实例限流仍不在当前范围内。

### Analytics 与数据模型

- 请求侧 HazardData、Analytics 顶层响应信封和统一事件/图层注册表已双端对齐；4D `data` 内部字段的完整跨语言模型仍需单独设计。
- 统一注册表已覆盖首批点事件和未知类型回退；复杂几何、历史快照、回放和审计不在本轮范围内，新增数据源仍需明确字段、时间和几何语义。
- 数据源健康指标是单进程、固定五分钟的短期快照；尚无跨实例汇总、历史趋势、持久化指标或告警。缓存命中、`stale` 和 fallback 占位不改变真实上游成功率。
- PostgreSQL 当前用于账号与 AI 数据，尚无 PostgreSQL/PostGIS 灾害历史数据层；是否实施取决于历史查询、回放、审计和长期趋势需求。
- 预测置信度、风险阈值、估算 magnitude 与质量规则需要真实业务样本校准。
- 多来源事件的 severity 与 magnitude 不天然可比较；如需统一强度排名，应先定义业务换算规则。

### 安全与运行边界

- BFF 限流目前按单进程内存和直连 IP 计数；多实例环境须迁移到网关或共享存储，并显式配置可信代理。
- 浏览器只能通过要求登录的 Express BFF 访问 Analytics；BFF allowlist 使用服务间令牌访问私有 FastAPI。公网部署仍需共享限流、外部入口和可信代理设计。
- Popup 外部字段只按文本显示。若未来允许外部 URL 可点击，需要单独定义协议白名单、`rel` 属性和测试。

### 交付与测试

- 当前 GitHub Actions 运行前端/BFF 基线和 Python unittest，但不自动部署、不做视觉回归，也未接入依赖、镜像、许可证或 secret 扫描。
- `pnpm test` 在受限沙箱不能验证需要绑定 `0.0.0.0` 的 BFF 用例；应在本机或 CI 的正常网络命名空间执行完整 BFF 测试。
- Prettier 不解析 shell 脚本；`services/analytics/test.sh` 由 Bash 严格模式和实际 `pnpm run test:python` 执行验证。

## 后续执行原则

- 新增接口时，先定义输入/输出契约、失败语义和测试，再接入页面或路由。
- SSE 恢复、统一事件/图层注册表、数据源健康检查，以及账号/全站认证/AI 持久化实现已完成并合入 `main`。本地/私有单机持久化运维及其隔离 Docker 演练已完成；按公网计划单独评估账号验证、共享限流、异地备份和告警。PostgreSQL/PostGIS 灾害历史数据设计保持独立。
- 对外部数据、浏览器事件和 JSON 响应保持 `unknown` 边界，解析成功后再进入领域类型。
- 服务端凭据只在 BFF 或 Python 服务端读取；不将模型 Key、DisasterAware 凭据或 Python 凭据打入前端构建产物。
- 不部署阶段优先保持测试可复现和提交边界清晰；发布相关的身份、共享限流与告警按实际发布计划单独立项。
