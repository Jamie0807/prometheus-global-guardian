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
