# 前端面试题 - 核心职责与技术实现 (按简历顺序整理)

## 0. 项目背景与业务价值 (Project Background & Business Value)

### Q: 请简要介绍一下 Prometheus Global Guardian 项目的业务背景、目的及核心价值？

**业务背景 (Context)**
面对全球气候变化导致的频发自然灾害，传统的单一数据源（如仅监控地震或仅监控天气）无法满足综合监控需求。我们需要一个能够**聚合全球多源权威数据**（USGS, NASA, GDACS, DisasterAware）的平台，在一个统一的 **3D 地球视图**中实时展示地震、洪水、野火等 10+ 种灾害。

**项目目的 (Goal)**
构建一个**实时、直观、交互式**的全球灾害态势感知平台。
1.  **数据融合**：解决数据源分散、格式不统一的问题，将异构数据标准化。
2.  **实时监控**：确保灾害发生后能以秒级延迟推送到前端，实现“态势感知”。
3.  **决策支持**：通过可视化图表和智能分析（Python 微服务），为用户提供风险评估和趋势预测。

**业务价值与效果 (Business Impact)**
*   **时效性提升**：实现了全球灾害事件的**实时追踪**，端到端响应延迟控制在 **<3秒** 以内。
*   **数据完整性**：整合 4 大权威数据源，实现了 **100% 全球覆盖**，数据同步成功率达到 **99.5%+**。
*   **用户体验质变**：
    *   从传统的二维列表/平面地图升级为 **3D 交互式地球**，交互响应 **<50ms**。
    *   首屏加载体积减少 **89%** (669KB -> 71KB)，显著提升了全球各地（包括弱网地区）的访问速度。
*   **系统稳定性**：通过错误降级和边界处理，应用稳定性提升 **95%**，确保单一数据源故障不影响整体监控。

---

## 0.5. 项目难点与亮点 (Challenges & Highlights)

### Q: 在这个项目中，你遇到的最大挑战是什么？你是如何解决的？

**难点 1：海量实时数据的 3D 地球高性能渲染**
*   **挑战**：需要在 3D 地球上实时渲染数百个动态灾害标记，同时保持流畅的交互（缩放、旋转、点击），且不能阻塞主线程。
*   **解决方案**：
    *   利用 **Mapbox GL JS** 的 WebGL 能力进行硬件加速渲染。
    *   使用 **GeoJSON** 标准格式管理数据源，配合 Mapbox 的 `Source` 和 `Layer` 机制。
    *   在 React 层使用 **useMemo** 缓存数据转换逻辑，使用 **React.memo** 优化组件重渲染，确保地图交互响应延迟 **<50ms**。

**难点 2：多源异构数据的实时融合与高可用性**
*   **挑战**：集成了 4 个不同权威机构（USGS, NASA, GDACS, DisasterAware）的 API，数据格式各异，且单一接口可能不稳定或超时。
*   **解决方案**：
    *   设计**适配器模式 (Adapter Pattern)**，将异构数据统一清洗为标准的 `Hazard` 接口。
    *   使用 **Promise.allSettled** 并发请求，配合**错误降级 (Error Fallback)** 策略。即使主数据源（DisasterAware）挂了，系统也能自动降级展示 USGS 或 GDACS 的数据，保证监控不中断。

**难点 3：首屏加载性能优化 (Bundle Size Optimization)**
*   **挑战**：引入 Mapbox GL 和 Recharts 等大型库后，首屏 Bundle 体积过大（>2MB），导致加载缓慢。
*   **解决方案**：
    *   实施 **Vite manualChunks** 策略，将第三方库（Vendor）独立拆包。
    *   结合 **React.lazy + Suspense** 对非首屏组件（如数据分析页）进行懒加载。
    *   **成果**：首屏 Bundle 体积减少 **89%** (669KB -> 71KB)，构建时间减少 29%。

---

## 第一部分：前端架构与核心技术 (Architecture & Core)

### 1. 全球范围灾害实时追踪怎么实现？
**核心概念**：这是一个**系统设计**问题，涉及数据采集、处理、分发和展示的全链路。

**在本项目中的实现逻辑**：
1.  **多源采集**：后端或前端定时从 USGS（地震）、NASA（火灾）、GDACS（综合）等接口拉取数据。
2.  **数据融合**：将不同来源的数据清洗、去重、标准化为统一格式。
3.  **状态更新**：前端 React 组件接收到新数据，更新 State。
4.  **地图渲染**：Mapbox 根据新的 State 数据，实时更新地图上的标记点位置和颜色。
5.  **轮询机制**：通过 `setInterval` 每隔 5 分钟自动执行一次上述流程，确保数据“实时”。

### 2. （23种统计算法 + 5个预测模型）实现高级分析是什么？
**核心概念**：这指的是**后端数据处理能力**与前端可视化的结合。前端不仅仅是展示原始数据，还展示经过复杂计算后的**洞察（Insights）**。

**在本项目中的应用**：
简历中提到 *"集成 Python FastAPI 微服务...实现高级分析"*。
*   **架构**：前端（React）收集到灾害数据 -> 发送给 Python 后端 -> 后端运行算法 -> 返回分析结果 -> 前端展示。
*   **具体内容**：
    *   **23种统计算法**：可能包括平均值、中位数、标准差、方差分析、趋势斜率计算等，用于生成 `StatisticsCard` 中的数据。
    *   **5个预测模型**：可能包括线性回归（预测灾害增长趋势）、DBSCAN（地理聚类分析）、时间序列预测等。
*   **前端价值**：前端工程师负责设计 API 接口格式，处理异步请求，并将复杂的数学结果转化为直观的图表或风险评分（Risk Score）。

### 3. React Hooks 是什么？
**核心概念**：**React Hooks** 是 React 16.8 引入的革命性特性，它允许你在**不编写 Class 组件的情况下，使用 state（状态）和其他 React 特性（如生命周期）**。

**解决了什么问题？**
1.  **告别“包装地狱”（Wrapper Hell）**：以前复用逻辑需要用高阶组件（HOC）或 Render Props，导致组件层级极深。Hooks 允许我们将逻辑提取为自定义 Hook（如 `useFetch`），实现扁平化的逻辑复用。
2.  **逻辑聚合**：在 Class 组件中，相关的逻辑（如订阅/取消订阅）被迫分散在 `componentDidMount` 和 `componentWillUnmount` 中。Hooks（如 `useEffect`）允许将相关联的代码写在一起。
3.  **拥抱函数式编程**：组件本质上就是函数，避免了 Class 组件中 `this` 指向的困扰，代码更简洁、更易于压缩。

**在本项目中的实际应用（结合代码）**：
简历中提到 *"使用 React Hooks（useState、useEffect、useCallback、useMemo）实现状态管理"*。

*   **useState**：在 `src/App.tsx` 中管理全局的灾害数据 `disasters` 和模态框开关 `isSaveModalOpen`。
*   **useEffect**：在 `src/components/MapView.tsx` 中初始化 Mapbox 地图实例。这是典型的“挂载时执行一次”的副作用。
    ```tsx
    useEffect(() => {
      if (map.current) return; // 防止重复初始化
      map.current = new mapboxgl.Map({ ... });
      return () => { map.current?.remove(); }; // 清理函数
    }, []);
    ```
*   **useMemo**：在 `src/components/ChartsPanel.tsx` 中缓存时间线数据的计算结果，避免每次渲染都重新遍历几百条灾害数据。
    ```tsx
    const timelineData = React.useMemo(() => {
      // 昂贵的遍历、排序、聚合操作
      return hazards.map(...).sort(...);
    }, [hazards]);
    ```
*   **useCallback**：用于缓存事件处理函数，配合 `React.memo` 避免子组件不必要的重渲染。

---

## 第二部分：地图开发与数据可视化 (Map & Visualization)

### 4. Mapbox GL JS 3.15 是什么？
**核心概念**：**Mapbox GL JS** 是一个用于在 Web 上渲染交互式地图的 JavaScript 库。它利用 **WebGL** 技术，可以直接在浏览器中渲染矢量瓦片（Vector Tiles），支持流畅的缩放、旋转和 3D 效果。

**解决了什么问题？**
*   **高性能渲染**：相比传统的栅格地图（图片拼接），WebGL 可以利用 GPU 加速，轻松渲染成千上万个动态标记点（Markers）而不卡顿。
*   **3D 地球视图**：v3.x 版本引入了 `projection: 'globe'`，可以原生展示 3D 地球形态，而不是平面的墨卡托投影，非常适合全球灾害监控场景。

**在本项目中的应用**：
简历中提到 *"基于 Mapbox GL JS 3.15 开发交互式 3D 地球视图"*。
*   **核心功能**：加载地图底图、渲染灾害标记点、处理地图交互（缩放、旋转）、展示 Popup 弹窗。

### 5. GeoJSON 格式是什么？
**核心概念**：**GeoJSON** 是一种基于 JSON 的格式，用于编码各种地理数据结构。它是地理信息系统（GIS）和 Web 地图开发中的**标准数据交换格式**。

**结构示例**：
```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [125.6, 10.1] },
  "properties": { "name": "Dinagat Islands" }
}
```

**在本项目中的应用**：
简历中提到 *"使用 GeoJSON 格式渲染 200-400 条实时灾害标记"*。
*   **数据转换**：后端 API 返回的数据格式可能各不相同。前端需要编写适配器（Adapter），将它们统一转换为 GeoJSON `FeatureCollection` 格式。
*   **地图渲染**：Mapbox GL JS 原生支持 GeoJSON 数据源（`Source`）和图层（`Layer`），可以直接将 GeoJSON 数据渲染为地图上的圆点、热力图或 3D 柱状图。

### 6. 点击钻取（Click Drill-down）是什么？
**核心概念**：**点击钻取**是一种交互式数据分析技术。用户通过点击图表中的某个数据元素（如饼图的一个扇区、柱状图的一根柱子），触发数据的**层级下探**，查看该元素背后更详细的数据子集。

**在本项目中的应用**：
简历中提到 *"支持点击钻取查看详细数据"*。
**场景**：`ChartsPanel` 组件。
*   **交互流程**：用户点击饼图中的“洪水”扇区 -> 系统弹出模态框展示所有“洪水”类型的具体事件列表。
*   **技术实现**：Recharts 的 `onClick` 事件回调 + React State 存储过滤条件 + 数组 `filter` 方法。

---

## 第三部分：性能优化 (Performance Optimization)

### 7. 首屏 Bundle 减少是什么？（结合项目代码）
**核心概念**：**首屏 Bundle** 指的是用户访问网站首页时，浏览器必须下载、解析并执行的 JavaScript 文件集合。**首屏 Bundle 减少** 就是通过技术手段将这个初始下载包的体积尽可能缩小。

**在本项目中的实际应用（如何做到减少 89%？）**
简历中提到 *"首屏 bundle 减少 89%（669KB→71KB gzip）"*。这是通过以下两套组合拳实现的：

1.  **拆分第三方巨无霸库 (manualChunks)**：
    *   将 `mapbox-gl` (500KB+) 和 `recharts` 等大库从主包中拆分出来。
    *   **效果**：用户第二次访问时，这些 vendor chunk 直接从缓存读取，无需重新下载。

2.  **延迟加载非首屏业务代码 (React.lazy)**：
    *   首页只加载地图。复杂的“数据分析页面（AnalyticsPage）”包含大量的图表逻辑，但用户不一定马上看。
    *   **代码证据**：在 `src/App.tsx` 中使用 `const AnalyticsPage = lazy(() => import("./components/AnalyticsPage"));`。
    *   **效果**：`AnalyticsPage` 的代码完全不会出现在首屏 Bundle 中。只有当用户点击“分析”按钮时，才会发起网络请求下载。

### 8. manualChunks 代码分割策略是什么？
**核心概念**：**manualChunks** 是 Vite（底层基于 Rollup）构建配置中的一个选项，用于**自定义代码分割（Code Splitting）策略**。

**在本项目中的应用**：
在 `vite.config.ts` 中配置：
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom'],
        'mapbox-vendor': ['mapbox-gl'], // 独立打包 Mapbox
        'charts-vendor': ['recharts'],  // 独立打包 Recharts
        'utils-vendor': ['date-fns', 'lodash']
      }
    }
  }
}
```
**解决了什么问题？**：避免将所有代码打包成一个巨大的文件，利用浏览器缓存机制，提升二次加载速度。

### 9. React.lazy() + Suspense 懒加载是什么？
**核心概念**：React 原生提供的**代码分割**方案，用于实现组件的**按需加载**。

**在本项目中的应用**：
简历中提到 *"使用 React.lazy() + Suspense 对 AnalyticsPage 等3个大型组件实施懒加载"*。
*   **场景**：`AnalyticsPage` 体积大且非首屏必需。
*   **实现**：
    ```tsx
    const AnalyticsPage = React.lazy(() => import('./components/AnalyticsPage'));
    // ...
    <Suspense fallback={<div className="loading">Loading...</div>}>
      {showAnalytics && <AnalyticsPage />}
    </Suspense>
    ```
*   **价值**：显著减小首屏体积，加快 FCP（首次内容绘制）。

### 10. useMemo 是什么？
**核心概念**：**useMemo** 是一个 React Hook，用于**缓存计算结果**。只有当依赖项发生变化时，才会重新计算。

**在本项目中的应用**：
简历中提到 *"通过 useMemo 缓存计算结果优化大数据渲染性能"*。
*   **场景**：`ChartsPanel` 组件中，从原始灾害列表计算时间线数据。
*   **代码**：
    ```typescript
    const timelineData = React.useMemo(() => {
      return hazards.map(...).sort(...);
    }, [hazards]);
    ```
*   **价值**：避免每次组件重渲染（如 Loading 状态变化）时都执行昂贵的数组遍历操作，防止页面卡顿。

### 11. Tree Shaking（摇树优化）是什么？
**核心概念**：移除 JavaScript 上下文中**死代码（Dead Code）**的过程。

**在本项目中的应用**：
简历中提到 *"通过 Tree Shaking、Gzip 压缩优化资源加载"*。
*   **原理**：Vite 生产环境构建使用 Rollup，它会自动分析 `import` 和 `export`。如果你引入了一个工具库但只用了其中一个函数，Tree Shaking 会确保只有那个函数被打包，其余未使用的代码会被丢弃。

---

## 第四部分：数据处理与 API 集成 (Data & API)

### 12. Promise.allSettled 并发请求是什么？
**核心概念**：ES2020 引入的方法，接收一个 Promise 数组，**并发执行**所有 Promise，并等待所有结果（无论成功或失败）。

**在本项目中的应用**：
简历中提到 *"设计 Promise.allSettled 并发请求 + 错误降级机制"*。
*   **场景**：同时请求 USGS, NASA, GDACS 等 4 个数据源。
*   **优势**：相比 `Promise.all`（一挂全挂），`Promise.allSettled` 允许部分接口失败。如果 NASA 挂了，用户依然可以看到 USGS 的地震数据，保证了系统的**容错性**。

### 13. 去重处理（Deduplication）是什么？
**核心概念**：识别并移除重复的数据项。

**在本项目中的应用**：
简历中提到 *"实现数据格式标准化、去重处理"*。
*   **场景**：同一个地震事件可能同时出现在 USGS 和 DisasterAware 的 API 中。
*   **实现**：
    1.  **标准化**：将不同来源数据转换为统一接口。
    2.  **唯一键**：使用 `经纬度 + 时间` 或 `事件ID` 作为唯一标识。
    3.  **过滤**：合并数据时剔除重复项，防止地图上出现重叠标记。

### 14. 自动数据刷新、实时通知是什么？
**核心概念**：提升用户体验，无需手动刷新即可获取最新信息。

**在本项目中的应用**：
*   **自动刷新**：使用 `useEffect` + `setInterval` 每 5 分钟重新请求一次 API。
*   **实时通知**：对比新旧数据的条数。如果 `newCount > prevCount`，触发通知组件，提示用户“检测到新灾害记录”。

---

## 第五部分：工程化与质量保证 (Engineering & Quality)

### 15. HMR (Hot Module Replacement) 热更新是什么？
**核心概念**：在应用运行时**替换、添加或删除模块，而无需重新加载整个页面**。

**在本项目中的应用**：
简历中提到 *"实施 Vite 7.1 构建工具链，HMR 热更新 <200ms"*。
*   **价值**：保留应用状态（如弹窗打开状态），提供极速的开发反馈循环。Vite 利用浏览器原生 ESM，使得 HMR 速度极快。

### 16. 错误降级（Error Fallback）是什么？
**核心概念**：当系统部分故障时，提供简化的替代方案，防止系统完全崩溃。

**在本项目中的应用**：
*   **API 降级**：DisasterAware API 失败时，自动切换展示 USGS 数据（通过 `Promise.allSettled` 或 `try-catch` 实现）。
*   **UI 降级**：使用 `ErrorBoundary` 组件包裹图表。如果图表组件崩溃，仅显示“加载失败”，而不导致整个页面白屏。

### 17. Prettier 是什么？
**核心概念**：**代码格式化工具**，强制执行一致的代码风格。

**在本项目中的应用**：
简历中提到 *"使用 ESLint + Prettier 建立代码规范"*。
*   **作用**：自动处理缩进、引号、换行等风格问题，确保团队代码风格统一，提升可读性。
