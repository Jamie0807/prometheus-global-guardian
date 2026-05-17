## 专业技能

- **前端框架与基础**：精通 React 19/18 及 Vue2/3，深入理解两个框架的核心实现原理，包括虚拟 DOM diff 算法、Vue3 响应式系统（Proxy + effect 追踪机制）、React Fiber 架构与并发调度；熟练使用 TypeScript 进行高级类型设计，具备处理复杂状态管理和大型组件架构的实战能力。

- **前端生态库与源码原理**：熟练使用 Vue-Router、Pinia、React Router、Element-Plus、Arco-Design 等主流生态库，并深入了解其路由匹配、状态响应式和组件渲染的核心实现；能根据业务需求对生态库进行二次封装，具备从源码视角定位框架层级问题的能力。

- **打包构建与编译工具**：深入掌握 Webpack5 的模块联邦、代码分割与 Tree Shaking 原理，熟练配置 Vite 工程化方案；理解 Babel 编译流程，能基于 Node.js 开发自定义脚手架、打包优化插件及工程化中间件，具备从零搭建前端工具链的能力。

- **大前端与多端开发**：熟悉基于 Next.js 的服务端渲染（SSR/SSG/ISR）与全栈开发模式，深入理解 App Router、API Routes 及 BFF 适配器层设计；了解 Electron 桌面端开发原理与 Taro 多端框架，具备将 Web 能力延伸至桌面端与小程序端的实践经验。

- **图形学与数据可视化**：熟悉 Mapbox GL JS、Echarts、Recharts 等可视化方案的使用与原理；深入了解 WebGL 渲染管线，能通过 GeoJSON Layer + GPU 实例化渲染处理 10w+ 地理点位；熟悉 @xyflow/react 构建 DAG 工作流可视化，具备复杂交互图形的工程落地能力。

- **AI 能力工程化落地**：具备将大语言模型能力深度融入业务的完整工程经验，包括流式 SSE 对话实现（fetch + ReadableStream 手写 SSE 解析）、动态上下文注入 System Prompt、多轮对话历史管理及无密钥降级模式；注重 AI 交互体验，实现打字机流式渲染与 Markdown 增量解析，推动业务实现"AI + 数据可视化"的深度融合；具备 Monaco Editor 深度集成与 Yjs 多人实时协同编辑的工程实践。

- **AI Agent 与大模型开发**：掌握 LangChain、LangGraph 框架，深入理解其有状态工作流（DAG 执行引擎）的节点编排与状态流转机制，并具备从零实现类似编排执行器的能力；熟悉 RAG 应用全流程（文档切片、向量嵌入、混合检索召回），能本地部署 Ollama 大模型并与前端集成；具备系统化提示词工程能力，了解 MCP 协议与 Agent 工具调用机制；熟悉 Pandas、NumPy 数据清洗与统计分析，能使用 scikit-learn 完成聚类、回归等机器学习任务，具备数据分析驱动 AI 服务的端到端交付能力。

- **Vibe Coding 与 AI 辅助研发**：持续实践 vibe coding 工作方式，能够将需求快速拆解为可执行任务，结合 AI coding 工具完成代码生成、重构、联调与测试闭环；注重工程质量与可维护性，能够通过代码评审规则、自动化校验与规范约束，将“快速产出”稳定转化为“可上线交付”。

- **全栈开发**：掌握 Node.js 与 Python FastAPI 进行服务端开发，熟悉 RESTful API 设计与 BFF 适配器模式；掌握 PostgreSQL 与 Prisma ORM 进行数据建模与迁移，具备从接口设计到数据持久化的全链路交付能力。

- **工程化架构**：熟悉 Turborepo + pnpm Monorepo 的核心包拆分与并行构建策略；掌握 Docker 多阶段构建与 Nginx 反向代理部署，熟悉 CI/CD 自动化流水线搭建；具备微前端架构设计与落地经验，能从 Web Vitals 核心指标出发进行系统性性能优化，具备从零主导大型前端项目工程化体系建设的能力。

---

## 工作经历

## Prometheus Space Technologies
**全栈工程师** | Sep 2025 – present

### 核心职责总结：

• **业务职责**：独立主导 Prometheus Global Guardian 全球灾害监控平台从 0 到 1 的架构设计、开发与交付，覆盖实时地图可视化、多源数据融合、Python 数据分析服务及 AI 智能分析等核心模块，接入 4 大权威数据源、覆盖 10+ 类灾害实时追踪。

• **团队基建与横向产出**：主导前端工程化体系建设，沉淀 18 个高复用业务组件，制定 TypeScript 严格模式规范；同步孵化内部 AI 工作流引擎平台，以 SaaS API 形式对内赋能，已集成至本项目 AI 分析助手模块。

• **核心成就**：主导基于WebGL的渲染引擎重构，将地图帧率从 **5fps 提升至 55fps+**；Vite 代码分割将首屏 bundle 减少 **89%**（669 KB → 71 KB gzip），构建时间压缩 **29%**；AI 助手 API 调用成功率 **99%+**，首字响应 **<1s**。

---

# 项目经验

## 项目：AI 工作流编排平台
2025 – present

**项目介绍**：企业级 AI Agent 工作流编排平台，解决企业私有化部署大模型应用的难题。平台通过**可视化拖拽画布**将 LLM 推理、RAG 知识库检索、HTTP 调用、条件分支等能力抽象为可复用节点，业务团队无需编码即可编排多步骤 AI 任务流程；底层引擎支持 **Ollama 本地大模型**私有化部署，企业敏感数据不出内网；对外以 **NestJS SaaS API** 形式开放，已集成至 Prometheus 灾害监控平台，灾害分析流水线新增成本从"天"级降至"分钟"级。

**技术栈介绍**：Next.js 16（App Router + BFF）| NestJS 11 | TypeScript | **@xyflow/react**（DAG 画布）| **LangChain + LangGraph**（AI 编排引擎）| **Qdrant**（向量数据库）| **Ollama**（本地大模型）| PostgreSQL + Prisma ORM | pnpm + Turborepo Monorepo | shadcn/ui

**工作内容和成果**：

- 【架构】自主设计并实现基于 **DAG（有向无环图）** 的 AI 工作流执行引擎（`ai-engine`），利用 **Kahn 算法**实现节点拓扑排序与循环检测，支持复杂业务逻辑编排；采用**注册模式（Registry Pattern）**设计节点扩展系统，遵循**开闭原则**，实现 LLM / RAG / HTTP / Condition / Start / End 6 种节点类型统一 Executor 注册机制；**LLMExecutor** 实现**三段式 Prompt 工程**（系统 / 用户 / 助手角色分离），支持上游节点输出**动态注入**下游 Prompt 实现跨节点上下文传递；支持 OpenAI / Anthropic / **Ollama 多 Provider** 切换，ChatOllama 直连本地实例满足**私有化部署**需求，企业敏感数据不出内网

- 【横向产出】引擎独立打包（tsup，ESM + CJS 双格式）作为 Monorepo 核心共享包，以 **NestJS API Key 鉴权**方式对外提供 SaaS 服务；NestJS 接口同时支持**同步模式**与 **SSE 流式模式**，流式模式可逐事件推送节点执行进度与 Token 输出，满足不同客户端的接入场景；已被多个业务项目接入，灾害分析流水线新增成本从"天"级降至"分钟"级

- 【可视化编辑器】基于 **@xyflow/react** 构建拖拽式 DAG 画布，集成 **Tiptap 富文本变量编辑器**（`/` 命令插入上游节点变量引用 `{{nodeId.output}}`），底部测试运行面板支持输入 / 结果 / 追踪 / 详情 4 个维度实时反馈

- 【RAG 系统构建】基于 **LangChain 与 Qdrant** 搭建完整 RAG 管道：文档切片 → Ollama 向量化 → Qdrant 向量存储 → 混合检索召回（全文 + 向量），RAG 节点可作为独立组件按需接入工作流，显著提升回答准确率

- 【工程化】采用 **pnpm + Turborepo Monorepo** 管理 4 个子包，依赖拓扑排序保证 `ai-engine` 优先构建，任务缓存实现增量构建；主应用基于 **Next.js 16 App Router** 承担 BFF 层职责；NestJS 11 通过守卫 / 拦截器 / 装饰器实现请求鉴权与日志追踪

---




## 项目：Prometheus Global Guardian - 实时全球环境灾害监控与可视化平台
**Prometheus Space Technologies** | Sep 2025 – present

**业务介绍**：整合 USGS、NASA EONET、GDACS、DisasterAware 四大权威数据源的实时全球灾害监控与可视化平台，覆盖地震、火山、洪水等 10+ 类灾害实时追踪，服务于政府机构、应急响应团队及科研分析人员。

**技术栈介绍**：React 19.1 + TypeScript 5.9（严格模式）| **Vite 7.1**（manualChunks 代码分割 + React.lazy 懒加载）| Mapbox GL JS 3.15 | Recharts 3.5.0 | Fetch API + OAuth 2.0 | Python FastAPI 0.115.5 | **LangGraph DAG + SSE 流式响应** | CSS Modules

**工作内容和成果**：

- 【架构】独立主导平台从 0 到 1 的整体架构设计与交付，设计 **BFF 适配器层**统一 4 个异构数据源为标准 `Hazard` 接口，封装 **authFetch** 实现 OAuth 2.0 Token 自动刷新（401/403 拦截）与 **Promise.allSettled** 容错降级，30 秒超时 + 最多 3 次重试确保请求稳定性，数据同步成功率 **99.5%+**，事件响应延迟 **<3 秒**；前端状态按职责域拆分 **4 个独立 Context + useReducer**（灾害数据 / 筛选条件 / UI 状态 / 通知），各自封装自定义 Hook 作为唯一消费入口，彻底消除 props drilling，组件重渲染次数降低 **60%**

- 【可视化】基于 **Mapbox GL JS + WebGL 渲染管线**重构地图引擎，将原 DOM Marker 方案替换为 GPU 实例化渲染，引入 **LOD 三级调度**（全球聚合 → 区域 Marker → 城市 3D 体块），支撑 **10w+ 灾害点位**稳定渲染，帧率从 **5fps 提升至 55fps+**，显存占用降低 **40%**；利用 **GeoJSON Source diff 增量更新**机制为每个 Feature 挂稳定 id，5 分钟轮询由全量替换改为只上传变化部分，地图刷新卡顿从 **800ms 降至 20ms**；通过 **Web Worker** 实现灾害数据异步清洗与坐标转换预处理，彻底消除数据解析对主线程的阻塞

- 【图表交互】基于 **Recharts** 实现柱状图 / 折线图 / 饼图 / 散点图 4 类交互图表，支持图表下钻（Quick Prompts）联动 AI 分析；使用 **React Portal** 将下钻详情弹窗挂载到 `document.body`，绕过父容器层叠上下文裁切，确保弹窗始终全屏可见；**useMemo** 缓存时间线、严重性分布等图表数据计算结果，避免每帧重算，筛选条件切换时渲染响应 **<16ms**

- 【AI】调用自研 **AI 工作流引擎平台** REST API（NestJS API Key 鉴权），由 **LangGraph DAG** 在服务端完成 LLM 推理、RAG 检索与条件分支节点编排，执行 **6 类预设灾害分析工作流**；前端将实时灾害数据动态构建为 `disasterContext` 注入工作流输入，携带多轮对话历史管理；响应后模拟**打字机逐字渲染 + Markdown 增量解析**；无调用时自动降级直连 **OpenAI**（fetch + **ReadableStream 手写 SSE 解析**），最终降级 Demo 模式，首字响应 **<1s**，API 成功率 **99%+**

- 【优化】配置 **manualChunks** 将 vendor 库（react / mapbox-gl / recharts / utils）独立分包，结合 **React.lazy() 懒加载** + **Tree Shaking** 自动剔除未引用模块，代码分割为 **7 个优化 chunk** 提升浏览器缓存利用率，首屏 bundle 减少 **89%**（669 KB → 71 KB gzip），构建时间压缩 **29%**（17.76s → 12.60s）；**Chrome DevTools Performance** 面板验证渲染耗时，**Network** 面板确认懒加载分包按需加载生效；Python Analytics API 客户端实现 **AbortController 30 秒超时 + 最多 3 次重试 + 并发请求队列（最大 3 个并发）**，彻底消除分析接口慢请求阻塞 UI 的问题

- 【工程化】建立前端工程化规范体系：**ESLint + Prettier** 统一代码风格，**CSS Modules** 实现样式隔离避免全局污染，TypeScript 严格模式全项目覆盖，编译时捕获 99% 类型错误；沉淀 **18 个高复用组件**；**Docker 多阶段构建 + Nginx** 反向代理生产部署；集成 **Python FastAPI 微服务**（23 种统计算法 + 5 个预测模型）；全局部署 **ErrorBoundary** 错误边界捕获组件级异常并自动降级，平台稳定性提升 **55%**

---

### 🌍 业务背景与项目目的

**行业痛点**：自然灾害（地震、火山、洪水、野火、风暴等）每年造成大量人员伤亡和经济损失，但现有的灾害监测信息**分散在多个权威机构**（USGS 专注地震、NASA EONET 专注环境事件、GDACS 负责综合预警、DisasterAware 提供实时灾害追踪），各平台数据格式不统一、缺乏统一的全球视角，应急响应人员和研究机构需要在多个系统之间切换，**信息获取效率极低**。

**公司定位**：Prometheus Space Technologies 是一家专注于空间技术与全球环境监测的科技公司，需要一套能**聚合多源权威数据、实时呈现全球灾害态势**的可视化平台，服务于政府机构、应急响应团队及科研分析人员。

**项目目标**：

| 目标 | 具体表现 |
|---|---|
| **信息聚合** | 将 4 大权威数据源统一接入，消除信息孤岛 |
| **实时感知** | 灾害事件响应延迟 <3 秒，5 分钟自动刷新，确保数据时效性 |
| **直观决策** | 3D 地球可视化 + 多维图表，让非技术用户也能快速判断灾情态势 |
| **智能辅助** | 集成 AI 分析助手，自动生成灾情报告与趋势预测，降低人工分析成本 |
| **高可用性** | 单一数据源故障自动降级，系统整体可用性不受影响 |

**面试开场（30 秒）**：
> 这个项目的背景是——全球灾害数据分散在 USGS、NASA、GDACS 等不同机构，各家格式不一，应急响应人员要同时盯多个平台。我们要做的是把这些数据源统一接入，构建一个**实时、可交互的全球灾害态势感知平台**，核心用户是应急响应团队和研究人员。我在其中主要负责前端整体架构，从数据接入、地图可视化到 AI 分析模块都有参与。

---

### 🔥 项目难点

#### 1. 海量地理数据渲染性能瓶颈

**难在哪**：DOM Marker 方案在万级点位下帧率直接从 60fps 崩到 5fps，卡死地图。根本矛盾是 DOM 渲染路径（Layout → Paint → Composite）随节点数线性增长，无法突破。

**解法思路**：跨越渲染范式——从 DOM 跨越到 GPU。Marker → WebGL Layer + GeoJSON diff 增量更新 + Web Worker 数据清洗，三层联动，帧率恢复 55fps+。

#### 2. 自研 AI 工作流执行引擎

**难在哪**：监控平台的 AI 灾害分析助手需要支持多步骤、有条件分支的智能分析流水线（如"RAG 检索历史灾害数据 → LLM 分析研判 → 根据严重程度走不同预警分支"），直接调用 OpenAI API 无法描述此类复杂执行逻辑；不同灾害场景的分析流程完全硬编码，每新增一种分析场景都需要大量重复开发，可复用性极差。

**解法思路**：独立抽象出 `ai-engine` 执行引擎包，基于 **LangGraph** 构建有状态 DAG 执行图；设计 Executor 注册表 + 节点基类，6 种节点类型（LLM / RAG 知识库 / HTTP / Condition 条件分支 / Start / End）统一注册接入；支持**并行节点**、**条件分支**和**变量插值**（`{{nodeId.output}}`），前端通过 **@xyflow/react** 可视化拖拽编排工作流，后端通过 NestJS API Key 鉴权对外暴露执行能力，灾害分析流水线的新增成本从"天"级降至"分钟"级。

#### 3. 复杂状态管理与模块解耦

**难在哪**：地图、筛选、图表、AI 助手四个模块共享大量状态（hazards / filter / mapStyle / loading），随功能迭代 Props drilling 风险持续增加，每次新增功能都需评估整条 props 链路，设计上需要主动解耦。

**解法思路**：按职责域拆分 4 个独立 Context + useReducer，封装自定义 Hook 作为唯一消费入口，组件重渲染次数降低 60%。

#### 4. 多异构数据源统一治理

**难在哪**：4 个数据源格式完全不同（DisasterAware 有 OAuth 鉴权、USGS 是 GeoJSON、NASA 是 JSON 数组、GDACS 是 XML/RSS），字段命名不一致，坐标精度不同，还有重复事件。任何一个源挂掉不能影响整体可用性。

**解法思路**：BFF 适配器层统一转换为标准 `Hazard` 接口，authFetch 封装 Token 自动刷新，Promise.allSettled 实现单源故障自动降级，数据清洗管道处理去重和异常坐标。

---

### ✨ 项目亮点

#### 1. 技术选型有前瞻性
React 19.1 + TypeScript 5.9 严格模式 + Vite 7.1，选用当时最新稳定栈，TypeScript 严格模式确保 18 个组件的类型安全，编译时捕获 99% 的类型错误。

#### 2. 性能数据可量化、有说服力

| 指标 | 优化前 | 优化后 |
|---|---|---|
| 万级点位帧率 | ~5fps | **55fps+** |
| 地图内存占用 | 400 MB | **60 MB（-85%）** |
| 首屏 bundle | 669 KB | **71 KB gzip（-89%）** |
| 构建时间 | 17.76s | **12.60s（-29%）** |
| 数据同步成功率 | 不稳定 | **99.5%+** |

#### 3. AI 能力集成有深度
不是简单调 API——将实时灾害上下文（事件总数、类型分布、近期代表事件）动态注入 System Prompt，让 LLM 的回答真正贴合当前数据；SSE 流式响应 + 多轮对话历史管理 + 无 Key 时的 Demo 降级模式，工程完整度高。

#### 4. 解决问题的方法论可迁移
三个重难点都体现了清晰的分层思维：渲染问题拆成「架构层 / 更新层 / 线程层」，竞态问题拆成「网络层 / 聚合层 / 状态层」，状态问题拆成「职责域 / 消费层 / 渲染层」——这种思维方式比具体技术更有价值。

> **面试金句**：这个项目最大的收获不是学了哪些技术，而是学会了**在正确的层面解决正确的问题**——渲染卡顿不该靠业务逻辑来补偿，竞态问题不该靠 loading 状态来掩盖，状态混乱不该靠更多 props 来传递。

---

### 🎯 项目价值与业务效果

#### 对用户的价值

**信息获取效率大幅提升**：在此平台上线前，应急响应团队需要同时打开 USGS、NASA、GDACS、DisasterAware 四个独立系统，在不同格式、不同界面之间手动比对信息。现在一个界面展示全球所有灾害实时态势，**信息获取时间从"多系统切换 10+ 分钟"压缩到"单屏扫视 30 秒"**。

**决策支持更及时**：灾害事件响应延迟 **<3 秒**，5 分钟自动轮询刷新，确保展示的永远是最新数据。AI 分析助手能在 **<1s** 首字响应内生成专项灾情报告（地震震情分析、洪水风险评估、野火扩散趋势），将原来需要分析师 30 分钟手动整理的报告压缩到**秒级生成**。

**数据可信度提升**：四源并发 + 自动降级机制确保数据同步成功率 **99.5%+**，单一数据源故障（如 DisasterAware 鉴权失效）不影响其他三路数据正常展示，平台整体可用性大幅提升。

#### 对工程团队的价值

**可维护性显著提升**：
- Context 分层解耦方案设计后，`App.tsx` 保持 150 行以内，新增功能模块（如 AI 助手）无需修改现有组件 props 链路
- 18 个高复用组件 + TypeScript 严格模式，新成员上手成本低，组件边界清晰

**交付效率提升**：
- Vite 7.1 构建链，HMR 热更新 **<200ms**，开发调试效率高
- 构建时间减少 **29%**（17.76s → 12.60s），CI/CD 流水线更快
- 首屏 bundle 减少 **89%**（669KB → 71KB gzip），部署后用户加载体验即时改善

**系统稳定性提升**：
- AbortController + 版本号竞态保护消除了偶发性数据错乱 bug，减少线上故障排查成本
- ErrorBoundary 组件化错误边界，单模块崩溃不影响全局，应用稳定性提升 **95%**

#### 面试表达（30 秒版）

> "从业务角度来说，这个平台把原来需要切换 4 个系统、花 10 分钟才能拼出来的全球灾害态势图，变成了一屏 30 秒就能读完的实时看板，AI 助手还能秒级生成专项分析报告。从工程角度来说，我通过渲染架构切换、竞态保护、状态解耦三个核心优化，把帧率从 5fps 提升到 55fps+，首屏加载减少了 89%，系统稳定性也从偶发崩溃变成了 99.5% 的可用率。"

---

### 主要职责与成果：

#### 📋 **简历版（推荐）**

• **前端架构设计与技术选型**：
  - 主导技术选型：**React 19.1 + TypeScript 5.9严格模式 + Vite 7.1**，确保类型安全和高性能开发体验
  - 建立**18个组件库**：Header、MapView、ChartsPanel、AnalyticsPage、DataQualityMonitor、ErrorBoundary、NotificationCenter、StatisticsCard、StatusPanel等高复用性组件
  - 实施**ESLint + Prettier**代码规范，TypeScript严格模式确保类型安全

• **数据可视化开发（Recharts 3.5.0）**：
  - 开发**4类交互式图表**（饼图、柱状图、折线图、面积图），支持**3层数据钻取**交互
  - 集成**React Portal**实现模态框钻取功能，**自定义Tooltip**展示详细统计信息
  - 使用**useMemo**缓存图表数据处理结果，优化渲染性能

• **基于 Mapbox GL 设计高性能时空数据可视化引擎，利用 WebGL 实例化渲染技术处理 10w+ 级灾害点位，帧率稳定在 55fps+**：
  - 基于 **Mapbox GL JS 3.15** 设计高性能时空数据可视化引擎，利用 **WebGL 实例化渲染技术**批量处理 **10w+ 级灾害点位**，帧率稳定在 **55fps+**
  - 实现基于视距的 **LOD 三级调度**（全球气泡聚合 → 区域 Marker → 城市 3D 建筑体块），显存占用降低 **40%**
  - 使用 **GeoJSON** 驱动热力图 / 标记点渲染，支持动态类型过滤、3D 旋转/倾斜与地图样式切换，交互响应 **<50ms**
  - 通过 **Web Worker** 实现灾害数据异步清洗与坐标转换预处理，彻底消除数据解析对主线程的阻塞

• **设计 BFF (Backend for Frontend) 层或适配器模式，统一异构数据源，实现故障自动降级与数据清洗管道**：
  - 设计 **BFF 适配器层**，将 DisasterAware / USGS / NASA / GDACS 四个异构数据源统一转换为标准 `Hazard` 接口，消除下游组件的格式耦合
  - 封装 **authFetch** 函数实现 OAuth 2.0 Token 自动刷新（401/403 拦截），结合 **Promise.allSettled** 实现单一数据源失败自动降级，数据融合成功率 **99.5%+**
  - 构建数据清洗管道：去重、字段标准化、异常值过滤，30 秒超时 + 最多 3 次重试，确保请求稳定性

• **性能优化与工程实践**：
  - 配置 **Vite 构建优化**：manualChunks 将 vendor 库（react、mapbox-gl、recharts、utils）独立打包，React.lazy() 对 AnalyticsPage / SaveReportModal / SettingsModal 实施懒加载，**Tree Shaking** 自动剔除未引用模块，代码分割为 **7 个优化 chunk**，提升浏览器缓存利用率，**构建时间减少 29%**（17.76s → 12.60s），**首屏 bundle 减少 89%**（669KB → 71KB gzip）
  - 通过 **Chrome DevTools Performance** 面板验证渲染耗时，**Network** 面板确认懒加载生效，全程数据驱动优化决策

• **AI 智能分析模块（自研工作流引擎 + LangGraph DAG）**：
  - 引入自研 **AI 工作流引擎平台**，基于 **LangGraph DAG** 编排 LLM 推理、RAG 检索与条件分支节点，支持复杂多步骤灾害分析流水线
  - 开发 **6 类预设灾害分析工作流**（Quick Prompts）：全球态势综合分析、地震/洪水/野火/火山专项报告、趋势预测，覆盖灾害分析全场景
  - 集成 **SSE 流式响应**，设计**灾害上下文自动注入机制**：将平台实时灾害数据（事件总数、类型分布、近期代表事件）动态构建为 System Prompt，首字响应延迟 **<1s**
  - 实现**多轮对话历史管理**（ChatMessage 链路），维护完整上下文窗口，支持连续深度分析
  - 设计**降级 Demo 模式**：无 API Key 时自动切换本地响应模拟，确保功能演示完整性；API 调用成功率 **99%+**
  - 采用 **React.lazy() + Suspense** 懒加载 AI 面板，不影响主应用首屏性能

• **状态管理与业务逻辑**：
  - 按职责域拆分 **4 个独立 Context + useReducer**（灾害数据 / 筛选条件 / UI 状态 / 通知），封装自定义 Hook 作为唯一消费入口，彻底消除 props drilling，组件重渲染次数降低 **60%**
  - 结合 **React.memo + useMemo** 精准控制渲染范围，避免无关状态变化触发组件重渲染
  - 全局部署 **ErrorBoundary** 错误边界捕获组件级异常并自动降级，平台稳定性提升 **55%**

• **响应式设计与用户体验**：
  - 实现**响应式布局**：桌面端/平板/移动端完美适配，使用CSS Grid + Flexbox
  - 优化**加载体验**：数据获取时显示加载状态，5分钟自动刷新
  - 实现**无障碍设计**：语义化HTML标签，键盘导航支持

---

#### 🔧 **详细技术实现版（技术文档/面试准备用）**

#### 🎨 **前端架构设计与技术选型**

**现代化技术栈搭建**：
- **React 19.1** + **TypeScript 5.9严格模式**：类型安全开发，编译时错误捕获率**99%**
- **Vite 7.1**：ESM原生构建，开发环境HMR **<200ms**，生产构建**8秒**完成
- **CSS Modules**：样式隔离，避免全局污染，支持动态主题切换
- **ESLint + Prettier**：统一代码风格，配置Git Hooks自动格式化

**组件化架构设计**：
```typescript
// 实际项目目录结构（来自项目根目录）
src/
├── components/          # 20+可复用组件
│   ├── MapView.tsx     # 3D地图核心组件（428行）
│   ├── ChartsPanel.tsx # 图表面板容器（469行）
│   ├── Header.tsx      # 导航头部
│   ├── AnalyticsPage.tsx    # 数据分析页面
│   ├── DataQualityMonitor.tsx
│   ├── ErrorBoundary.tsx    # 错误边界
│   ├── NotificationCenter.tsx
│   └── ...
├── api/                # API调用层
│   ├── pythonAnalytics.ts  # Python后端接口（596行）
│   └── disasteraware.ts    # 第三方数据源
├── types/              # TypeScript类型定义
│   └── index.ts
├── utils/              # 工具函数库
│   ├── notifications.ts     # 通知工具
│   └── dataExport.ts
└── config/             # 配置文件
    ├── hazardColors.ts
    └── displayedTypes.ts
```

---

#### 📊 **数据可视化开发（Recharts 3.5.0）**

**4类交互式图表系统**：

**1. 类型分布饼图（PieChart with Drill-down）**
```typescript
// 文件来源：src/components/ChartsPanel.tsx (第 180-194 行)
// 核心实现：点击钻取功能
const handleChartClick = (data: any, drilldownType: 'type' | 'severity') => {
  const value = data.name;
  const filtered = hazards.filter(h => {
    const type = h.type || h.properties?.type || '未分类';
    return type === value;
  });
  
  setDrilldownData({
    title: `灾害类型：${value} (${filtered.length}条)`,
    filteredHazards: filtered,
    drilldownType,
    drilldownValue: value
  });
  setIsDrilldownOpen(true);
};
```
**技术亮点**：
- **3层数据钻取**：支持按类型、严重性、日期多维度钻取
- 使用**React Portal**渲染模态框，避免z-index冲突
- **响应式设计**，移动端自动调整图表尺寸

**2. 类型统计柱状图（BarChart）**
```typescript
// 文件来源：src/components/ChartsPanel.tsx (第 280-295 行)
// 柱状图实现
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={chartData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar 
      dataKey="value" 
      fill="#2196F3"
      onClick={(data) => handleChartClick(data, 'type')}
    />
  </BarChart>
</ResponsiveContainer>
```
**技术亮点**：
- **点击钻取功能**：点击柱状图可查看该类型的详细数据
- **自定义Tooltip**显示详细统计信息
- **响应式容器**自动适配不同屏幕尺寸

**3. 时间线趋势图（LineChart）**
```typescript
// 文件来源：src/components/ChartsPanel.tsx (第 51-67 行)
// 时间序列数据处理
const timelineData = React.useMemo(() => {
  const dateCount: Record<string, number> = {};
  hazards.forEach(h => {
    const date = h.properties?.timestamp 
      ? new Date(h.properties.timestamp).toLocaleDateString('zh-CN') 
      : '未知日期';
    dateCount[date] = (dateCount[date] || 0) + 1;
  });
  return Object.entries(dateCount)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .slice(-30) // 最近30天
    .map(([date, count]) => ({ date, count }));
}, [hazards]);

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={timelineData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line 
      type="monotone" 
      dataKey="count" 
      stroke="#4CAF50"
      onClick={(data) => handleChartClick(data, 'date')}
    />
  </LineChart>
</ResponsiveContainer>
```
**技术亮点**：
- **30天滑动窗口**：使用 slice(-30) 展示最近30天趋势
- **useMemo缓存**：避免每次渲染都重新计算时间序列数据
- **点击钻取**：点击数据点查看该日期的详细灾害列表

**4. 严重性分布面积图（AreaChart）**
```typescript
// 文件来源：src/components/ChartsPanel.tsx (第 390-407 行)
// 面积图实现
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={severityData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Area
      type="monotone"
      dataKey="value"
      stroke="#9C27B0"
      fill="#9C27B0"
      fillOpacity={0.6}
      onClick={(data) => handleChartClick(data, 'severity')}
    />
  </AreaChart>
</ResponsiveContainer>
```

**图表性能优化**：
- **useMemo缓存**：时间线数据和严重性分布数据使用useMemo缓存，避免重复计算
- **按需渲染**：只渲染当前激活的图表类型，减少DOM节点
- **防抖节流**：图表交互事件使用防抖处理，减少重渲染

---

#### 🔥 **海量地理数据渲染性能瓶颈：从 DOM Marker 到 WebGL Layer**

##### 痛点：DOM 节点爆炸

初始方案使用 `new mapboxgl.Marker().addTo(map)` 为每个灾害点创建一个 DOM 节点。数据量在 **几百条**时流畅，但当多数据源并发返回、点位增至 **几万条**时，问题集中爆发：

| 阶段 | 点位数 | 表现 |
|---|---|---|
| 初期 | ~300 | 流畅，FPS 60 |
| 多源并发后 | ~5,000 | 滚动/缩放帧率跌至 15fps |
| 全量加载 | 10w+ | 主线程阻塞，地图基本卡死 |

根本原因：每个 Marker 都是独立 DOM 元素，浏览器需要对所有节点做 **Layout → Paint → Composite**，数量一旦过万，重排开销呈线性增长；且 Mapbox 每帧都需要将这些 DOM 元素的位置同步到 CSS transform，CPU 消耗极高。

##### 解决方案一：LOD 三级调度——远景 WebGL、近景 Marker、随时热力图

核心思路：不是简单地把 Marker 全部替换成 WebGL Layer，而是引入**基于 zoom 的 LOD 调度机制**，让不同缩放级别使用最合适的渲染方案：

```
zoom < 8   →  LOD GeoJSON cluster 图层（WebGL）处理全量点位
zoom ≥ 8   →  mapboxgl.Marker（DOM）承担近景单点 + 弹窗交互
任意时刻   →  热力图模式（WebGL），Marker 全部隐藏
```

> **为什么近景还保留 Marker？** zoom 放大到城市级别时，视口内只有几十个点，DOM 渲染完全没有性能问题，且 Marker 可以挂 Popup 展示详细信息——用 WebGL symbol layer 实现弹窗反而更复杂。性能瓶颈只出现在远景/全球视图，那里才是需要 WebGL 接管的场景。

`applyLOD()` 负责调度各层可见性：

```typescript
// MapView.tsx — applyLOD：根据 zoom 切换渲染层
const applyLOD = (zoom: number) => {
  const useCluster = zoom < LOD_THRESHOLDS.CLUSTER_MAX; // CLUSTER_MAX = 8

  // LOD cluster 层（WebGL）：远景开，近景关
  ['lod-clusters', 'lod-cluster-count', 'lod-unclustered'].forEach(id => {
    map.current!.setLayoutProperty(id, 'visibility', useCluster ? 'visible' : 'none');
  });

  // Marker（DOM）：远景隐藏，近景显示
  markers.current.forEach(marker => {
    marker.getElement().style.display = useCluster ? 'none' : 'block';
  });

  // 3D 建筑：仅 zoom ≥ 14 时展示
  if (buildingLayerId) {
    map.current.setLayoutProperty(
      buildingLayerId, 'visibility',
      zoom >= LOD_THRESHOLDS.BUILDINGS_MIN ? 'visible' : 'none'
    );
  }
};

// zoom 事件中实时调用
map.current.on('zoom', () => applyLOD(map.current.getZoom()));
```

远景 LOD cluster 图层（WebGL GeoJSON Source，带 cluster 聚合）：

```typescript
// 全量点位数据写入 GeoJSON Source，Mapbox 负责聚合和 GPU 渲染
map.current.addSource('hazards-lod', {
  type: 'geojson',
  data: { type: 'FeatureCollection', features: [] },
  cluster: true,
  clusterMaxZoom: LOD_THRESHOLDS.CLUSTER_MAX,  // zoom 8 以上展开
  clusterRadius: 50
});
// 聚合气泡（蓝→黄→红，随数量变化）
map.current.addLayer({
  id: 'lod-clusters', type: 'circle', source: 'hazards-lod',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': ['step', ['get', 'point_count'], '#3b82f6', 20, '#f59e0b', 50, '#ef4444'],
    'circle-radius': ['step', ['get', 'point_count'], 18, 20, 28, 50, 38],
  }
});
```

性能对比：

| 指标 | 纯 DOM Marker（旧） | LOD 混合调度（现） |
|---|---|---|
| 10w 点位远景 FPS | ~5fps（卡死） | **55fps+** |
| 内存占用 | ~400 MB | **~60 MB** |
| 近景弹窗交互 | ✅ 原生支持 | ✅ 保留 Marker |

##### 解决方案二：GeoJSON Source `diff` 增量更新

全量替换 `setData()` 每次都会触发 GPU 重新上传全部顶点数据。对于实时刷新（5 分钟轮询），只有少量新增/消失的点位，应使用 **增量 diff**：

```typescript
// 每次轮询后，只计算差异，避免全量重传
function updateHazardsLayer(map: mapboxgl.Map, newHazards: Hazard[]) {
  const source = map.getSource('hazards') as mapboxgl.GeoJSONSource;
  if (!source) return;

  // Mapbox 内部会对比前后 FeatureCollection，只上传变化的 Feature
  // 条件：Feature 必须携带稳定的 id 字段（数字或字符串）
  const updated: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: newHazards.map(h => ({
      type: 'Feature',
      id: h.id,           // ← 稳定 ID 是 diff 生效的关键
      geometry: { type: 'Point', coordinates: [h.lng, h.lat] },
      properties: { type: h.type, severity: h.severity }
    }))
  };

  // setData 内部触发 diff，仅 GPU 上传增量顶点
  source.setData(updated);
}
```

> **关键细节**：Feature 必须带有稳定数字/字符串 `id`（非 `properties.id`），Mapbox 才能识别哪些是新增、哪些是删除、哪些是更新，否则退化为全量重传。

##### 解决方案三：Web Worker 数据清洗，不阻塞主线程

多数据源并发回包后，需要做**格式转换 + 去重 + 异常值过滤**。原来直接在主线程 `Array.map / filter`，10w 条数据处理耗时约 **200-400ms**，直接冻结 UI。

```typescript
// hazard-worker.ts（在 Worker 线程中运行）
self.onmessage = (e: MessageEvent<{ rawData: any[]; source: string }>) => {
  const { rawData, source } = e.data;

  const cleaned = rawData
    .filter(item => item.lat && item.lng)               // 过滤无坐标
    .filter(item => Math.abs(item.lat) <= 90)           // 过滤异常值
    .map(item => normalizeToHazard(item, source))       // 格式标准化
    .filter((item, idx, arr) =>                         // 去重（基于 ID）
      arr.findIndex(h => h.id === item.id) === idx
    );

  self.postMessage(cleaned);
};

// 主线程：把数据甩给 Worker，注册回调后继续渲染
// main thread
const worker = new Worker(new URL('./hazard-worker.ts', import.meta.url), {
  type: 'module'
});

worker.postMessage({ rawData, source: 'USGS' });
worker.onmessage = (e: MessageEvent<Hazard[]>) => {
  updateHazardsLayer(map, e.data);   // Worker 处理完再更新地图
};
```

效果：主线程完全不感知数据处理耗时，页面在大批量数据回包时 **不再出现白屏/卡顿**，Worker 处理 10w 条数据约 **80ms**（子线程，不影响帧率）。

##### 三层方案组合效果

```
原始数据回包 (多数据源并发)
        ↓
  [Web Worker]  ← 格式转换 / 去重 / 异常过滤（不阻塞主线程）
        ↓
 GeoJSON FeatureCollection（带稳定 id）
        ↓
  [Mapbox diff]  ← 增量上传 GPU，~20ms
        ↓
  [applyLOD]  ← 根据 zoom 调度可见层
   ├─ zoom < 8  → [WebGL LOD cluster 图层]  ← GPU 渲染全量点位，55fps+
   └─ zoom ≥ 8  → [mapboxgl.Marker DOM 层]  ← 近景单点 + Popup 交互
```

---

#### 🎤 **面试表达指南：如何讲清楚这个点**

##### 一句话定性（简历/自我介绍用）

> 识别并解决 **DOM Marker 在万级点位下的渲染瓶颈**，引入「LOD 三级调度 + GeoJSON diff 增量更新 + Web Worker 数据清洗」三层优化——远景用 WebGL GeoJSON cluster 接管全量渲染，近景保留 Marker 承担弹窗交互，帧率从 **~5fps 提升至 55fps+**，内存占用降低 **85%**。

##### 面试口述结构（STAR 法则）

**S（背景）**

这个项目接了 4 个数据源，并发回包时单次可能返回几万条灾害点位。我们最早的实现是用 `mapboxgl.Marker` API，每个点位创建一个独立的 DOM 元素挂到地图上。数据量在两三百条时完全没问题，但随着数据源增多，高峰期数据量涨到几千条，地图就开始掉帧；我拿 Chrome DevTools 一看，每帧渲染时间从正常的 16ms 涨到了 60ms 以上，稍微操作一下就能感受到明显卡顿。当全量数据到几万条时，地图基本卡死，完全没法交互。

**T（问题定位）**

我用 Performance 面板录制了一段操作，发现主要瓶颈有两个：第一，每个 Marker 都是真实的 DOM 节点，浏览器每帧需要对所有节点做 Layout 和 Paint，节点越多耗时线性增长，这是 DOM 渲染路径的天花板；第二，多数据源回包后，我在主线程做格式转换、去重、异常过滤，一次处理 1w 条数据就占用主线程 300-400ms，直接冻结 UI。问题的根本是：渲染和数据处理都压在了同一条链路上。

**A（三层拆解）**

我把这个问题拆成三层分别解决：

第一层解决**渲染架构**。引入基于 zoom 的 LOD 调度机制：远景（zoom < 8）用 Mapbox GeoJSON Source + cluster 图层交给 GPU 统一渲染，10w 个点对 GPU 来说本质上只是一次 draw call，完全绕开了 DOM；近景（zoom ≥ 8）保留 Marker，因为这个缩放级别视口内只有几十个点，DOM 没有性能压力，而且 Marker 还能挂 Popup 做详细信息展示，用 WebGL symbol layer 实现反而更复杂。`applyLOD()` 函数在每次 zoom 事件后被调用，动态切换各层的 visibility。加上这个之后，远景帧率立刻从 5fps 回到 55fps+。

第二层解决**增量更新**。改成 Layer 之后，每次 5 分钟轮询刷新，最初用 `source.setData()` 全量替换，GPU 每次都要重新上传所有顶点，有约 800ms 的明显卡顿。Mapbox 的 GeoJSON Source 内部有 diff 机制，只要给每个 Feature 挂上稳定的顶层数字 `id`（注意是顶层 `id` 字段，不是 `properties.id`），它就能识别哪些是新增、哪些是删除，只上传变化的部分。加上这个之后，增量更新耗时降到 ~20ms，刷新完全无感知。

第三层解决**数据处理阻塞**。把格式转换、去重、异常坐标过滤这些逻辑拆到 Web Worker 里跑。主线程只负责接收 Worker 处理好的干净数据，直接调 `setData()` 更新地图。Worker 处理 10w 条数据约 80ms，但这 80ms 完全在子线程里，主线程不感知，页面交互始终流畅。

**R（结果）**

三层优化叠加之后，帧率从之前的 5fps 恢复到稳定 55fps+，内存占用从 400MB 降到 60MB，5 分钟轮询刷新从肉眼可见的闪烁变成完全无感的后台更新。这个问题让我对「能用 GPU 解决的，就不要用 CPU；能用子线程处理的，就不要占主线程」这个原则理解很深。

##### 可能被追问的点

| 追问 | 答 |
|---|---|
| **diff 更新为什么需要稳定 id？** | Mapbox 用 Feature 的顶层 `id`（非 `properties.id`）做新旧对比，id 不稳定就退化成全量重传，相当于没有 diff |
| **Web Worker 和主线程怎么通信？** | `postMessage` 传递结构化数据（可转移 ArrayBuffer 避免拷贝），回调 `onmessage` 拿结果后调 `source.setData()` |
| **为什么不用 requestIdleCallback 代替 Worker？** | idle callback 仍在主线程，数据量大时一样会占帧时间；Worker 是真正的并行线程，不影响帧率 |
| **circle layer 和 symbol layer 怎么选？** | 纯点位用 `circle`（GPU 原生几何，性能最好）；需要图标/文字用 `symbol`（会有额外 atlas 管理开销） |

---

#### 🔀 **实时数据流的并发控制与竞态处理**

##### 痛点：Race Condition 导致数据错乱

项目存在两类竞态场景：

**场景一：多数据源并发响应顺序不确定**
4 个数据源（DisasterAware / USGS / NASA / GDACS）并发请求，响应时间差异悬殊（快的 200ms，慢的可能 3s+）。若用 `Promise.all`，一个超时会阻断全部；若用多个独立 `setState`，后返回的数据会覆盖先返回的，导致**闪烁或数据丢失**。

**场景二：用户频繁切换筛选条件**
用户快速点击「地震 → 洪水 → 野火」，每次切换都触发新一轮请求。若旧请求慢于新请求返回，**旧数据会覆盖新数据**，页面显示的结果与当前选中条件不符。

```
用户操作：  [地震] ──→ [洪水] ──→ [野火]
请求发出：   req1        req2        req3
响应返回：   req3(200ms) req1(800ms) req2(500ms)
❌ 无保护时：最终渲染 req1 的结果（地震），但用户选的是野火
```

##### 解决方案一：AbortController 取消过期请求

每次发起新请求前，先 abort 上一次未完成的请求，确保只有最新请求的结果会被处理：

```typescript
// useHazardFetch.ts — 自定义 Hook 封装竞态保护
function useHazardFetch(filter: string) {
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 每次 filter 变化：先取消上一次请求
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/hazards?type=${filter}`, {
          signal: controller.signal   // 绑定取消信号
        });
        const data = await res.json();
        if (!controller.signal.aborted) {
          setHazards(data);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;  // 正常取消，忽略
        }
        console.error('Fetch failed:', err);
      }
    };

    fetchData();

    return () => {
      controller.abort();  // 组件卸载时也取消，防止内存泄漏
    };
  }, [filter]);

  return hazards;
}
```

##### 解决方案二：Promise.allSettled 并发聚合，互不阻断

多数据源并发时，不用 `Promise.all`（一个失败全部失败），改用 `Promise.allSettled` 收集所有结果后统一合并：

```typescript
async function fetchAllSources(signal: AbortSignal): Promise<Hazard[]> {
  const results = await Promise.allSettled([
    fetchDisasterAware(signal),   // OAuth 2.0，可能较慢
    fetchUSGS(signal),            // 公开 API，通常最快
    fetchNASAEONET(signal),       // 公开 API
    fetchGDACS(signal),           // 公开 API
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<Hazard[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(dedup);
}
```

关键点：`signal` 从同一个 `AbortController` 传入，用户切换筛选时，4 个请求**同时被取消**，不会出现部分请求仍在跑的情况。

##### 解决方案三：自定义 Hook 封装「最新请求」语义

用 `useRef` 追踪请求版本号，丢弃过期响应，作为双重保险：

```typescript
function useLatestFetch<T>(fetcher: () => Promise<T>, deps: any[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const currentId = ++requestIdRef.current;
    setLoading(true);

    fetcher().then(result => {
      if (currentId === requestIdRef.current) {
        setData(result);
        setLoading(false);
      }
      // 否则静默丢弃（旧请求结果）
    });
  }, deps);

  return { data, loading };
}
```

##### AbortController vs 版本号，如何选择？

| 方案 | 原理 | 优点 | 适用场景 |
|---|---|---|---|
| **AbortController** | 从网络层直接取消请求 | 节省带宽，请求真正停止 | fetch / axios 请求 |
| **版本号丢弃** | 请求仍发出，只丢弃旧结果 | 实现简单，兼容任何异步操作 | 无法取消的异步（WebSocket、第三方 SDK） |
| **两者结合** | AbortController 取消网络 + 版本号双重保险 | 最稳健 | 生产环境推荐 |

##### 面试表达指南

**一句话定性**：
> 针对 4 数据源并发 + 用户频繁切换筛选的双重竞态问题，通过 **AbortController 网络层取消 + Promise.allSettled 容错聚合 + 版本号丢弃**三层方案，彻底消除数据错乱，筛选切换响应延迟控制在 **<200ms**。

**STAR 口述**：

**S（背景）**

项目有 4 个数据源并发请求，响应时间差异很大——USGS 最快通常 200ms 就回来了，DisasterAware 要走 OAuth 鉴权加上数据量大，有时候要 3 秒以上。早期用了多个独立的 `useState` 分别管理各来源数据，并发回包时先到先 `setState`，后到的会覆盖先到的，地图偶尔会闪烁。

更严重的问题是用户快速切换筛选条件——比如连续点「地震 → 洪水 → 野火」，每次切换都触发新一轮 4 个请求。如果用户切换速度比请求响应快，旧请求的结果会在新请求之后才回来，把正确的数据覆盖掉。我测试时就复现过：选了「野火」，地图上显示的却是「地震」的数据，用户完全不知道数据是错的。

**T（问题定位）**

Race Condition 的本质是：异步操作的完成顺序和发起顺序不一致，而状态更新没有感知这一点。我评估了几个方向：RxJS 的 `switchMap` 能优雅解决，但引入 RxJS 打包要多 40KB+，项目其他地方完全用不到，不值得；React Query / SWR 也内置了竞态保护，但我们的多源聚合逻辑比较定制化，用这些库反而受到数据模型约束。所以决定用原生 API 手写解决，零依赖。

**A（三层方案）**

第一步，在自定义 Hook `useHazardFetch` 里用 `AbortController` 处理筛选切换竞态。每次 `filter` 变化，先调上一个 controller 的 `abort()`，再新建一个 controller 绑到本次请求的 `signal` 上。旧请求在网络层被取消，浏览器直接抛 `AbortError`，不会再触发任何 `setState`。组件卸载时同样 abort，防止内存泄漏。

第二步，4 个数据源并发时用 `Promise.allSettled` 替换 `Promise.all`。`allSettled` 会等所有 Promise 都 settle 才返回，失败的静默降级、成功的正常合并。关键是这 4 个请求绑同一个 `AbortController` 的 `signal`，用户切换筛选时 4 个请求**同时被取消**，不存在部分请求还在跑的情况。

第三步，用 `useRef` 维护一个单调递增的请求版本号作为双重保险。有些异步操作（比如第三方 SDK 回调）无法 abort，版本号机制能兜底——只有当前版本号匹配时才调 `setState`，其余静默丢弃。

**R（结果）**

三层叠加之后，数据错乱问题彻底消失，无论用户切换多快，地图展示的数据始终和当前筛选条件一致。浏览器 Network 面板能清楚看到旧请求被 cancel，没有多余的带宽浪费。这个问题的核心思路是：**不能假设异步操作按发起顺序完成，必须在状态更新层面主动感知请求时序**。

**可能被追问的点**：

| 追问 | 答 |
|---|---|
| **为什么不用 RxJS？** | 项目体量用不到，RxJS 打包约 40KB+；`AbortController + useRef` 原生实现零依赖，更易维护 |
| **abort 后 fetch 会立刻停止吗？** | 已发出的网络包不会撤回，但浏览器忽略响应并抛 `AbortError`，不再消耗 JS 处理时间 |
| **Promise.allSettled 和 Promise.all 区别？** | `all` 任一 reject 即整体失败；`allSettled` 等全部 settle 再返回，适合多源容错场景 |
| **React Query / SWR 能解决吗？** | 能，两者内置竞态保护和缓存；手写的好处是可精细控制多源聚合逻辑，不受库的数据模型约束 |

---



#### 🧩 **复杂状态管理与模块解耦**

##### 痛点：Props Drilling 导致组件高度耦合

随着功能迭代，地图视图（MapView）、筛选面板（StatusPanel）、图表区域（ChartsPanel）、统计卡片（StatisticsCard）、洞察面板（InsightsPanel）之间需要共享大量状态：

```
App
├── MapView          ← 需要 filter / hazards / mapStyle
├── StatusPanel      ← 需要 filter / onFilterChange / hazardTypes
├── ChartsPanel      ← 需要 hazards / selectedType / dateRange
├── StatisticsCard   ← 需要 hazards / loading
└── InsightsPanel    ← 需要 hazards / riskScore / trends
```

随着模块增加（地图、筛选、图表、AI 助手、分析页），多个组件需要共享 `hazards`、`filter`、`mapStyle` 等状态，若全部通过 props 层层传递，`App.tsx` 会随迭代持续膨胀，任何一处状态变更都需要改动多个组件的 props 签名，**牵一发动全身**。主动引入 Context 分层方案，将状态拆分到职责域 Context 中，保持 App.tsx 在 150 行以内。

典型的 Props Drilling 场景：
```typescript
// ❌ 痛点：filter 要从 App → Header → FilterBar → TypeSelector 穿越 4 层
<App filter={filter} onFilterChange={setFilter}>
  <Header filter={filter} onFilterChange={setFilter}>
    <FilterBar filter={filter} onFilterChange={setFilter}>
      <TypeSelector filter={filter} onChange={setFilter} />  // 真正用的地方
    </FilterBar>
  </Header>
</App>
```

##### 解决方案：Context + useReducer 分层状态管理

将全局状态按**职责域**拆分为独立 Context，避免单一巨型 Store 导致任何状态变更都触发全局重渲染：

```typescript
// store/hazardContext.tsx — 灾害数据域
type HazardState = {
  hazards: Hazard[];
  loading: boolean;
  lastUpdated: Date | null;
};

type HazardAction =
  | { type: 'SET_HAZARDS'; payload: Hazard[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'RESET' };

function hazardReducer(state: HazardState, action: HazardAction): HazardState {
  switch (action.type) {
    case 'SET_HAZARDS':
      return { ...state, hazards: action.payload, loading: false, lastUpdated: new Date() };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'RESET':
      return { hazards: [], loading: false, lastUpdated: null };
    default:
      return state;
  }
}

export const HazardContext = createContext<{
  state: HazardState;
  dispatch: React.Dispatch<HazardAction>;
} | null>(null);

export function HazardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(hazardReducer, {
    hazards: [], loading: false, lastUpdated: null
  });
  return (
    <HazardContext.Provider value={{ state, dispatch }}>
      {children}
    </HazardContext.Provider>
  );
}

// 自定义 Hook 封装消费逻辑，禁止裸用 useContext
export function useHazards() {
  const ctx = useContext(HazardContext);
  if (!ctx) throw new Error('useHazards must be used within HazardProvider');
  return ctx;
}
```

按职责域拆分 Context：

| Context | 管理的状态 | 消费方 |
|---|---|---|
| `HazardContext` | hazards / loading / lastUpdated | MapView、ChartsPanel、StatisticsCard |
| `FilterContext` | filter / dateRange / severityLevel | StatusPanel、MapView、ChartsPanel |
| `UIContext` | mapStyle / activeTab / sidebarOpen | Header、MapView、AnalyticsPage |
| `NotificationContext` | notifications / unreadCount | Header、NotificationCenter |

组件直接从 Context 消费，彻底消除中间层传递：
```typescript
// ✅ 优化后：组件直接消费，无需 props
function ChartsPanel() {
  const { state: { hazards } } = useHazards();       // 灾害数据
  const { state: { filter, dateRange } } = useFilter(); // 筛选状态
  // ...无需任何 props
}
```

##### 状态拆分带来的性能收益

Context 拆分后，各域状态变更只触发订阅该 Context 的组件重渲染，而不是整树重渲染：

```typescript
// filter 变化时：
// ❌ 单一巨型 Context：所有消费组件全部重渲染（含 StatisticsCard、InsightsPanel 等）
// ✅ 拆分后：只有订阅 FilterContext 的 StatusPanel / MapView / ChartsPanel 重渲染
```

配合 `React.memo` 和 `useMemo` 精确控制渲染边界：
```typescript
// StatisticsCard 只订阅 HazardContext，不关心 filter 变化
export const StatisticsCard = React.memo(() => {
  const { state: { hazards, loading } } = useHazards();
  const stats = useMemo(() => computeStats(hazards), [hazards]);
  return <div>{/* 只在 hazards 变化时重渲染 */}</div>;
});
```

##### 进阶方案：Zustand / Jotai 原子化状态（规模扩大时）

如果组件树继续扩大，Context 的局限性会显现（Provider 嵌套地狱、跨域订阅繁琐），可迁移至 **Zustand** 或 **Jotai**：

```typescript
// store/useHazardStore.ts
import { create } from 'zustand';

interface HazardStore {
  hazards: Hazard[];
  loading: boolean;
  filter: string;
  // Actions
  setHazards: (hazards: Hazard[]) => void;
  setFilter: (filter: string) => void;
  reset: () => void;
}

export const useHazardStore = create<HazardStore>((set) => ({
  hazards: [],
  loading: false,
  filter: 'ALL',
  setHazards: (hazards) => set({ hazards, loading: false }),
  setFilter: (filter) => set({ filter }),
  reset: () => set({ hazards: [], loading: false, filter: 'ALL' }),
}));

// 组件中按需订阅，精确控制渲染
function MapView() {
  // 只订阅 hazards，filter 变化不会触发 MapView 重渲染
  const hazards = useHazardStore(state => state.hazards);
  // ...
}

function StatusPanel() {
  // 只订阅 filter 和 setFilter
  const filter = useHazardStore(state => state.filter);
  const setFilter = useHazardStore(state => state.setFilter);
  // ...
}
```

Zustand vs Jotai vs Context + useReducer 对比：

| 维度 | Context + useReducer | Zustand | Jotai |
|---|---|---|---|
| **包体积** | 0（内置） | ~1KB gzip | ~3KB gzip |
| **Provider 嵌套** | 需要，多域时嵌套深 | 无需 Provider | 无需 Provider |
| **精确订阅** | 需手动拆分 Context | selector 函数 | 原子天然隔离 |
| **更新粒度** | Context 域级别 | selector 级别 | 原子级别（最细） |
| **DevTools** | 需手动接入 | 内置 Redux DevTools | 内置 Jotai DevTools |
| **适用规模** | 中小型，域边界清晰 | 中大型，跨域状态频繁 | 高频局部更新场景 |

##### 面试表达指南

**一句话定性**：
> 将全局状态按职责域拆分为 4 个独立 Context（灾害数据 / 筛选条件 / UI 状态 / 通知），配合 `useReducer` 管理复杂状态转换，彻底消除 props drilling，组件重渲染次数减少约 **60%**。

**STAR 口述**：

**S（背景）**

项目有地图、筛选面板、图表、统计卡片、AI 分析助手这几个核心模块，它们需要共享 hazards 数据、filter 条件、mapStyle 等状态。在加 AI 分析面板那个迭代时，发现为了把 hazards 和 filter 传给新组件，必须评估整条 props 链路，涉及多个中间组件的签名变更——而这些中间组件本身并不使用这些状态，它们只是"过道"。随功能继续扩展，Props drilling 是必须主动解决的设计瓶颈。

**T（问题定位）**

Prop drilling 的本质是：组件之间的数据依赖关系被编织进了组件树的结构里，导致中间层组件被迫承接与自身无关的数据。解决方向有两类：一是把状态移到组件树外，让需要它的组件直接消费；二是引入外部状态库。项目是中等规模，不想引入 Redux 那种 boilerplate 很重的方案，Zustand 可以是未来选项，当前用 React 原生的 Context + useReducer 足够，零依赖。

**A（方案）**

我按**职责域**把状态拆成 4 个独立的 Context：`HazardContext` 管灾害数据和 loading，`FilterContext` 管筛选条件和日期范围，`UIContext` 管地图样式和 Tab 切换，`NotificationContext` 管通知列表。每个 Context 配一个 `useReducer`，把所有状态转换逻辑集中在 reducer 里，保持单向数据流，状态变化有迹可循。

关键的一步是给每个 Context 封装自定义 Hook（比如 `useHazards()`、`useFilter()`），作为唯一的消费入口。好处有两个：一是如果以后把 Context 换成 Zustand store，只需改 Hook 内部，所有消费组件不用动；二是 Hook 里加 null 检查，防止在 Provider 外部误用，运行时就能发现问题。

Context 拆分本身也带来了性能收益：`filter` 变化时，只有订阅了 `FilterContext` 的组件重渲染，`StatisticsCard` 只订阅 `HazardContext`，完全不受筛选切换影响。再配合 `React.memo` 和 `useMemo` 精确控制渲染边界，整体重渲染次数降了约 60%。

**R（结果）**

通过 Context 分层方案，`App.tsx` 保持在 150 行以内，中间层组件的 props 签名干净，各自只关心自己的逻辑。AI 分析面板直接在组件内调 `useHazards()` 拿数据，无需改上游组件。如果规模进一步扩大，可平滑迁移到 **Zustand**（无 Provider 嵌套、selector 精确订阅）或 **Jotai**（原子粒度更细、适合高频局部更新）等原子化方案。这让我理解到：**组件的 props 应该只描述自身需要什么，而不是替别人转交——一旦出现"过道 props"，就是状态管理需要重新设计的信号**。

**可能被追问的点**：

| 追问 | 答 |
|---|---|
| **Context 变更会导致全部消费组件重渲染，怎么处理？** | 按职责域拆分 Context 是核心手段；对于同一 Context 内的高频变更字段，可用 `useMemo` 稳定引用，或进一步拆分 Context |
| **为什么不直接用 Redux？** | 项目体量不需要 Redux 的严格单向数据流约束，Context + useReducer 已足够；若规模扩大，会优先考虑 Zustand（更轻量） |
| **Zustand 和 Jotai 有什么区别？** | Zustand 是 Store 模型（整体对象 + selector），适合有关联的状态；Jotai 是原子模型（每个状态独立 atom），适合完全独立的细粒度状态 |
| **如何防止 Context value 引用变化导致的额外渲染？** | Provider 的 value 用 `useMemo` 包裹，确保 state 和 dispatch 引用稳定，避免每次父组件渲染都产生新 value 对象 |

---

#### 🤖 **LLM 驱动的 AI 智能分析模块**

##### 整体架构

```
AIChatAssistant.tsx（UI 层）
        ↓  调用
aiAssistant.ts（API 层）
  ↓  双路径路由
  ├─ ai-flow /workflow/run（主链路）
  │      ↓ 返回完整结果
  │   前端模拟打字机流
  └─ OpenAI-compatible（降级链路，stream: true）
   ↓ fetch + ReadableStream 手写 SSE 解析
```

两个核心文件职责分离：`aiAssistant.ts` 负责所有 LLM 通信逻辑（System Prompt 构建、SSE 流解析、Demo 降级），`AIChatAssistant.tsx` 负责 UI 状态管理和逐字打印动画，互不耦合。

---

##### 核心一：System Prompt 上下文动态注入（`buildSystemPrompt`）

不是简单地把用户问题转发给 LLM，而是每次请求前，将平台实时监控数据动态拼入 System Prompt：

```typescript
// src/api/aiAssistant.ts — buildSystemPrompt
function buildSystemPrompt(ctx?: DisasterContext): string {
  let prompt = `你是 Prometheus Global Guardian 平台的 AI 灾害分析助手...
职责范围：解读平台实时灾害监控数据、提供专业态势研判、给出应急响应建议...`;

  if (ctx && ctx.total > 0) {
    const topTypes = Object.entries(ctx.byType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([t, n]) => `${t}(${n})`)
      .join('、');

    const recentStr = ctx.recent
      .slice(0, 4)
      .map(h => `「${h.title}」${h.type}${h.magnitude ? ' M' + h.magnitude : ''}`)
      .join('；');

    prompt += `\n\n📡 **平台实时数据上下文**
- 活跃监控事件总数：**${ctx.total} 条**
- 灾害类型分布：${topTypes}
- 近期代表事件：${recentStr}`;
  }
  return prompt;
}
```

`DisasterContext` 由组件侧用 `useMemo` 从 `hazards` 实时计算，随 5 分钟轮询自动更新，LLM 的回答始终贴合当前数据快照。

> **🎤 面试追问：这个项目的 AI 模块是基于 RAG 的吗？**
>
> **标准回答**：现在是“双路径”架构。主链路是 **ai-flow 工作流引擎**（LangGraph DAG，可配置 RAG 检索节点）；降级链路是直连模型 + **动态上下文注入（Dynamic Context Injection）**。
>
> 也就是说：
> - 走 ai-flow 时，可以在服务端编排 LLM / RAG / Condition 等节点，属于“可接入 RAG”的能力架构；
> - 直连降级时，不做向量检索，而是每次请求前把平台实时结构化数据（事件总数、类型分布、近期代表事件）直接拼进 System Prompt。
>
> 我保留动态上下文注入作为兜底有三个原因：第一，灾害数据本身结构化且高频更新，直接注入延迟更低；第二，降级链路追求低成本与高可用，避免依赖向量索引；第三，这个场景更强调“当前数据快照”而不是离线文档检索。
>
> | | **ai-flow 主链路（可含 RAG）** | **直连降级链路（动态上下文注入）** |
> |---|---|---|
> | **数据能力** | 可编排 LLM / RAG / 条件分支 | 无检索，结构化数据直接注入 Prompt |
> | **数据来源** | 可接向量库/知识库 + 实时数据 | 平台实时抓取的灾害事件（`hazards` 数组） |
> | **适用目标** | 复杂多步骤分析、可扩展能力编排 | 快速可用、低延迟、低依赖兜底 |
> | **系统定位** | 线上主链路 | 异常/无 Key/回退链路 |

---

##### 核心二：SSE 流式响应解析（`streamChatMessage`）

用原生 `fetch` + `ReadableStream` 逐行解析 OpenAI SSE 格式，零依赖：

```typescript
// src/api/aiAssistant.ts — streamChatMessage
const reader = resp.body?.getReader();
const decoder = new TextDecoder();
let buf = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buf += decoder.decode(value, { stream: true });
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';          // 保留未完整的行，等下一个 chunk

  for (const line of lines) {
    const t = line.trim();
    if (!t || t === 'data: [DONE]') continue;
    if (!t.startsWith('data: ')) continue;
    try {
      const json = JSON.parse(t.slice(6));
      const delta: string | undefined = json.choices?.[0]?.delta?.content;
      if (delta) onChunk(delta);    // 每个 token 片段回调给 UI 层
    } catch { /* 跳过格式错误的 chunk */ }
  }
}
onDone();
```

SSE 每行格式为 `data: {json}`，需要用 `buf` 缓冲跨 chunk 的不完整行，这是手写流解析的关键细节。

---

##### 核心三：组件侧流式状态管理

`sendMessage` 的状态驱动流程：

```typescript
// src/components/AIChatAssistant.tsx — sendMessage
const sendMessage = useCallback(async (text: string) => {
  const assistantId = generateMessageId();

  // 1. 立即插入占位消息（content 为空，isStreaming: true）
  setMessages(prev => [...prev, userMsg, {
    id: assistantId, role: 'assistant', content: '', isStreaming: true, ...
  }]);

  await streamChatMessage(
    history,
    contextEnabled ? disasterContext : undefined,
    // 2. onChunk：每个 token 追加到目标消息
    (chunk) => {
      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: m.content + chunk }
          : m
        )
      );
    },
    // 3. onDone：结束流式，光标消失
    () => {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, isStreaming: false } : m)
      );
      setIsStreaming(false);
    },
    onError
  );
}, [messages, isStreaming, contextEnabled, disasterContext]);
```

UI 侧的打字机光标 `▌` 通过 `msg.isStreaming && <span className="ai-cursor">▌</span>` 实现，无需额外定时器。

---

##### 🎤 面试题：前端如何流式接收 LLM 响应并实现打字机效果？

> 完整链路分三层：
>
> **第一层 — API 层 SSE 解析**（`aiAssistant.ts`）：`fetch` 发请求时带 `stream: true`，拿到 `resp.body.getReader()` 后进入循环，用 `TextDecoder` 把二进制 chunk 转字符串，再按 `\n` 切割成 SSE lines。关键点是用 `buf` 缓冲区保留跨 chunk 的不完整行（`buf = lines.pop()`），防止 JSON 解析截断。每解析出一个 `delta.content` token，就调 `onChunk(delta)` 回调传给上层。
>
> **第二层 — 组件层流式状态**（`AIChatAssistant.tsx`）：发消息时先插入一条 `content: '', isStreaming: true` 的占位消息。`onChunk` 回调里用 `setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m))` 追加 token——注意是**追加不是替换**。`onDone` 时把 `isStreaming` 改为 `false`，光标消失。
>
> **第三层 — Markdown 增量渲染**（`MessageBubble`）：`content` 字符串每次增长都触发 `renderMarkdown` 重新 parse 整个字符串，识别 `**bold**`、`### 标题`、`- 列表`、`| 表格` 等格式，输出对应 JSX。React diff 只更新变化的 DOM 节点，视觉上是逐字出现。
>
> **完整数据流**：
> ```
> OpenAI SSE → ReadableStream.read() → TextDecoder → buf缓冲+split('\n')
>   → JSON.parse → delta → onChunk() → setMessages追加 → renderMarkdown重渲染 → DOM更新 → 光标▌跟随
> ```
> **为什么选原生 fetch 而不用 EventSource？** `EventSource` 不支持 POST 请求和自定义 Header（无法传 Authorization Bearer token），而手写 `ReadableStream` 零依赖，完全可控。

---

##### 核心四：Demo 降级模式

无 `VITE_OPENAI_API_KEY` 时自动进入 `runDemoMode`：根据用户输入关键词匹配 5 套预设模板（地震/洪水/野火/火山/综合态势），然后以 **6ms/4字符** 的节奏逐字输出，用户体验与真实 LLM 完全一致：

```typescript
// 逐字符模拟流式打字效果
const chars = response.split('');
for (let i = 0; i < chars.length; i++) {
  onChunk(chars[i]);
  if (i % 4 === 0) {
    await new Promise(r => setTimeout(r, 6));
  }
}
onDone();
```

---

##### 工程细节汇总

| 特性 | 实现方式 |
|---|---|
| **多轮对话** | 发送时把完整 `messages` 历史（过滤 system 角色）传给 API，维护完整上下文窗口 |
| **上下文开关** | 头部「📡 上下文」按钮控制 `contextEnabled`，关闭时不传 `disasterContext`，随时可切换 |
| **6 类快捷工作流** | `QUICK_PROMPTS` 常量数组，覆盖全球态势 / 地震 / 洪水 / 野火 / 趋势预测 / 应急响应 6 个场景 |
| **内存泄漏防护** | `streamingIdRef` 记录当前流式消息 ID，组件卸载后收到的 chunk 不再触发 `setState` |
| **ESC 关闭** | `useEffect` 监听 `keydown`，随 `isOpen` 变化挂载/卸载，无内存泄漏 |
| **懒加载** | `App.tsx` 用 `React.lazy() + Suspense` 包裹，AI 面板不影响首屏 bundle |
| **SSE buf 缓冲** | `buf = lines.pop() ?? ''` 保留跨 chunk 的不完整行，防止解析 JSON 截断错误 |

##### 面试表达（一句话）

> 用原生 `fetch ReadableStream` 手写 SSE 解析，将平台实时灾害数据动态注入 System Prompt，配合 Demo 关键词匹配降级，实现零依赖、工程完整的 LLM 流式对话模块，首字响应 **<1s**，API 调用成功率 **99%+**。

##### 🎤 面试题：介绍项目中 LLM 驱动的 AI 智能分析模块是怎么实现的

> 整体分三层：
>
> **第一层 BFF 代理层**（`server.js`）：`server.js` 在本项目中主要承担 DisasterAware 的 `/api` 代理与请求透传（含鉴权请求链路），用于屏蔽上游接口细节与统一跨域访问；AI 对话链路由前端直接调用 ai-flow 或 OpenAI-compatible 接口，不经过 `server.js` 转发。
>
> **第二层 API 通信层**（`aiAssistant.ts`）：核心是两个函数。`buildSystemPrompt()` 在每次请求前把当前地图上的实时灾害数据——事件总数、类型分布、近期代表事件——动态注入进 System Prompt，让 AI 能回答"现在哪个地区最危险"这类实时问题。`streamChatMessage()` 用原生 `fetch` + `ReadableStream` 手写 SSE 解析，用 `buf` 缓冲区处理跨 chunk 的不完整行，每解析出一个 token 就通过 `onChunk` 回调传给 UI 层。没有 API Key 时自动进入 Demo 降级模式，关键词匹配 5 套预设模板逐字模拟输出。
>
> **第三层 组件层**（`AIChatAssistant.tsx`）：发消息时先插入 `content: '', isStreaming: true` 的占位消息，`onChunk` 每次把 delta 追加到 `content` 触发重渲染，`MessageBubble` 对 `content` 做 Markdown 增量渲染，React diff 只更新变化的 DOM 节点，视觉上就是打字机效果。`onDone` 时 `isStreaming` 置 false，光标消失。
>
> **追问备忘**：
>
> | 追问 | 要点 |
> |---|---|
> | **为什么不用 EventSource？** | 不支持 POST 和自定义 Header，无法传 `Authorization` token |
> | **这是 RAG 吗？** | 双路径：主链路 ai-flow 可配置 RAG 节点；降级链路是动态上下文注入（无向量检索） |
> | **Demo 模式怎么实现？** | 关键词匹配 5 模板，`6ms/4字符` 节奏 `setTimeout` 逐字输出，体验与真实流式一致 |
> | **如何防止流式消息乱序？** | `streamingIdRef` 记录当前消息 ID，组件卸载后收到的 chunk 通过 id 比对丢弃 |

---

#### 🔌 **第三方API集成与数据融合**

**DisasterAware API集成（OAuth 2.0认证）**：

**1. OAuth认证实现**
```typescript
// 文件来源：src/api/auth.ts (第 1-75 行)
// Bearer Token 认证流程
let accessToken: string | null = null;
let refreshToken: string | null = null;

export async function authorize(): Promise<void> {
  try {
    const res = await fetch(`/api/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.disasterAware.username,
        password: config.disasterAware.password
      })
    });

    if (!res.ok) {
      throw new Error(`Authentication failed: ${res.status} ${res.statusText}`);
    }

    const data: DisasterAwareAuthResponse = await res.json();
    accessToken = data.accessToken;
    refreshToken = data.refreshToken;

    localStorage.setItem("accessToken", accessToken || "");
    localStorage.setItem("refreshToken", refreshToken || "");
  } catch (error) {
    console.error("Authorization failed:", error);
    throw error;
  }
}

// 自动刷新token的fetch封装
export async function authFetch(url: string): Promise<Response | undefined> {
  let accessToken = getAccessToken();

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // 检测到401/403自动刷新token后重试
    if (res.status === 401 || res.status === 403) {
      console.log("Token expired, refreshing...");
      await refreshAccessToken();
      accessToken = getAccessToken();

      return await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    } else if (res.ok) {
      return res;
    }
  } catch (error) {
    console.error("AuthFetch error:", error);
    throw error;
  }
}
```

**2. DisasterAware API接口封装**
```typescript
// 文件来源：src/api/disasteraware.ts (第 1-75 行)
// 获取活跃灾害数据
export async function fetchHazardsActive(type?: string): Promise<any[]> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      await authorize();
    }

    const url = type && type !== "ALL" 
      ? `/api/hazards/active/category/${type}` 
      : `/api/hazards/active`;
    const res = await authFetch(url);

    if (res && res.ok) {
      return await res.json();
    }

    throw new Error("Failed to fetch active hazards");
  } catch (error) {
    console.error("Error fetching active hazards:", error);
    return [];
  }
}

// 获取灾害类型列表
export async function fetchHazardTypes(): Promise<HazardType[]> {
  try {
    const url = `/api/hazards/types`;
    const res = await authFetch(url);

    if (res && res.ok) {
      return await res.json();
    }

    throw new Error("Failed to fetch hazard types");
  } catch (error) {
    console.error("Error fetching hazard types:", error);
    return [];
  }
}

// 按分类查询灾害
export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      await authorize();
    }

    const url = `/api/hazards/active/category/${categoryId}`;
    const res = await authFetch(url);

    if (res && res.ok) {
      return await res.json();
    }

    throw new Error(`Failed to fetch category: ${categoryId}`);
  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    return [];
  }
}
```

**3. 多数据源融合实现**
```typescript
// 文件来源：src/components/MapView.tsx (第 70-97 行)
// 数据格式标准化
const fetchDisasterAwareHazards = async (): Promise<Hazard[]> => {
  try {
    const data = await fetchHazardsActive(
      filter === "ALL" ? "EVENT" : filter
    );
    
    // 将DisasterAware格式转换为统一的Hazard格式
    return data.map((hazard: any) => ({
      id: hazard.hazard_ID || `da-${Date.now()}`,
      title: hazard.hazard_Name || "Unknown Hazard",
      type: hazard.type_ID || "UNKNOWN",
      geometry: hazard.latitude && hazard.longitude
        ? {
            type: "Point",
            coordinates: [hazard.longitude, hazard.latitude]
          }
        : { type: "Point", coordinates: [0, 0] },
      description: hazard.description || hazard.hazard_Name,
      source: hazard.creator || "DisasterAware",
      severity: hazard.severity_ID,
      timestamp: hazard.create_Date
    }));
  } catch (error) {
    console.warn("DisasterAware API failed, falling back", error);
    return [];
  }
};
```

**技术亮点**：
- **OAuth 2.0完整流程**：实现accessToken + refreshToken认证机制
- **自动重试机制**：401/403状态码自动刷新token后重试
- **Token持久化**：localStorage存储，减少认证频率
- **错误降级处理**：DisasterAware失败自动降级到其他数据源（USGS、GDACS）
- **数据格式标准化**：统一不同数据源的数据结构为Hazard接口
- **类型安全**：完整TypeScript类型定义，编译时错误检查

**多数据源集成架构**：
| 数据源 | 认证方式 | 数据类型 | 更新频率 | 覆盖范围 |
|--------|---------|---------|---------|----------|
| DisasterAware | OAuth 2.0 | 全球灾害事件 | 实时 | 全球 |
| USGS | 公开API | 地震数据（震级、深度、位置） | 实时 | 全球 |
| NASA EONET | 公开API | 环境事件（野火、风暴） | 每日 | 全球 |
| GDACS | 公开API | 自然灾害警报 | 实时 | 全球 |

**数据融合特点**：
- ✅ **统一数据模型**：将4个数据源标准化为Hazard接口
- ✅ **错误降级处理**：单个数据源失败不影响整体系统
- ✅ **去重机制**：基于ID和地理位置去除重复事件
- ✅ **实时轮询**：5分钟自动刷新，保持数据时效性

---

## 🎯 面试题全集（速查手册）

> 按模块整理，每题附完整答案要点，适合面试前快速回顾。

---

### 一、项目介绍类（必问）

#### Q1：介绍一下这个项目

> 这个项目是一个**实时全球灾害监控平台**。背景是 USGS、NASA、GDACS 这些权威机构的灾害数据各自独立，格式完全不统一，应急响应人员需要同时盯多个平台才能了解全貌，效率很低。我们做的事情是把这 4 个数据源统一接入，构建一个可交互的全球灾害态势感知平台。
>
> 技术上我主要做了三块：
>
> 第一是**渲染性能**。4 个数据源并发回包，高峰期点位能到几万条，最初用 DOM Marker 方案直接卡死，帧率从 60fps 掉到 5fps。我通过 LOD 三级调度 + WebGL + Web Worker 三层联动解决，帧率恢复到稳定 55fps+，内存从 400MB 降到 60MB。
>
> 第二是**并发竞态**。4 个数据源响应速度差异很大，用户快速切筛选条件时经常出现旧数据覆盖新数据的问题。通过 AbortController 取消过期请求 + Promise.allSettled 容错聚合 + 版本号双重保险，彻底消除了数据错乱。
>
> 第三是**AI 分析助手**。接的 OpenAI 流式 API，但不是简单透传——每次请求前会把当前地图上的实时灾害数据动态注入 System Prompt，让 AI 能回答「现在哪个地区最危险」这类和当前数据挂钩的实时问题，首字响应 <1s。
>
> 工程化这块首屏 bundle 从 669KB 压到 71KB，构建时间降了 29%，TypeScript 严格模式覆盖全部 18 个组件。
>
> _(说完停顿，等面试官追问具体模块)_

#### Q2：说一下这个项目的技术架构

> 整体上是一个**前后端分离、多层解耦**的架构，我把它分成六层来说：
>
> **第一层：前端展示层（React 19.1 + TypeScript 5.9 + Vite 7.1）**
> 组件化体系，18 个高复用组件，TypeScript 严格模式覆盖全项目；状态管理按职责域拆成 4 个独立 Context + useReducer，各自封装自定义 Hook 作为唯一消费入口，彻底消除 props drilling，重渲染次数降低 60%；构建侧配置 manualChunks 代码分割 + React.lazy() 懒加载，首屏 bundle 从 669KB 压到 71KB（gzip），降幅 89%。
>
> **第二层：地图可视化层（Mapbox GL JS 3.15 + WebGL 渲染管线 + deck.gl）**
> 核心是把原来的 DOM Marker 方案替换成 WebGL GeoJSON Layer。引入 LOD 三级调度：远景（zoom < 8）全量数据交给 GPU 渲染，避开 DOM；近景（zoom ≥ 8）保留 Marker 承担弹窗交互；城市级别开启 3D 建筑体块（配置了外部 3D Tiles URL 时通过 **deck.gl Tile3DLayer + CesiumIonLoader** 加载标准 3D Tiles，否则回退到 Mapbox fill-extrusion）。GeoJSON Source 增量 diff 更新避免全量重传，**Web Worker** 承担格式转换、去重和坐标清洗，主线程完全不感知数据处理耗时，10w+ 点位帧率稳定在 55fps+。
>
> **第三层：数据接入层（前端聚合 + BFF 代理）**
> 本项目采用“前端聚合 + 部分 BFF 代理”：DisasterAware 通过 `server.js` 的 `/api` 代理接入并走 OAuth 鉴权；USGS / NASA / GDACS 由前端直接拉取并在 `MapView` 侧聚合为统一 `Hazard` 结构。通过 `Promise.allSettled` 实现单源故障自动降级，配合 5 分钟轮询，数据同步成功率 99.5%+。
>
> **第四层：AI 分析层（ai-flow 工作流引擎 + LangGraph DAG + 双路径流式）**
> 集成自研 AI 工作流引擎平台（Miaoma AI Flow），基于 LangGraph DAG 编排 LLM 推理、RAG 知识检索与条件分支节点；开发 6 类预设灾害分析工作流（全球态势/地震/洪水/野火等）。当前实现是“双路径流式”：ai-flow 路径返回完整结果后前端模拟打字机流；直连 OpenAI-compatible 路径使用 `fetch + ReadableStream` 手写 SSE 解析。两条路径都支持实时灾害数据动态注入 System Prompt，首字响应 < 1s，无 Key 时自动降级 Demo 模式，API 成功率 99%+。
>
> **第五层：数据分析微服务（Python FastAPI）**
> FastAPI 微服务独立部署，提供 23 种统计算法 + 5 个预测模型（趋势预测、风险评估等），前端通过 RESTful API 按需调用，与前端主服务完全解耦，便于独立扩容。
>
> **第六层：工程化与稳定性保障**
> 全局 ErrorBoundary 捕获组件级异常并自动降级，平台稳定性提升 55%；React.memo + useMemo 精准控制渲染边界，重渲染降低 60%；Chrome DevTools Performance 面板全程验证优化效果；Docker 容器化 + Nginx 反向代理生产部署。
>
> **一句话总结**：前端可视化 → BFF 聚合 → 4 源数据 → AI 工作流引擎 → Python 分析服务，各层职责清晰，任意一层独立演进不影响其他层。

#### Q2：项目最大的技术挑战是什么？

> 这个项目我觉得有四个比较有挑战性的地方，我按优先级说：
>
> ---
>
> **挑战一：海量地理数据渲染性能**
>
> **问题**：最初用 `mapboxgl.Marker` 把每个点位渲染成一个真实 DOM 节点，数据量两三百条时完全正常，但多数据源并发回包后高峰期能到几万条，帧率直接从 60fps 崩到 5fps，地图基本卡死。
>
> **根本原因**：不是代码写法的问题，是渲染范式的问题。DOM 渲染路径（Layout → Paint → Composite）随节点数线性增长，几万个 DOM 节点每帧都要全量计算，靠 JS 层面的优化根本触碰不到这个瓶颈，只能换渲染方式。
>
> **解法**：三层叠加——
> 1. **LOD 调度**：远景（zoom < 8）把全量数据交给 Mapbox GeoJSON Layer，GPU 渲染，10w 个点对 GPU 只是一次 draw call，完全绕开 DOM；近景（zoom ≥ 8）保留 Marker，这个缩放级别视口内只有几十个点，同时还能挂 Popup 做交互。
> 2. **GeoJSON diff 增量更新**：原来 5 分钟轮询用 `setData()` 全量替换，GPU 每次重新上传所有顶点，有约 800ms 卡顿。给每个 Feature 挂稳定的顶层 `id`，Mapbox 内部会 diff 只上传变化的部分，刷新耗时从 800ms 降到 ~20ms，完全无感知。
> 3. **Web Worker 数据清洗**：格式转换、去重、异常坐标过滤移到子线程，处理 10w 条约 80ms 但主线程完全不感知，页面始终流畅。
>
> **结果**：帧率从 5fps 恢复到 55fps+，内存从 400MB 降到 60MB。


## 🚀 海量点位可视化三层极致优化（详细版本）

**背景**：灾害监控这个业务，数据源多且实时几万点。纯用 DOM（Marker）渲染，性能直接崩溃——浏览器每个点都需要一个 DOM 节点，数据一多主线程卡死，5fps 以内，体验极差。

**方案演进：**

---

#### 1️⃣ 第一层：架构级提速 LOD（Level of Detail）分层调度（DOM+Layer 混合）

- **逻辑**：不同 zoom 下点数量差异巨大。远景（zoom<8）必然过万点，近景通常几十点。
- **做法**：
    - **远景**（zoom<8）：用 Mapbox 的 GeoJSON Source + cluster 图层（Layer），GPU 批量渲染十万点只是一次 draw call，DOM 负担零。
    - **近景**（zoom≥8）：保留 Mapbox Marker（DOM）显示，方便交互（弹窗/hover）。此时点不多，DOM 没压力。
    - `applyLOD()` 方法实时切换 visible 层，叠加热力图/3D 建筑等 Layer。
- **收益**：
    - 远景 FPS由5→55+，内存从400MB→60MB。
    - 用户 zoom 操作时不卡顿、无闪烁。
- **背后原理**：GPU 大批量渲染/聚合数据 vs DOM 适合交互少量元素，各自发挥强项。

#### 2️⃣ 第二层：Layer 内部增量更新，极限压缩更新开销

- **问题**：即使用 Layer，但最初每 5 分钟轮询还是`source.setData()`全量替换——每次GPU重新上传十万点，直接引起800ms以上卡顿。
- **原理**：Mapbox 的 GeoJSON Source 有 diff 能力：只需每个 Feature 有**稳定顶层id**（不是 properties.id！），Mapbox 会智能识别新增/删除，只增量上传变动，速度大幅提升。
- **要点**：
    - 给 Feature 挂上唯一id（如灾害ID或三元组哈希）。
    - 新旧数据 diff，GPU只处理变化点。
- **效果**：增量更新仅需~20ms，页面完全无感刷新。
- **对比**：

    | 方案         | 更新方式      | GPU上传耗时 | 用户体验      |
    |--------------|--------------|-------------|---------------|
    | 全量setData  | 强制重传全部 | ~800ms      | 明显卡断/闪烁  |
    | diff+id机制  | 只传变动部分 | ~20ms       | 毫无刷新感知   |

#### 3️⃣ 第三层：Web Worker 数据处理解耦，主线程彻底无压

- **原问题**：异构多源+数据量大，数据预处理（去重、异常、转换）都堆在主线程，10w数据需200-400ms，触发渲染/交互全冻结。
- **改进**：全量数据传入 Web Worker 子线程处理，主线程专注渲染/UI，Worker 算完直接塞干净数据进 Layer。
- **效果**：Worker 80ms处理十万条，但主线程完全不感知，极端高峰期交互依然丝滑。

---

#### 💡 方案集成口语化表达（STAR 法则）

> 背景（S）：四源回包单次最高十万点，初版全 DOM，远景丢帧、死卡，无交互性可用。
> 挑战（T）：每5分钟定时刷新不能被感知，点数据异构预处理又慢，主线程压力爆表。
> 我的做法（A）：
> 1. LOD分层设计，zoom低用GPU层叠，zoom高用少量 Marker，秒解渲染瓶颈；
> 2. 全量setData改增量diff，给Feature挂id，Mapbox智能上传变更，刷新时长800ms降为20ms；
> 3. 数据预处理全部塞Worker，主线程"只收结果"，不卡主页面。
> 结果（R）：55+ fps全程流畅，线上5分钟自动刷新用户无感知，内存降85%，组件化/Hook化后新增功能无props改造负担。


口语版本：
问题：你可以举一个例子说你现在技术上遇到的一什么样的问题。然后你是如何解决的这个问题比较有典型性的一个

我可以举一个在全球灾害监控项目里的典型问题。这个项目要聚合多个权威数据源，把海量灾害点实时渲染到地图上。
当数据量小时页面是流畅的，但在多源高密度数据场景下，地图帧率会明显下降，出现卡顿和交互延迟。

我先做了定位，发现瓶颈不在业务逻辑，而在渲染路径和数据更新策略：
一是 DOM/普通 Marker 渲染在大规模点位下开销过高；
二是数据刷新时存在全量替换，导致每次更新都触发重计算和重绘；
三是数据清洗和坐标处理放在主线程，会和 UI 渲染抢资源。

针对这三个点，我做了三层优化：
第一，重构渲染引擎，引入 LOD 分级调度。远景以聚合和 GPU 加速渲染为主，近景再切换到更细粒度展示。
第二，把数据更新改成增量 diff，只更新新增和变更的点位，不再全量重刷。
第三，把数据清洗、转换等计算任务迁到 Web Worker，释放主线程，保证交互流畅性。

最终效果是高密度场景下帧率和稳定性都明显提升，地图卡顿基本消除，刷新响应时间显著下降。
这个问题对我最大的价值是：性能问题要按“渲染层、更新层、线程层”分层拆解，在正确层面做优化，收益才会稳定且可复用。
---

#### 👨‍💻 面试答题模板

- **问题Q**：“你如何攻克地图海量点渲染与数据更新卡顿？”
- **口述A**："我们方案不只是换WebGL，而是三层联动：zoom分层渲染完全绕开DOM瓶颈，增量diff更新优化彻底抹掉刷新闪烁，用Worker解耦大数据清洗，主线程始终流畅。Mapbox的diff依赖Feature id这是关键细节。三层优化叠加从体验到性能都有指数提升。"

---

#### ⚡️随问随答高频点总结

- **为什么不全用 Layer？** 近景交互还是DOM/Marker更友好。
- **为什么必须顶层id？** Mapbox Layer的diff机制只认Feature.id，不是properties.id，否则diff失效。
- **Worker替代requestIdleCallback吗？** 不能，Worker是真多线程，不抢主线程算力。
- **Layer具体包含什么？** 圆、符号、热力图、3D建筑等都是Mapbox Layer类型，支持批量渲染与动态调度。

---

> ---
>
> **挑战二：实时数据流的并发竞态**
>
> **问题**：4 个数据源响应速度差异很大，USGS 快的 200ms 就回来，DisasterAware 要走 OAuth 鉴权有时要 3s+。更棘手的是用户快速切换筛选条件（比如连续点「地震→洪水→野火」），旧请求比新请求晚回来，旧数据会把正确的数据覆盖掉。我自己测试时就复现过：选了野火，地图上显示的却是地震数据。
>
> **根本原因**：这类 bug 不是代码逻辑错误，本质是程序没有感知异步操作的完成顺序可能与发起顺序不一致。偶发性强、难以稳定复现，用户看到的只是「数据不对」，非常难排查。
>
> **解法**：三层保障——
> 1. **AbortController**：每次 filter 变化，先 `abort()` 上一次请求，再发新请求，网络层直接取消，旧请求不会触发任何 `setState`。
> 2. **Promise.allSettled**：4 个源并发时用 `allSettled` 替换 `all`，单源超时不阻断其他源，共享同一个 `signal` 确保切换筛选时 4 个请求同时取消。
> 3. **useRef 版本号**：作为双重保险，每次请求递增版本号，回调里版本号不匹配则静默丢弃，覆盖无法 abort 的场景（如第三方 SDK 回调）。
>
> **结果**：数据错乱问题彻底消除，切换筛选响应延迟控制在 200ms 以内，Network 面板能清楚看到旧请求被 cancel。
>
> ---
>
> **挑战三：复杂状态管理与模块解耦**
>
> **问题**：地图、筛选面板、图表、AI 助手四个模块需要共享 `hazards`、`filter`、`mapStyle` 等大量状态。在加 AI 分析面板那个迭代时，发现为了传 hazards 给新组件，必须改整条 props 链路，涉及多个中间组件签名变更——而这些组件本身根本不使用这些数据。随功能继续增加，props drilling 会成为不可收拾的设计债。
>
> **解法**：按职责域把状态拆成 4 个独立 Context（`HazardContext` / `FilterContext` / `UIContext` / `NotificationContext`），每个配 `useReducer` 管理状态转换，封装自定义 Hook（`useHazards()` / `useFilter()` 等）作为唯一消费入口。
>
> 拆分的关键收益有两个：一是 `filter` 变化只触发订阅了 `FilterContext` 的组件重渲染，`StatisticsCard` 完全不受影响；二是 Hook 封装了消费逻辑，如果未来要把 Context 换成 Zustand，只改 Hook 内部，所有消费组件不用动。
>
> **结果**：App.tsx 始终保持在 150 行以内，组件重渲染次数降低约 60%，新增模块只需调 Hook 一行消费数据，不用改上游任何组件。
>
> ---
>
> **挑战四：多异构数据源统一治理**
>
> **问题**：4 个数据源格式完全不同——DisasterAware 需要 OAuth 2.0 Token 鉴权，USGS 返回 GeoJSON，NASA 是 JSON 数组，GDACS 是 XML/RSS。字段命名（`magnitude` vs `mag`）、坐标精度、时间格式也各不一样。如果让每个组件自己处理格式差异，维护成本会指数级增长。
>
> **解法**：BFF 适配器层统一治理——`server.js` 作为 BFF，每个数据源配一个 adapter 函数，统一转换为标准 `Hazard` 接口。`authFetch` 封装 OAuth 2.0 Token 自动刷新，Token 过期时无感刷新后重试，不影响上层业务逻辑。`Promise.allSettled` 在外层做容错聚合，单源故障自动降级，整体可用性不受任一数据源波动影响。
>
> **结果**：前端组件只消费统一的 `Hazard[]`，完全不感知数据源差异，新增数据源只需写一个 adapter 函数，整体可用性达到 99.5%+。
>
> ---
>
> _🎤 **口述提示**：通常先说挑战一和挑战二（渲染性能 + 竞态），这两个技术深度最强、最有画面感。面试官追问「还有别的吗」再展开三和四，或者根据面试官方向（前端工程化/架构/AI）选择重点延伸。_

#### Q3：有什么可量化的数据指标？

> | 指标 | 优化前 | 优化后 |
> |---|---|---|
> | 万级点位帧率 | ~5fps | **55fps+** |
> | 地图内存占用 | 400 MB | **60 MB（-85%）** |
> | 首屏 bundle 体积 | 669 KB | **71 KB gzip（-89%）** |
> | 构建时间 | 17.76s | **12.60s（-29%）** |
> | 数据同步成功率 | 不稳定 | **99.5%+** |
> | AI 首字响应延迟 | — | **<1s** |

---

### 二、地图渲染性能（高频）

#### Q4：DOM Marker 为什么会卡？

> DOM Marker 的本质是真实的 HTML 元素，每个 Marker 都在浏览器的渲染树里。浏览器每帧都要对所有 DOM 节点做 **Layout（计算位置）→ Paint（绘制像素）→ Composite（合并图层）**，节点数越多耗时线性增长。几百个时没有感知，到几千个时每帧渲染时间从正常的 16ms 涨到 60ms+，到几万个时地图基本卡死。这是 DOM 渲染路径的天花板，靠优化 JavaScript 代码无法突破。

#### Q5：你用了什么方案解决万级点位的渲染？

> 三层方案联动：
>
> **第一层（渲染架构）**：引入基于 zoom 的 LOD 调度。远景（zoom < 8）用 Mapbox GeoJSON Layer + cluster 交给 GPU 统一渲染——10w 个点对 GPU 来说只是一次 draw call，完全绕开 DOM；近景（zoom ≥ 8）保留 Marker，这个缩放级别视口内只有几十个点，DOM 没有压力，且 Marker 可以挂 Popup 做交互。
>
> **第二层（增量更新）**：把数据刷新从 `setData()` 全量替换改为 GeoJSON diff 增量更新。给每个 Feature 挂上稳定的顶层 `id`，Mapbox 内部 diff 只上传变化的部分，增量更新耗时从 800ms 降到 ~20ms。
>
> **第三层（线程分离）**：把格式转换、去重、异常坐标过滤拆到 Web Worker 里跑。主线程只接收处理好的干净数据，Worker 处理 10w 条约 80ms 但完全在子线程，主线程不感知，页面始终流畅。

#### Q6：GeoJSON diff 增量更新是什么原理？为什么需要稳定 id？

> 调用 `source.setData()` 时，Mapbox 不会全量替换所有数据，而是**对比新旧 FeatureCollection，只把变化的部分上传到 GPU**。
>
> **没有 diff（全量重传）**：
> ```
> setData(newData) → GPU 清空全部顶点 → 重新上传 10w 个点 → 耗时 ~800ms，屏幕闪烁
> ```
>
> **有 diff（增量上传）**：
> ```
> setData(newData) → Mapbox 对比新旧（基于顶层 id）→ 只上传新增/删除/变化的点 → 耗时 ~20ms，无感知
> ```
>
> **diff 生效的唯一条件**：每个 Feature 必须有**顶层稳定 `id` 字段**（不是 `properties.id`）。Mapbox 用顶层 `id` 做新旧对比，如果 `id` 不稳定（比如每次用 `Date.now()` 生成），就无法识别哪个 Feature 对应旧数据里的哪个，退化为全量重传，等于没有 diff。
>
> ```typescript
> // ✅ 正确：顶层 id，Mapbox 能识别每个 Feature
> { type: 'Feature', id: 'usgs-eq-12345', geometry: {...}, properties: {...} }
>
> // ❌ 错误：id 在 properties 里，Mapbox 看不到，退化为全量重传
> { type: 'Feature', geometry: {...}, properties: { id: 'usgs-eq-12345' } }
> ```
>
> 灾害数据 5 分钟刷新一次，每次实际变化的点位只有少量（相对 10w 总量），diff 机制让 GPU 只处理极少数变化，更新耗时从 800ms 降到 ~20ms，刷新完全无感知。

#### Q7：什么是 Web Worker？

> **Web Worker** 是浏览器提供的**后台线程机制**，让 JavaScript 可以在主线程之外开一个独立线程运行代码。
>
> JavaScript 本身是单线程的——渲染、事件响应、数据处理都挤在主线程。一旦主线程被耗时操作占用，页面就会冻结：
>
> ```
> 没有 Worker（主线程阻塞）：
> 渲染 → [处理 10w 条数据，400ms，UI 冻结] → 渲染 → ...
>
> 有 Worker（并行处理）：
> 主线程：渲染 → 事件响应 → 渲染 → ...（始终流畅）
> Worker：  [处理 10w 条数据，80ms，子线程] → postMessage 返回结果
> ```
>
> **两条核心限制**：
> 1. **不能操作 DOM**：Worker 里没有 `document` / `window`，只能做纯计算
> 2. **通过 `postMessage` 通信**：主线程与 Worker 之间传递数据是**拷贝**（不共享内存），大数据可用 `ArrayBuffer` 转移所有权避免拷贝开销
>
> **本项目中的用法**：把格式转换、去重、异常坐标过滤这些纯数据处理逻辑放进 Worker，主线程只接收处理好的干净数据直接调 `source.setData()`。处理 10w 条约 80ms，但完全在子线程，主线程不感知，地图交互始终流畅。

#### Q8：为什么不用 requestIdleCallback 代替 Web Worker？

> `requestIdleCallback` 仍然运行在**主线程**，只是在浏览器空闲时才执行。数据量大时处理耗时长，哪怕分批，也会占用主线程的帧时间。Web Worker 是**真正的并行子线程**，与主线程完全隔离，处理数据时不影响渲染和交互。

#### Q9：什么是 LOD？

> LOD（Level of Detail，细节层次）= 根据观察距离动态调整渲染精度。在地图里体现为根据缩放级别调整渲染方式：
> - 远景（zoom 小）：用 WebGL cluster 只渲染聚合圆，GPU 处理，帧率不受点位数影响
> - 中景（zoom 中）：展开聚合，显示独立点位
> - 近景（zoom 大）：切换为 DOM Marker，支持点击 Popup 等交互
>
> 核心思想：**用户看不到的细节不需要渲染，把渲染资源留给用户能感知到的部分**。

#### Q10：deck.gl 是什么？和 Mapbox 是什么关系？

> **deck.gl** 是 Uber 开源的**大规模地理数据 WebGL 可视化框架**，专为海量地理数据高性能绘制设计，底层同样基于 WebGL。
>
> | | **Mapbox GL** | **deck.gl** |
> |---|---|---|
> | **定位** | 底图渲染引擎（地图本身） | 数据可视化叠加层 |
> | **擅长** | 地图样式、瓦片加载、基础交互 | 海量数据点、轨迹、热力图、3D 图层 |
> | **3D 建筑** | `fill-extrusion`（Mapbox 原生） | `Tile3DLayer`（标准 3D Tiles 格式） |
> | **关系** | 作为底图 | 通过 `MapboxOverlay` 叠加在 Mapbox 上 |
>
> **本项目中的用法**：用 `Tile3DLayer` + `CesiumIonLoader` 加载标准 3D Tiles 格式建筑模型，通过 `MapboxOverlay` 挂载到 Mapbox 地图上，仅在配置了 `VITE_3D_TILES_URL` 时启用，否则自动回退到 Mapbox 原生 `fill-extrusion`。
>
> ```typescript
> // 桥接器：把 deck.gl 作为 Mapbox control 挂载
> deckOverlay.current = new MapboxOverlay({ layers: [] });
> map.current.addControl(deckOverlay.current);
>
> // Tile3DLayer：加载 Cesium ion 格式 3D 建筑模型
> const tile3DLayer = new Tile3DLayer({
>   id: 'deck-3d-tiles',
>   data: config.tiles3d.url,
>   loaders: [CesiumIonLoader],
>   opacity: 0.9,
> });
> deckOverlay.current.setProps({ layers: [tile3DLayer] });
> ```
>
> **追问：为什么不全用 deck.gl，还保留 Mapbox 原生 Layer？**
> deck.gl 适合复杂 3D 数据图层；对于点聚合、热力图这类标准需求，Mapbox 原生 Layer 更轻量，无需引入额外依赖。两者分工：原生 Layer 处理常规场景，deck.gl 只在需要 3D Tiles 时激活。

---

### 三、并发控制与竞态（高频）

#### Q11：什么是 Race Condition？在项目中是什么场景？

> Race Condition（竞态条件）= 两个或多个异步操作同时进行，最终结果取决于它们完成的顺序，而这个顺序不可预测，导致数据错误。
>
> 项目里的具体场景：用户连续切换筛选条件——比如快速点「地震 → 洪水 → 野火」，每次切换都发出 4 个新请求。如果 DisasterAware 响应慢（3s+），用户已经切换到「野火」，但地震的请求才刚回来，`setState` 把地图覆盖成地震数据——用户选的是野火，看到的是地震，数据完全错误，且这类 bug 偶发、难以稳定复现。

#### Q12：你用了什么方案解决竞态？

> 三层方案：
>
> **第一层（网络层）**：在自定义 Hook `useHazardFetch` 里用 `AbortController`。每次 filter 变化，先 `abort()` 上一个控制器，再新建一个绑到本次请求的 `signal`。旧请求在网络层被取消，浏览器抛 `AbortError`，不再触发任何 `setState`。组件卸载时同样 abort，防止内存泄漏。
>
> **第二层（聚合层）**：4 个数据源并发请求用 `Promise.allSettled` 代替 `Promise.all`。所有请求共用同一个 AbortController，切换筛选时 4 个请求同时被取消，不存在部分请求还在跑的情况。单个数据源失败静默降级，不影响其他源。
>
> **第三层（状态层）**：用 `useRef` 维护单调递增的请求版本号作为兜底。有些异步操作无法 abort（比如第三方 SDK 回调），版本号机制确保只有当前版本号匹配时才调 `setState`，其余静默丢弃。

#### Q13：AbortController abort 之后，请求真的立刻停止了吗？

> 不完全是。已经发出的网络数据包无法召回（TCP 层面），但浏览器会**忽略响应**并向 fetch 的 Promise 抛出 `AbortError`，不再消耗 JavaScript 处理时间，也不会触发 `.then()` 回调。所以 abort 的作用是：**阻止响应数据进入 JavaScript 执行链**，而不是物理撤回网络包。

#### Q14：Promise.all 和 Promise.allSettled 的区别？

> | | `Promise.all` | `Promise.allSettled` |
> |---|---|---|
> | **行为** | 任一 reject → 整体立刻 reject | 等全部 settle 再返回 |
> | **结果** | 全部成功才拿到值 | 每项都有 `{status, value/reason}` |
> | **适合场景** | 所有请求都必须成功（串联依赖） | 多源容错（部分失败不影响整体） |
>
> 本项目用 `allSettled`：4 个数据源哪个失败都静默降级，成功的数据正常合并。

#### Q：简单介绍一下 Promise 的状态机机制，以及 all 和 allSettled 的区别。

> **1. Promise 的状态机机制**  
> Promise 本质上是一个状态机，有三种状态：  
> - **pending（进行中）**：初始状态，异步操作尚未完成  
> - **fulfilled（已成功）**：操作成功结束并返回结果  
> - **rejected（已失败）**：操作失败，返回失败原因  
> 状态一旦从 pending 转为 fulfilled 或 rejected，就会被“锁定”下来，不能再变。这保证了 Promise 的可靠性和一致性。Promise 的 then 和 catch 回调会在状态变成 fulfilled 或 rejected 时被调用。
>
> **2. Promise.all 和 Promise.allSettled 的区别**  
> - **Promise.all**：接收一组 Promise，必须全部成功才返回所有结果，否则只要有一个失败就立即 reject，返回第一个失败原因。常用于所有任务都成功才算整体成功的场景。  
> - **Promise.allSettled**：接收一组 Promise，等待全部完成，无论成功还是失败。返回结果数组，每一项包含该 Promise 的最终状态（fulfilled/rejected）和对应的值或原因。常用于需要收集所有异步结果，不关心有没有失败的场景。
>
> **总结：**  
> - Promise 是三态状态机且状态不可逆  
> - all 是“全成一成”，有一个失败就失败；  
> - allSettled 是“收集所有结果”，每个都给出最终的状态。


#### Q：在处理多个 AI 模型并行调用时，Promise.all 和 Promise.allSettled 有什么区别？

> 在多个 AI 模型并行调用（比如批量请求多个 AI 接口）时：
>
> **Promise.all**
> - 所有模型的请求（Promise）都成功才返回全部结果；
> - 只要有一个模型失败，整体立即 reject，无法获得其他模型的结果，处理流程提前中断。
> - 适合：必须都成功才算通过的场景，比如所有模型结果缺一不可。
>
> **Promise.allSettled**
> - 等待所有模型请求完成，不管成功还是失败；
> - 返回每个模型的执行结果（成功或失败及其原因），可以逐个分析；
> - 不会因个别模型失败而影响整体流程。
> - 适合：希望了解所有模型执行情况，比如部分失败也要收集全部状态。
>
> **面试总结句式：**
> 使用 Promise.all 时，若有一个模型调用失败，整体结果就被拒绝，无法拿到其他模型的成功结果。而 Promise.allSettled 能收集所有模型的最终状态和输出，更有利于分析和容错。因此，实际业务中并行多模型调用通常推荐 Promise.allSettled，方便整体监控和后续处理。


### 四、状态管理（高频）

#### Q15：什么是 Props Drilling？你是怎么避免的？

> Props Drilling（属性钻透）= 为了把数据传给深层组件，不得不让中间每一层都转手传递 props，即使这些中间组件根本不使用这个数据。
>
> 本项目通过**按职责域拆分 Context + useReducer** 解决：
> - `HazardContext`：灾害数据和 loading 状态
> - `FilterContext`：筛选条件和日期范围
> - `UIContext`：地图样式和 Tab 切换
> - `NotificationContext`：通知列表
>
> 每个 Context 配一个自定义 Hook（`useHazards()`、`useFilter()` 等）作为唯一消费入口，组件直接调 Hook 拿数据，不经过任何中间层传递。`App.tsx` 保持在 150 行以内，中间层组件的 props 签名干净。

#### Q16：Context 拆分为什么能减少重渲染？

> React Context 的机制是：Context value 变化时，**所有订阅了该 Context 的组件都会重渲染**。如果把所有状态放在一个 Context 里，`filter` 字段变化会导致只关心 `hazards` 的 `StatisticsCard` 也重渲染。
>
> 拆成 4 个 Context 后，`filter` 变化只触发 `FilterContext` 的消费者重渲染，`StatisticsCard` 只订阅 `HazardContext`，完全隔离。配合 `React.memo` 和 `useMemo` 稳定 value 引用，整体重渲染次数降低约 60%。

#### Q17：为什么 Provider 的 value 要用 useMemo 包裹？

> Provider 的 `value` 如果直接写成对象字面量（`value={{ state, dispatch }}`），每次父组件渲染都会创建一个新的对象引用，React 会认为 Context value 发生了变化，触发所有消费者重渲染——即使 `state` 和 `dispatch` 本身没有任何变化。用 `useMemo` 包裹，只有 `state` 真正变化时才生成新对象，避免无意义的重渲染。

#### Q18：为什么不用 Redux？Zustand 和 Jotai 有什么区别？

> **不用 Redux**：项目体量中等，Redux 的 action / reducer / selector 分层 boilerplate 较重，Context + useReducer 在这个规模已经足够，且零依赖。
>
> **Zustand vs Jotai**：
> | | Zustand | Jotai |
> |---|---|---|
> | **模型** | Store（整体对象 + selector） | 原子（每个状态独立 atom） |
> | **适合** | 有关联的状态（互相依赖） | 完全独立的细粒度状态 |
> | **Provider** | 不需要（模块级单例） | 需要（或用默认 store） |
> | **订阅** | `useStore(s => s.xxx)` selector | `useAtom(xxxAtom)` |
>
> 本项目若规模扩大，优先迁移 Zustand（状态有关联性）；若频繁出现只需要一两个字段的高频局部更新，Jotai 原子粒度更合适。

#### Q：react 的 ref 是什么？

> React 的 ref（Reference，引用）是一种可以让我们直接访问和操作 DOM 元素或 React 组件实例的机制。一般情况下，React 推崇数据驱动的编程，尽量不去直接操作 DOM，但有时候我们必须访问 DOM，比如获取输入框的值、控制焦点、文本选择或者执行动画等场景，这时可以用 ref。
>
> 在 React 16.3 及以后，推荐使用 React.createRef() 或函数组件中的 useRef Hook 创建 ref，然后通过 ref 的 current 属性访问对应的 DOM 元素或组件实例。
>
> **扩展说明：**
> - ref 最常用的场景是访问原生 DOM 元素，如获取焦点、测量尺寸等。
> - ref 也可以用于获取 class 组件实例，从而调用其方法。
> - 不建议滥用 ref，应优先采用数据驱动的方式（state/props，受控组件），只有在必须访问 DOM 时才使用 ref。

#### Q：React 19 有哪些更新？

> **React 19 主要新特性与更新：**
>
> **1. React Actions 与 useActionState**
> - 新的表单处理机制，客户端可以直接调用服务端 Action。
> - 引入 useActionState、useFormStatus 等 hook，极大简化异步表单交互。
>
> **2. useOptimistic（乐观 UI 更新）**
> - 支持更简单的乐观更新（Optimistic UI），用户操作可以即时反馈，提高体验。
>
> **3. React Server Components 和 Server Actions**
> - 正式版支持 React Server Components（RSC），实现客户端和服务端 UI/逻辑的分层。
> - Server Actions 允许直接在前端“调用”服务端函数，前后端界限更加平滑。
>
> **4. 新的 Suspense 支持**
> - 支持在更多场景下 Suspense，异步边界和错误处理更强大。
>
> **5. 事件系统改进**
> - React 19 底层事件系统全面优化，更加贴近原生事件，修复了长期异常现象，提高性能。
>
> **6. 新的 use 插件机制**
> - 支持 use 关键字，可以更方便 await 服务器和客户端的数据 promise。
>
> **7. 更好的 TS 支持及性能改进**
> - 类型提示更完善，SSR、hydration、JSX transform 性能进一步增强。

#### Q：Babel 工作原理？

> **Babel 是什么？**
> Babel 是一个广泛使用的 JavaScript 编译器，主要用于将 ES6+ 等新一代 JavaScript 语法转换为兼容旧版浏览器的 ES5 代码。它支持最新的 ECMAScript 标准、TypeScript、JSX（React）、Flow 等扩展语法。

> **核心工作原理分三步：**
> 1. **Parse（解析）**：Babel 首先将源代码解析为抽象语法树（AST）。这一阶段会进行词法分析和语法分析，将代码字符串转为结构化的 AST。
> 2. **Transform（转换）**：Babel 遍历并操作 AST，根据配置的插件（如 @babel/preset-env、@babel/plugin-transform-xxx）对特定语法节点进行替换、插入或删除，实现语法降级、Polyfill 注入、类型擦除（如 TS/Flow）、JSX 转换等。
> 3. **Generate（生成）**：Babel 将转换后的 AST 重新生成 JavaScript 代码字符串，并输出到目标文件。

> **详细流程：**
> - **输入**：源代码（ES6+/TS/JSX/Flow 等）
> - **解析**：@babel/parser 解析为 AST
> - **转换**：@babel/traverse 遍历 AST，插件链依次处理
> - **生成**：@babel/generator 输出最终 JS 代码

> **插件机制：**
> Babel 的强大在于其插件体系。每个插件负责处理一种语法特性（如箭头函数、类、装饰器等），preset 是插件集合。开发者可按需组合 preset 和插件，实现灵活的语法支持和定制。

> **常见应用场景：**
> - 新语法降级（ES6+ → ES5）
> - TypeScript/Flow 类型擦除
> - JSX 转换为 React.createElement
> - Polyfill 注入（如 Promise、Array.from 等）
> - 按需引入（如 lodash、Antd）

> **面试总结句式：**
> Babel 通过“解析-转换-生成”三步，把新一代 JS/TS/JSX 代码转成兼容旧环境的 ES5 代码，核心是 AST 转换和插件机制。实际工程中，Babel 是现代前端构建链的基础，配合 Webpack/Vite/TS 等工具链广泛使用。

#### Q：PropsWithChildren 是什么？

> **PropsWithChildren 是什么？**
> `PropsWithChildren` 是 TypeScript 在 React 项目中常用的一个类型辅助工具。它定义在 `@types/react` 类型声明中，作用是为你的 props 类型自动加上 `children` 属性。

> **详细解释：**
> - 在 React 组件中，`children` 表示组件标签包裹的内容（可以是元素、文本、数组等）。
> - `PropsWithChildren<T>` 实际上等价于 `{ children?: ReactNode } & T`，即在你自定义的 props 类型 T 上自动加上了可选的 `children` 属性。

> **使用场景：**
> - 当你写一个通用组件，既有自定义 props，又允许包裹子元素时，推荐用 `PropsWithChildren`。
> - 例如：
>   ```tsx
>   import type { PropsWithChildren } from 'react';
>   type MyCardProps = { title: string };
>   function MyCard(props: PropsWithChildren<MyCardProps>) {
>     return <div><h2>{props.title}</h2>{props.children}</div>;
>   }
>   ```

> **面试总结句式：**
> `PropsWithChildren<T>` 是 TypeScript 提供的类型工具，帮你在自定义 props 类型上自动加上 `children`，让组件既能接收自定义属性，也能包裹任意子元素，是 React 组件类型声明的最佳实践之一。

#### Q：Babel 工作原理？

> **Babel 是什么？**
> Babel 是一个广泛使用的 JavaScript 编译器，主要用于将 ES6+ 等新一代 JavaScript 语法转换为兼容旧版浏览器的 ES5 代码。它支持最新的 ECMAScript 标准、TypeScript、JSX（React）、Flow 等扩展语法。

> **核心工作原理分三步：**
> 1. **Parse（解析）**：Babel 首先将源代码解析为抽象语法树（AST）。这一阶段会进行词法分析和语法分析，将代码字符串转为结构化的 AST。
> 2. **Transform（转换）**：Babel 遍历并操作 AST，根据配置的插件（如 @babel/preset-env、@babel/plugin-transform-xxx）对特定语法节点进行替换、插入或删除，实现语法降级、Polyfill 注入、类型擦除（如 TS/Flow）、JSX 转换等。
> 3. **Generate（生成）**：Babel 将转换后的 AST 重新生成 JavaScript 代码字符串，并输出到目标文件。

> **详细流程：**
> - **输入**：源代码（ES6+/TS/JSX/Flow 等）
> - **解析**：@babel/parser 解析为 AST
> - **转换**：@babel/traverse 遍历 AST，插件链依次处理
> - **生成**：@babel/generator 输出最终 JS 代码

> **插件机制：**
> Babel 的强大在于其插件体系。每个插件负责处理一种语法特性（如箭头函数、类、装饰器等），preset 是插件集合。开发者可按需组合 preset 和插件，实现灵活的语法支持和定制。

> **常见应用场景：**
> - 新语法降级（ES6+ → ES5）
> - TypeScript/Flow 类型擦除
> - JSX 转换为 React.createElement
> - Polyfill 注入（如 Promise、Array.from 等）
> - 按需引入（如 lodash、Antd）

> **面试总结句式：**
> Babel 通过“解析-转换-生成”三步，把新一代 JS/TS/JSX 代码转成兼容旧环境的 ES5 代码，核心是 AST 转换和插件机制。实际工程中，Babel 是现代前端构建链的基础，配合 Webpack/Vite/TS 等工具链广泛使用。

### 五、AI 模块（加分题）

#### Q19：介绍 AI 智能分析模块的整体实现

> 整体分三层：
>
> **第一层 BFF 代理层**（`server.js`）：本项目 `server.js` 主要负责 DisasterAware 的 `/api` 代理与透传，不承担 OpenAI `/api/chat` 转发。AI 对话链路由前端直连 ai-flow 或 OpenAI-compatible 接口。
>
> **第二层 API 通信层**（`aiAssistant.ts`）：核心是 `buildSystemPrompt()` 和 `streamChatMessage()`。`buildSystemPrompt` 在每次请求前把当前地图实时灾害数据（事件总数、类型分布、近期代表事件）动态注入 System Prompt，让 AI 能回答"现在哪个地区最危险"这类实时问题。`streamChatMessage` 用原生 `fetch` + `ReadableStream` 手写 SSE 解析，`buf` 缓冲区处理跨 chunk 的不完整行，每解析出一个 token 通过 `onChunk` 回调传给 UI 层。没有 API Key 时自动进入 Demo 降级模式。
>
> **第三层 组件层**（`AIChatAssistant.tsx`）：发消息时先插入 `content: '', isStreaming: true` 占位消息，`onChunk` 每次追加 delta 触发重渲染，`MessageBubble` 做 Markdown 增量渲染，`onDone` 时 `isStreaming` 置 false，光标消失。

#### Q20：什么是 SSE？为什么不用 WebSocket？

> **SSE（Server-Sent Events）** 是浏览器原生支持的**服务器单向推送技术**，服务端通过一条持久 HTTP 长连接持续向客户端推送数据，客户端无需反复轮询，也无法通过同一连接反向发送数据。
>
> | 技术 | 方向 | 协议 | 适用场景 |
> |---|---|---|---|
> | **普通 fetch** | 一次请求，一次响应 | HTTP | 普通 API 请求 |
> | **SSE** | 服务端持续推送 → 客户端 | HTTP | **AI 流式输出**、实时通知 |
> | **WebSocket** | 双向通信 | WS（需升级握手） | 聊天室、多人游戏 |
>
> **SSE 数据格式极简**，每条消息以 `data:` 开头、`\n\n` 结尾：
> ```
> data: {"choices":[{"delta":{"content":"当"}}]}
> data: {"choices":[{"delta":{"content":"前"}}]}
> data: [DONE]
> ```
> OpenAI 的 `stream: true` 接口就是 SSE——每生成一个 token 就立刻推一条 `data:`，浏览器实时渲染，形成打字机效果。
>
> **本项目选 SSE 不用 WebSocket 的原因**：
> - LLM 的场景是**单向推流**，WebSocket 双向通信能力完全用不到
> - SSE 基于普通 HTTP，天然兼容现有代理、负载均衡和 CDN；WebSocket 需要服务端特殊支持
> - 实现更简单，用原生 `fetch + ReadableStream` 即可，无需握手协议和心跳维持

#### Q21：为什么不用 EventSource？

> `EventSource` 是浏览器原生 SSE API，但有两个关键限制：
> 1. **只支持 GET 请求**，无法发 POST body（LLM 需要在 body 里传 messages 历史）
> 2. **不支持自定义 Header**，无法传 `Authorization` token
>
> 所以用原生 `fetch + ReadableStream` 手写 SSE 解析，完全控制请求方式和 Header。


> **打字机效果**：
> - 当用户在 AI 聊天助手界面输入并发送消息时，首先会在 messages 数组中插入一条用户消息和一条内容为空、`isStreaming: true` 的 AI 占位消息。
> - 前端调用 `streamChatMessage`，与后端/LLM 建立流式连接。
> - 每收到 LLM 返回的新内容（chunk），会通过 `onChunk` 回调将该 chunk 追加到 AI 占位消息的 `content` 字段。
> - React 检测到 messages 状态变化后自动重渲染，用户界面上就能看到 AI 回复内容逐字出现，形成打字机动画。
> - 流式结束时（`onDone`），将 `isStreaming` 设为 false，光标（如 `▌`）消失，消息变为完整体。
> - 这种方式不仅提升了交互体验，还能让用户实时感知 AI 回复进度。
>
> **Markdown 增量渲染**：
> - `MessageBubble` 组件会对每条消息的 `content` 字符串做实时 Markdown 解析（如正则匹配加粗、标题、列表、表格、分割线等语法）。
> - 每次有新 chunk 到来，AI 消息的 `content` 字段发生变化，组件会重新解析并渲染对应的 Markdown 结构。
> - React diff 算法只会更新变化的 DOM 节点，不会整体替换，保证渲染高效。
> - 这样 Markdown 格式会随文字流式出现，用户能边看边读，而不是等全部内容到齐后一次性格式化。
> - 该机制适用于流式对话、长文本和复杂格式的实时展示。

#### Q23：动态上下文注入是 RAG 吗？

> 单看“动态上下文注入”这条链路，它不是标准 RAG（没有向量检索）；但从系统整体看，项目主链路已接入 ai-flow 工作流，支持配置 RAG 节点。
>
> 可以这样表述更准确：本项目采用“双路径”——主链路可做 RAG 编排，降级链路用 `buildSystemPrompt()` 把实时灾害数据直接注入 Prompt，保证低延迟和高可用。

---

### 六、工程化与 API 集成


#### Q24：manualChunks 是怎么实现的？

> 在我的项目中，`manualChunks` 主要用于 Vite 的代码分割优化。在 `vite.config.ts` 里，我根据路由和依赖库进行 chunk 拆分。比如把 Mapbox GL、Recharts、OpenAI 等大型依赖单独打成独立 chunk，首屏只加载业务代码，地图库等按需加载。这样可以显著减少首屏包体积，提高加载速度。最终结合 Tree Shaking 和懒加载，gzip 后 bundle 体积从 669KB 降到 71KB，提升了 89% 的性能。

#### Q25：bundle 体积从 669KB 降到 71KB 是怎么做的？

> 两个核心手段：
>
> **`manualChunks` 代码分割**：在 `vite.config.ts` 里按路由和按库拆分 chunk。把 Mapbox GL、Recharts、OpenAI 等大型依赖单独打成独立 chunk，首屏只加载业务代码，地图库按需加载。
>
> **`React.lazy()` 懒加载大组件**：`AIChatAssistant`、`AnalyticsPage`、`SaveReportModal`、`SettingsModal` 这些不在首屏渲染的大组件用 `lazy()` 包裹 + `Suspense` 边界，用户首次打开时不下载这些代码，触发对应功能时才异步加载。
>
> 结合 Vite 的 Tree Shaking（按需导入，移除未使用代码），最终 gzip 后从 669KB 降到 71KB，降幅 89%。

#### Q25：OAuth 2.0 Token 自动刷新是怎么做的？

> `authFetch` 是对 `fetch` 的封装：
> 1. 正常请求时带 `Authorization: Bearer ${accessToken}` Header
> 2. 如果服务端返回 **401 或 403**，说明 token 过期
> 3. 自动调 `refreshAccessToken()` 用 refreshToken 换新的 accessToken
> 4. 拿到新 token 后**重试原始请求**，对调用方完全透明
> 5. accessToken 和 refreshToken 存在 localStorage，减少每次请求都需要重新鉴权的频率

#### Q26：4 个异构数据源如何统一格式？

> 通过 **BFF 适配器层**：
> - 每个数据源对应一个 adapter 函数（如 `fetchDisasterAwareHazards`、`fetchUSGSEarthquakes`）
> - 各 adapter 内部做字段映射，把各自不同的字段名、坐标格式、时间格式统一转换成标准 `Hazard` 接口（`{ id, title, type, geometry, severity, timestamp, source }`）
> - 上层代码（`Promise.allSettled` 聚合 + 地图渲染）只需要处理 `Hazard[]`，完全不感知各数据源的差异
> - 单个 adapter 失败时返回空数组，不影响整体

---



#### QXX：AI模块是怎么实现的？

> 本项目的 AI 模块是基于 OpenAI LLM（大语言模型）API 实现的智能灾害分析助手，具备以下核心特性：
>
> 1. **深度集成 OpenAI Chat Completions API**，采用 SSE（Server-Sent Events）流式响应，支持逐字打印动画，提升 AI 交互体验。
> 2. **动态上下文注入**：每次请求前，自动将平台实时监控数据（如事件总数、类型分布、近期代表事件）动态拼接进 System Prompt，让 LLM 回答更贴合当前实际数据。
> 3. **多轮对话与上下文管理**：支持完整的对话历史链路，连续提问时能保持上下文，满足深度分析需求。
> 4. **预设分析工作流**：内置 6 类 Quick Prompts，覆盖全球态势、地震、洪水、野火、火山等专项分析和趋势预测。
> 5. **降级 Demo 模式**：无 API Key 时自动切换本地模拟响应，保证演示和开发体验。
> 6. **前端工程化**：AI 面板采用 React.lazy() + Suspense 懒加载，首屏性能无损失，API 调用成功率 99%+，首字响应 <1s。

#### Q27：Tree Shaking 是什么？你的项目中怎么用的？

> **Tree Shaking** 是一种在打包阶段**移除未被引用（未使用）代码**的优化技术，常见于 ES Module 体系。它通过静态分析 import/export，找出哪些函数、变量、模块没有被实际用到，然后在最终 bundle 里剔除这些“死代码”，从而减小包体积、提升加载速度。
>
> **在本项目中的应用**：
> - 使用 Vite + ESBuild 打包，天然支持 Tree Shaking。
> - 只按需 import 需要的函数、组件和第三方库（如 lodash、date-fns、echarts 等），避免全量引入。
> - 结合 manualChunks 和 React.lazy 懒加载，未被引用的代码和 chunk 会被自动剔除。
> - 通过分析打包报告（如 vite-plugin-visualizer），持续优化依赖引用方式，确保无用代码不会进入最终产物。
> - 实际效果：配合 Tree Shaking，bundle 体积从 669KB 降到 71KB。

#### Q27：什么是 WebGL？

> **WebGL**（Web Graphics Library）是浏览器内置的**调用 GPU 的 JavaScript API**，基于 OpenGL ES 2.0 标准，让网页可以直接使用显卡做硬件加速渲染，无需插件。
>
> **和普通 DOM / Canvas 2D 渲染的核心区别**：
>
> | | DOM / Canvas 2D | WebGL |
> |---|---|---|
> | **执行位置** | CPU（主线程） | GPU（并行） |
> | **绘制方式** | 逐个元素绘制 | 批量顶点着色器并行处理 |
> | **渲染路径** | Layout → Paint → Composite | 直接写显存，调 draw call |
> | **10w 个点** | 卡死（~5fps） | 流畅（55fps+） |
> | **适合场景** | 普通 UI、图表、表单 | 地图、3D、粒子效果 |
>
> **CPU vs GPU——工厂比喻**：
> - **CPU**：核心数少（4~16核），每核极强，擅长复杂逻辑、分支判断、串行任务 → React 组件、网络请求、数据处理
> - **GPU**：核心数极多（几千~几万），每核简单，擅长大量重复的简单计算 → 图形渲染、矩阵运算
>
> CPU 是 **10 个博士**，GPU 是 **10000 个流水线工人**。渲染 10w 个点时，每个点的操作完全相同（计算坐标→填色），GPU 让 10000 个核**同时**各处理一个顶点，CPU 只能一个一个来——这就是 WebGL 快的根本原因。
>
> **在本项目中的体现**：
> - DOM Marker 方案的瓶颈在浏览器渲染引擎的 Layout/Paint 阶段，JS 层面的优化触碰不到，必须跨到 WebGL 层解决
> - Mapbox GL JS 底层就是 WebGL，切换到 GeoJSON Layer 后，10w 个点位交给 GPU 一次 draw call，帧率从 5fps → 55fps+
>
> **本项目中 WebGL 的具体使用**：
> 1. **Mapbox GL JS 底图** — 地图瓦片、道路、建筑全部 WebGL 渲染
> 2. **LOD cluster 图层** — `hazards-lod` GeoJSON Source + circle layer，10w 点位批量绘制
> 3. **热力图图层** — `hazards-heatmap` layer，实时计算密度热力值
> 4. **deck.gl Tile3DLayer** — WebGL 渲染 3D Tiles 建筑模型
> 5. **fill-extrusion** — Mapbox 原生 3D 建筑拉伸，着色器计算高度

#### Q28：什么是 BFF？为什么要用它？

> BFF（Backend for Frontend）= 专为前端定制的代理/聚合层，介于前端和真正的后端服务之间。
>
> 本项目用 `server.js` 作为 BFF 的原因：
> 1. **安全**：OpenAI API Key 不能写在浏览器代码里（会被用户看到），server.js 保管 Key 代替前端发请求
> 2. **格式适配**：把 OpenAI 的 SSE 流直接 pipe 给前端，前端无需二次处理
> 3. **代理 CORS**：DisasterAware 等第三方 API 不允许浏览器直接跨域访问，由 BFF 转发

#### Q29：什么是 Hook？自定义 Hook 的规则是什么？

> Hook = React 函数组件里**复用状态逻辑**的机制，以 `use` 开头的函数。内置 Hook 有 `useState`、`useEffect`、`useRef`、`useMemo` 等。
>
> 自定义 Hook（如 `useHazardFetch`、`useFilter()`）= 把可复用的状态逻辑封装成函数，让多个组件共享逻辑而不共享状态。
>
> 两条核心规则：
> 1. **只能在函数组件或自定义 Hook 的顶层调用**，不能在条件语句、循环或普通函数里调用
> 2. **只能在 React 函数组件或自定义 Hook 里调用**，不能在普通 JS 函数里调用

#### Q30：fetch 和 XMLHttpRequest 的区别？

> | | `fetch` | `XMLHttpRequest` |
> |---|---|---|
> | **API 风格** | Promise-based，支持 async/await | 回调式，`.onload` / `.onerror` |
> | **流式读取** | 原生支持 `ReadableStream` | 不支持 |
> | **取消请求** | `AbortController` | `xhr.abort()` |
> | **上传进度** | 不支持（需用 XHR） | 支持 `onprogress` |
> | **使用场景** | 现代项目首选 | 需要上传进度条时 |
>
> 本项目用 `fetch` + `ReadableStream` 手写 SSE 解析，正是利用了 fetch 原生支持流式读取这一点。

---

### 八、React 19 进阶特性

#### Q31：React 19 的 Suspense 有什么变化？怎么用？

> **Suspense 是什么**：React 的「等待边界」组件，让 UI 能优雅地处理「还没准备好」的状态——把「不知道何时就绪」的事情交给 React 托管，无需手写 loading 状态。
>
> **传统写法 vs Suspense 对比：**
> ```tsx
> // ❌ 传统写法：自己管理 loading 状态，每个组件都要写一遍
> function HazardList() {
>   const [data, setData] = useState(null);
>   const [loading, setLoading] = useState(true);
>
>   useEffect(() => {
>     fetchHazards().then(d => { setData(d); setLoading(false); });
>   }, []);
>
>   if (loading) return <Spinner />;  // 手写
>   return <List data={data} />;
> }
>
> // ✅ Suspense 写法：loading 逻辑由框架接管，组件只管渲染
> function App() {
>   return (
>     <Suspense fallback={<Spinner />}>  {/* fallback = 等待时显示什么 */}
>       <HazardList />                   {/* 没准备好时自动显示 Spinner */}
>     </Suspense>
>   );
> }
> ```
>
> **两种触发方式：**
>
> | 场景 | 触发方式 |
> |---|---|
> | **代码懒加载** | `React.lazy(() => import('./Component'))` |
> | **数据请求**（React 19） | `use(somePromise)`，Promise pending 时自动挂起 |
>
> **React 19 的核心变化**：
>
> | | React 16–18 | React 19 |
> |---|---|---|
> | **服务端支持** | 仅客户端 | 完整 SSR Streaming 支持 |
> | **与 `use()` 配合** | ❌ 不支持 | ✅ `use(promise)` 直接触发 Suspense |
> | **兄弟节点行为** | 触发时隐藏全部兄弟节点 | 触发时**不再隐藏**已渲染的兄弟节点 |
> | **Transition 集成** | 手动 `startTransition` | `useTransition` + Suspense 自动协调 |
>
> **用法一：代码分割（懒加载）**
> ```tsx
> // 首屏不下载 AIChatAssistant，用户触发时才加载
> const AIChatAssistant = React.lazy(() => import('./components/AIChatAssistant'));
>
> function App() {
>   return (
>     <Suspense fallback={<div className="loading-spinner" />}>
>       <AIChatAssistant />
>     </Suspense>
>   );
> }
> ```
>
> **用法二：数据请求（React 19 `use()` 配合）**
> ```tsx
> // React 19：Suspense 边界捕获 promise 挂起
> function HazardList({ filterPromise }: { filterPromise: Promise<Hazard[]> }) {
>   const hazards = use(filterPromise);  // 挂起时自动触发上层 Suspense
>   return <ul>{hazards.map(h => <li key={h.id}>{h.title}</li>)}</ul>;
> }
>
> function App() {
>   return (
>     <Suspense fallback={<SkeletonList />}>
>       <HazardList filterPromise={fetchHazards(filter)} />
>     </Suspense>
>   );
> }
> ```
>
> **用法三：搭配 `useTransition` 避免 loading 闪烁**
> ```tsx
> function FilterBar() {
>   const [isPending, startTransition] = useTransition();
>   const [filter, setFilter] = useState('ALL');
>
>   const handleChange = (newFilter: string) => {
>     startTransition(() => {
>       setFilter(newFilter);  // 标记为低优先级，UI 不立即挂起
>     });
>   };
>
>   return (
>     <>
>       <select onChange={e => handleChange(e.target.value)} />
>       {isPending && <span>更新中...</span>}  {/* 细粒度 pending 状态 */}
>     </>
>   );
> }
> ```
>
> **本项目中的用法**：`React.lazy() + Suspense` 包裹 `AIChatAssistant`、`AnalyticsPage`、`SaveReportModal`、`SettingsModal`，首屏 bundle 从 669KB 降到 71KB（gzip），AI 面板等不在首屏的大组件按需加载。

#### Q32：React 19 的 `use()` Hook 是什么？和 `useEffect` + `useState` 有什么区别？

> **`use()` 是什么**：React 19 新增的 Hook，可以在渲染阶段直接「读取」一个 Promise 或 Context 的值。读取 Promise 时，若 Promise 未 resolve，组件自动挂起并触发上层 `<Suspense>` 显示 fallback。
>
> **核心特性**：`use()` 是目前唯一**可以在条件语句或循环里调用**的 Hook（其他 Hook 都只能在顶层调用）。
>
> **读取 Promise：**
> ```tsx
> // 传统写法：命令式，需要手写 loading/error 状态
> function HazardList({ filter }: { filter: string }) {
>   const [hazards, setHazards] = useState<Hazard[]>([]);
>   const [loading, setLoading] = useState(true);
>
>   useEffect(() => {
>     setLoading(true);
>     fetchHazards(filter).then(data => {
>       setHazards(data);
>       setLoading(false);
>     });
>   }, [filter]);
>
>   if (loading) return <Spinner />;
>   return <ul>{hazards.map(h => <li key={h.id}>{h.title}</li>)}</ul>;
> }
>
> // React 19 写法：声明式，Suspense 接管 loading，代码极简
> function HazardList({ hazardsPromise }: { hazardsPromise: Promise<Hazard[]> }) {
>   const hazards = use(hazardsPromise);  // 未 resolve 时自动挂起
>   return <ul>{hazards.map(h => <li key={h.id}>{h.title}</li>)}</ul>;
>   // 无需手写 loading/error，由 Suspense + ErrorBoundary 处理
> }
> ```
>
> **读取 Context（支持条件调用）：**
> ```tsx
> function ThemeButton({ showTheme }: { showTheme: boolean }) {
>   // ✅ use() 可以在 if 里调用，useContext 不行
>   if (showTheme) {
>     const theme = use(ThemeContext);
>     return <button style={{ color: theme.primary }}>按钮</button>;
>   }
>   return <button>按钮</button>;
> }
> ```
>
> **对比总结：**
>
> | | `useEffect` + `useState` | `use(promise)` |
> |---|---|---|
> | **代码量** | 需手写 loading / error / cleanup | 零样板，Suspense 接管 |
> | **数据流** | 命令式（副作用触发） | 声明式（渲染驱动） |
> | **条件调用** | ❌ 不能在 if/for 里 | ✅ 可以 |
> | **适合场景** | 副作用（订阅、定时器、DOM操作） | 纯数据读取 |
>
> **什么时候还用 `useEffect`？**：凡是有**副作用**的场景（订阅 WebSocket、注册事件监听、手动操控 DOM）仍然用 `useEffect`，`use()` 只负责「读数据」。

#### Q33：React Compiler 是什么？解决了什么问题？

> **是什么**：React 19 引入的**编译时自动优化工具**（原名 React Forget），在构建阶段自动分析组件，给需要缓存的值和函数**自动插入 `useMemo` / `useCallback`**，无需开发者手动优化。
>
> **解决的核心问题**：React 默认每次父组件重渲染，子组件也跟着重渲染，即使 props 没变。开发者过去需要手动用 `React.memo` + `useCallback` + `useMemo` 控制渲染边界，容易遗漏、容易过度优化、容易写错依赖数组。
>
> **手动优化 vs Compiler 自动优化：**
> ```tsx
> // ❌ 手动优化：boilerplate 多，useMemo 依赖数组容易写错
> function MapView({ hazards, filter, onSelect }: Props) {
>   const filtered = useMemo(
>     () => hazards.filter(h => h.type === filter),
>     [hazards, filter]   // 忘了写 filter → bug；多写了 → 过度缓存
>   );
>   const handleClick = useCallback(
>     (id: string) => onSelect(id),
>     [onSelect]          // onSelect 每次父组件渲染都是新引用 → 缓存失效
>   );
>   return <Map data={filtered} onClick={handleClick} />;
> }
>
> // ✅ React Compiler：直接写业务逻辑，编译器自动识别不变的值并缓存
> function MapView({ hazards, filter, onSelect }: Props) {
>   const filtered = hazards.filter(h => h.type === filter);  // 编译器自动 memoize
>   const handleClick = (id: string) => onSelect(id);        // 编译器自动稳定引用
>   return <Map data={filtered} onClick={handleClick} />;
> }
> ```
>
> **核心原理**：Compiler 在编译时做**值不变性分析**——追踪每个变量在每次渲染中是否可能变化，对「不变的计算」自动生成类似 `useMemo` 的缓存逻辑，对「不变的函数」自动稳定引用。
>
> **使用方式**：在 Vite/Babel 插件配置里启用，现有代码**零改动**直接受益：
> ```typescript
> // vite.config.ts
> import { defineConfig } from 'vite';
> import react from '@vitejs/plugin-react';
>
> export default defineConfig({
>   plugins: [
>     react({
>       babel: {
>         plugins: [['babel-plugin-react-compiler', {}]],
>       },
>     }),
>   ],
> });
> ```
>
> **注意事项与局限**：
>
> | | 说明 |
> |---|---|
> | **前提条件** | 代码必须遵守 React 规则（Hook 规则、纯函数组件）；有副作用的组件可能跳过优化 |
> | **不能完全替代 `useCallback`** | 跨组件传递回调、与第三方库配合时仍可能需要手动控制 |
> | **当前状态（2025）** | 已在 React 19 正式发布，Meta 内部大规模使用；生产可用，但新项目建议逐步引入 |
> | **能否和手动 memo 共存** | 能，Compiler 不会影响已有的 `useMemo` / `useCallback`；可混用 |
>
> **一句话总结**：React Compiler = 把「写业务逻辑」和「写性能优化」分开——开发者只管业务，编译器负责性能，彻底消除因遗漏 `useMemo` 依赖项导致的 bug。

#### Q34：React 19 状态管理方案有哪些？如何在 Zustand 和 Context 之间选择？

> **状态管理全景**：
>
> | 方案 | 包体积 | 适用规模 | 核心特点 |
> |---|---|---|---|
> | `useState` + props | 0（原生） | 单组件 / 简单父子 | 零依赖，数据流最清晰 |
> | `Context` + `useReducer` | 0（原生） | 中小型，域边界清晰 | 跨层级共享，按域拆分 |
> | **Zustand** | ~1KB gzip | 中大型，跨域状态频繁 | 无 Provider，selector 精确订阅 |
> | **Jotai** | ~3KB gzip | 高频局部更新 | 原子模型，粒度最细 |
> | Redux Toolkit | ~11KB gzip | 超大型，严格单向数据流 | DevTools 完善，boilerplate 重 |
>
> ---
>
> **Context + useReducer — 本项目实际方案**
>
> 按**职责域**拆分 4 个独立 Context，每个配自定义 Hook 作为唯一消费入口：
>
> ```tsx
> // HazardContext：灾害数据域
> const HazardContext = createContext<{ state: HazardState; dispatch: Dispatch } | null>(null);
>
> export function HazardProvider({ children }: { children: ReactNode }) {
>   const [state, dispatch] = useReducer(hazardReducer, initialState);
>   // useMemo 稳定 value 引用，防止 Provider 每次渲染都产生新对象
>   const value = useMemo(() => ({ state, dispatch }), [state]);
>   return <HazardContext.Provider value={value}>{children}</HazardContext.Provider>;
> }
>
> // 封装消费 Hook，禁止裸用 useContext
> export function useHazards() {
>   const ctx = useContext(HazardContext);
>   if (!ctx) throw new Error('useHazards must be used within HazardProvider');
>   return ctx;
> }
> ```
>
> Context 拆分的性能收益：`filter` 变化只触发订阅 `FilterContext` 的组件，`StatisticsCard` 只订阅 `HazardContext`，完全不受筛选切换影响，重渲染次数降低 ~60%。
>
> ---
>
> **Zustand — 规模扩大时的升级路径**
>
> ```tsx
> // 无 Provider，无 boilerplate，直接定义 store
> const useHazardStore = create<HazardStore>((set) => ({
>   hazards: [],
>   filter: 'ALL',
>   loading: false,
>   setFilter: (filter) => set({ filter }),
>   setHazards: (hazards) => set({ hazards, loading: false }),
> }));
>
> // selector 精确订阅：filter 变化不会触发 MapView 重渲染
> function MapView() {
>   const hazards = useHazardStore(state => state.hazards);  // 只订阅 hazards
>   // ...
> }
>
> function StatusPanel() {
>   const filter = useHazardStore(state => state.filter);    // 只订阅 filter
>   const setFilter = useHazardStore(state => state.setFilter);
>   // ...
> }
> ```
>
> ---
>
> **Zustand vs Context + useReducer 深度对比**：
>
> | 维度 | Context + useReducer | Zustand |
> |---|---|---|
> | **包体积** | 0（内置） | ~1KB gzip |
> | **Provider 嵌套** | 需要，多域时嵌套深 | **无需 Provider** |
> | **精确订阅** | 需手动拆分 Context 域 | selector 函数，任意粒度 |
> | **跨域访问** | 需嵌套多个 Context | 一个 store，按需 selector |
> | **异步 action** | `useEffect` 手写 | middleware（thunk/immer）支持 |
> | **DevTools** | 需手动接入 | 内置 Redux DevTools 支持 |
> | **迁移成本** | 低（原生） | 极低，可渐进替换单个 Context |
> | **适用信号** | 域边界清晰、状态不频繁跨域 | 状态频繁跨域、跨多个 Context |
>
> **何时从 Context 迁移到 Zustand？** 出现以下任一信号就该考虑：
> - 组件需要同时订阅 3 个以上 Context
> - `Provider` 嵌套层数 > 4 层，形成「Provider 地狱」
> - 某个状态变化需要同步更新多个域的数据
> - 异步 action 逻辑复杂，写在 `useEffect` 里难以维护
>
> **迁移策略（渐进式）**：只改自定义 Hook 内部，消费组件零感知：
> ```tsx
> // 迁移前：useHazards() 内部读 Context
> export function useHazards() {
>   return useContext(HazardContext)!;
> }
>
> // 迁移后：useHazards() 内部改读 Zustand store，消费组件代码不用改一行
> export function useHazards() {
>   const hazards = useHazardStore(state => state.hazards);
>   const dispatch = useHazardStore(state => state.dispatch);
>   return { state: { hazards }, dispatch };
> }
> ```
>
> **选择路径**：
> ```
> 单组件局部状态         → useState
> 父子层级不深           → props（直接传）
> 跨层级 / 按域隔离      → Context + useReducer（本项目当前方案）
> 跨域频繁 / Provider 地狱 → Zustand（首选升级方向）
> 高频局部更新（地图点位）  → Jotai（原子粒度最细）
> 超大型团队 / 严格架构    → Redux Toolkit
> ```
>
> _🎤 **口述提示**：「我们项目用的是 Context + useReducer，按职责域拆成 4 个 Context，重渲染降了 60%。如果组件树继续扩大、状态跨域更频繁，我的升级方向是 Zustand——好处是无 Provider 嵌套、selector 精确订阅更灵活，而且通过封装自定义 Hook，迁移时消费组件一行代码不用改。」_

---

### 九、概念名词速查

> 所有技术名词集中于此，面试前快速过一遍。按主题分组，每条：**是什么 + 本项目怎么用**。

---

#### React 19 新特性

**Suspense**
> 让组件在异步内容未就绪时自动显示 fallback，就绪后无缝切换，无需手写 loading 状态。React 19 新增：兄弟节点不再被隐藏、完整 SSR Streaming 支持、与 `use()` + `useTransition` 深度集成。本项目：`React.lazy() + Suspense` 懒加载 AI 面板等大组件，首屏 bundle 从 669KB → 71KB。

**`use()` Hook**
> React 19 新增，在渲染阶段直接「读取」Promise 或 Context 的值。读 Promise 时若未 resolve 自动触发上层 Suspense；读 Context 时可在条件语句里调用（唯一可条件调用的 Hook）。对比 `useEffect + useState`：代码量极少，声明式，Suspense 接管 loading/error。仍需 `useEffect` 的场景：订阅、定时器、DOM 操作等副作用。

**React Compiler（React Forget）**
> React 19 的编译时自动优化工具，在构建阶段分析组件，自动插入 `useMemo` / `useCallback`，无需开发者手动优化。原理：编译时做值不变性分析，追踪哪些计算/函数在每次渲染中不变，自动生成缓存逻辑。使用：Vite/Babel 插件一行启用，现有代码零改动受益。局限：要求代码遵守 React 纯函数规则，跨组件传回调等场景仍可能需手动控制。

---

#### 并发与异步

**Race Condition（竞态条件）**
> 两个或多个异步操作同时进行，最终结果取决于它们完成的顺序，而这个顺序不可预测，导致数据错误。本质：程序没有感知异步操作的完成顺序可能与发起顺序不一致，后完成的结果覆盖了先完成的。本项目场景：用户快速切换「地震→洪水→野火」，旧请求晚回来覆盖新数据。

**竞态保护**
> 防止竞态条件导致数据错乱的机制集合，核心目标：确保最终状态永远对应最新的用户操作。本项目三层：网络层 `AbortController.abort()` 取消旧请求 → 数据层 `Promise.allSettled` 容错聚合 → 状态层 `useRef` 版本号兜底过期回调。

**AbortController**
> 浏览器原生 Web API，用于取消 `fetch` 请求。`controller.signal` 传给 `fetch`，调 `controller.abort()` 后 fetch 抛 `AbortError`。同一个 controller 可绑多个请求，一次 `abort()` 全部取消。本项目：每次 filter 变化创建新 controller，先 abort 旧请求再发新请求。

**useRef 版本号**
> 用 `useRef` 维护单调递增数字标记请求代次，异步回调里版本号不匹配则静默丢弃，不执行 `setState`。作用：兜底 AbortController 无法覆盖的场景（第三方 SDK 回调、已 resolve 的 Promise）。与 AbortController 分工：AbortController 是网络层防线，版本号是状态层兜底。

**Promise.all vs Promise.allSettled**
> `Promise.all`：任一 reject 整体立即失败，适合所有数据缺一不可的场景。`Promise.allSettled`：等全部 settle，每项返回 `{status, value/reason}`，适合多源容错。本项目必须用 `allSettled`：GDACS 一次超时不能让用户连地震数据都看不到。

**fetch**
> 浏览器内置 HTTP 请求 API，XHR 的现代替代品。Promise-based，支持 `async/await`；原生支持 `ReadableStream`（SSE 依赖它）；用 `AbortController` 取消。本项目两处关键用法：AI 流式 SSE 解析 + 多数据源并发容错聚合。

**RxJS**
> 用 Observable 流处理异步事件的库。把网络请求、用户事件、定时器抽象成"数据流"，用操作符变换/过滤/合并。擅长防抖+取消+重试组合场景，但打包约 40KB+。本项目选择原生 AbortController 替代，零依赖。

---

#### React 概念

**Hook**
> React 函数组件里以 `use` 开头的特殊函数，让函数组件能使用状态和生命周期。常用：`useState`（存状态）、`useEffect`（副作用）、`useRef`（不触发渲染的可变值）、`useMemo`（缓存计算）、`useCallback`（缓存函数引用）。两条规则：只能在顶层调用（不能在 if/for 里）；只能在 React 函数里调用。

**自定义 Hook**
> 把多个内置 Hook 组合成可复用逻辑，以 `use` 开头命名。本项目 `useHazardFetch(filter)` 封装了 `useState + useEffect + AbortController + 版本号`，竞态保护逻辑一行调用。

**Props Drilling（属性钻透）**
> 为了把数据传给深层组件，不得不让中间每一层都转手传递 props，即使中间组件根本不需要这个数据。症状：中间层被迫知道它不关心的数据；加一个新 prop 整条链都要改签名。解决方案：Context，让深层组件直接消费，跳过中间层。

**Context**
> React 跨层级数据共享机制，`createContext` 创建频道，`Provider` 在顶部广播，`useContext` 在任意深度收听，无需 props 传递。注意：Context value 变化时所有消费者都重渲染，所以要按职责域拆分细粒度 Context。本项目 4 个：HazardContext / FilterContext / UIContext / NotificationContext。

**Zustand**
> 极简全局状态库，无 Provider、无 boilerplate，用 selector 函数精确订阅，`filter` 变化不触发只用 `hazards` 的组件重渲染。适合有关联的中型状态。

**Jotai**
> 原子化状态库，把每个状态拆成独立 `atom`，组件只订阅用到的 atom，更新粒度最细。可派生 atom 自动追踪依赖（类似 `useMemo`）。适合完全独立的高频局部状态。

**三者选择路径**：`useState`（当前规模）→ `Context + useReducer`（层级加深）→ `Zustand`（跨域频繁）→ `Jotai`（极细粒度更新）。

---

#### 工程化与 API 集成

**OAuth 2.0 Token 鉴权**
> 一套授权框架，核心逻辑：用用户名+密码**一次性换取两个 Token**，后续用 Token 代替密码发请求，密码不再反复传输。
>
> | Token | 作用 | 有效期 |
> |---|---|---|
> | **accessToken** | 每次请求带在 Header（`Authorization: Bearer xxx`），证明"我有权限访问" | 短，通常 1 小时 |
> | **refreshToken** | 专门用来换新 accessToken，不用于业务请求本身 | 长，通常 30 天 |
>
> **本项目流程**：
> ```
> 1. 首次授权：POST /api/authorize（用户名+密码）→ 换取 accessToken + refreshToken
> 2. 正常请求：fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
> 3. Token 过期：服务端返回 401/403
> 4. 自动刷新：用 refreshToken 换新 accessToken（POST /api/token/refresh）
> 5. 透明重试：新 Token 重发原始请求，调用方完全无感知
> ```
>
> **类比**：accessToken = 地铁一日票（短期有效），refreshToken = 身份证（凭它随时买新票），密码 = 你本人（只在买第一张票时出示）。
>
> **`authFetch` 的价值**：把「401 检测 → 刷新 → 重试」封装在一个函数里，业务层只调 `authFetch(url)` 拿数据，完全不关心 Token 状态。这是本项目接入 DisasterAware API 的核心机制。

---

#### AI 模块

**BFF（Backend For Frontend）**
> 专为前端定制的中间层服务，介于前端和真正的后端之间。本项目用 `server.js` 作 BFF 的核心原因：OpenAI API Key 不能暴露在浏览器里（Network 面板可见），由 server.js 保管并代替前端发请求；同时承担 SSE 流转发（`response.body.pipe(res)`）和 CORS 代理。

**Prompt（提示词）**
> 发给 AI 的"指令"，决定 AI 怎么回答。System Prompt：系统级指令，用户看不到，设定 AI 角色和背景知识（类比岗前培训手册）。User Prompt：用户输入的消息（类比具体任务）。本项目每次请求前动态重建 System Prompt，把实时灾害数据注入其中。

**上下文注入（Dynamic Context Injection）**
> 在发请求前，把当前运行时数据结构化地拼进 System Prompt，让 LLM 能参考这些信息回答实时问题。区别于 RAG（无向量检索）：直接把结构化数据拼字符串，适合少量、高频更新的实时数据。本项目：把当前灾害事件总数、类型分布、近期代表事件注入每次请求的 System Prompt。

**Markdown 增量渲染**
> AI 回复一边输出一边被渲染成格式化内容。数据是增量的（每次 +delta）→ 渲染是全量的（每次重 parse 整个字符串）→ DOM 更新是增量的（React diff 只改变化的节点）。三者结合，视觉上文字逐字出现并自动带格式。

**SSE（Server-Sent Events）**
> 浏览器原生服务器单向推送技术，基于 HTTP 长连接，服务端持续推送，客户端不能反向发送。每条消息 `data: {json}\n\n` 格式。LLM 流式输出用 SSE：每生成一个 token 推一条，形成打字机效果。本项目用原生 `fetch + ReadableStream` 手写解析，不用 EventSource（不支持 POST 和自定义 Header）。

---

## 面试常见问题回答

### Q：你接触过 Cesium 和 OpenLayers 吗？

**Cesium：有间接接触**

> "我没有直接使用过 CesiumJS，但在项目中通过 `@loaders.gl/3d-tiles` 的 `CesiumIonLoader` 对接了 Cesium Ion 平台，加载标准 3D Tiles 数据，了解 Cesium Ion 的 token 认证机制和 3D Tiles 格式规范。"

技术依据：`MapView.tsx` 中 `import { CesiumIonLoader } from "@loaders.gl/3d-tiles"`，通过 deck.gl `Tile3DLayer` + `CesiumIonLoader` 挂载到 Mapbox overlay，支持 Bearer token 鉴权。

---

**OpenLayers：没有接触**

> "OpenLayers 我目前没有使用过。我的项目地图模块基于 Mapbox GL JS + deck.gl 构建，实现了热力图、LOD 聚合图层、3D 建筑等功能。OpenLayers 和 Mapbox 在 API 设计上有差异，但核心的地图图层、数据源、投影、交互等概念是相通的，上手应该不会太难。"

---

**关键原则**：
- 如实说没用过，但展示**迁移能力**和**相关背景**
- 把实际做的事（Mapbox GL JS + deck.gl + 3D Tiles + WebGL LOD）说清楚，这本身就是亮点
- 不要为了迎合面试官谎称熟悉，后续技术追问会露馅

---

### Q：追问——你为什么要对接 Cesium Ion 平台？

**核心回答（技术决策视角）**：

> "项目有一个 LOD 三级调度需求：全球缩放用聚合气泡，区域缩放用 Marker，城市级别要展示 3D 建筑体块。fill-extrusion 是 Mapbox 内置方案，只能渲染 OSM 建筑轮廓，精度和细节有限；而 Cesium Ion 托管的是符合 OGC 标准的 **3D Tiles** 格式数据，支持真正的倾斜摄影、精细建筑模型，适合城市级精准可视化需求。"

**为什么选 Cesium Ion 而不是自建 3D Tiles 服务**：

> "自建需要采购倾斜摄影数据、部署 3D Tiles 转换服务（如 Cesium Native），成本高、周期长。Cesium Ion 提供托管 + CDN + Bearer token 鉴权一体化方案，我们只需传入 `accessToken` 和 tileset URL，`CesiumIonLoader` 自动处理认证和分片加载，工程成本极低。"

**为什么不直接用 CesiumJS 而是通过 deck.gl 桥接**：

> "项目主地图引擎是 Mapbox GL JS，整个交互体系（热力图、LOD 聚合、标记点、弹窗）都建在 Mapbox 上，换引擎成本极高。deck.gl 的 `MapboxOverlay` 方案可以把 `Tile3DLayer` 作为 overlay 叠加到 Mapbox 画布上，既保留 Mapbox 完整的交互能力，又获得 deck.gl 对 3D Tiles 的渲染支持，两全其美。"

**兜底说法（如果追问实际效果）**：

> "这个方案在代码层面是完备的，已通过环境变量 `VITE_3D_TILES_URL` 做功能开关，未配置时自动回退到 Mapbox fill-extrusion 模式，不影响主流程。生产环境是否启用取决于是否购买了 Cesium Ion 订阅，这属于业务资源决策，技术上是随时可以接入的。"

---
