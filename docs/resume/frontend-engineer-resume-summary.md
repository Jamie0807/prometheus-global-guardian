# 简历项目经验（前端工程师版本）

## Prometheus Space Technologies
**前端工程师** | Sep 2025 – present

### 核心职责总结：

• **主导全栈灾害监控平台设计与交付**：独立负责 Prometheus Global Guardian 从架构选型到上线全流程，基于 **React 19.1 + TypeScript 5.9 + Vite 7.1** 搭建现代化前端工程体系，集成 **4 大权威数据源**（DisasterAware / USGS / NASA EONET / GDACS），覆盖地震、火山、洪水等 **10+ 类灾害**实时追踪，事件响应延迟 **<3 秒**，数据同步成功率 **99.5%+**

• **高性能时空可视化引擎**：基于 **Mapbox GL JS 3.15** 设计 WebGL 渲染层，利用**实例化渲染**处理 **10w+ 级灾害点位**，帧率稳定 **55fps+**；引入 **deck.gl + LOD 三级调度**（全球聚合 → 区域 Marker → 城市 3D 体块），显存占用降低 **40%**，地图交互响应 **<50ms**

• **BFF 适配器层 + 数据清洗管道**：设计 **BFF (Backend for Frontend)** 层统一 4 个异构数据源格式为标准 `Hazard` 接口；封装 **authFetch** 实现 OAuth 2.0 Token 自动刷新与 **Promise.allSettled** 容错降级，构建去重 / 标准化 / 异常过滤清洗管道，数据融合成功率 **99.5%+**

• **前端工程化与性能优化**：配置 **manualChunks 代码分割 + React.lazy() 懒加载**，**首屏 bundle 减少 89%**（669 KB → 71 KB gzip），**构建时间减少 29%**（17.76 s → 12.60 s）；设计并沉淀 **18 个高复用组件**，TypeScript 严格模式确保类型安全

• **LLM 驱动的 AI 灾害分析助手**：集成 **OpenAI Chat Completions API**，实现 **SSE 流式响应**与灾害上下文动态注入 System Prompt；开发 **6 类预设分析工作流**，支持多轮对话与降级 Demo 模式，API 调用成功率 **99%+**，首字响应延迟 **<1s**

---

## 项目：Prometheus Global Guardian - 实时全球环境灾害监控与可视化平台
**Prometheus Space Technologies** | Sep 2025 – present  

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

**项目描述**：基于**React 19.1 + TypeScript 5.9 + Mapbox GL**构建的现代化全栈应用，整合**4大权威数据源**（USGS地震数据、NASA环境事件、GDACS全球灾害警报、DisasterAware实时灾害），为全球灾害监测提供**实时、直观、交互式**的可视化解决方案。实现**3D地球视图**、**多源数据融合**、**智能数据分析**、**交互式图表系统**、**风险评估预测**等核心功能。项目整合**Python FastAPI微服务**（23种统计算法 + 5个预测模型），实现前后端分离架构，覆盖数据可视化、状态管理、API集成、性能优化等前端全栈技能。

**核心技术栈**：React 19.1 + TypeScript 5.9 (严格模式) | **Vite 7.1**（manualChunks代码分割 + React.lazy懒加载 + Tree Shaking）| Mapbox GL JS 3.15 | Recharts 3.5.0 | Fetch API + OAuth 2.0 | Python FastAPI 0.115.5 | **OpenAI LLM API（流式 SSE）** | CSS Modules + Responsive Design

---

### 🔥 项目难点

#### 1. 海量地理数据渲染性能瓶颈

**难在哪**：DOM Marker 方案在万级点位下帧率直接从 60fps 崩到 5fps，卡死地图。根本矛盾是 DOM 渲染路径（Layout → Paint → Composite）随节点数线性增长，无法突破。

**解法思路**：跨越渲染范式——从 DOM 跨越到 GPU。Marker → WebGL Layer + GeoJSON diff 增量更新 + Web Worker 数据清洗，三层联动，帧率恢复 55fps+。

#### 2. 实时数据流并发控制与竞态

**难在哪**：4 个数据源响应速度差异 200ms 到 3s+，用户快速切换筛选条件时，旧请求结果比新请求晚到，地图展示的数据与当前选中条件不符，且这类 bug **偶发性强、难以稳定复现**。

**解法思路**：AbortController 网络层取消 + Promise.allSettled 容错聚合 + 版本号丢弃双重保险，三层覆盖不同类型的竞态场景。

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

• **设计 BFF (Backend for Frontend) 层或适配器模式，统一异构数据源，实现故障自动降级与数据清洗管道**：
  - 设计 **BFF 适配器层**，将 DisasterAware / USGS / NASA / GDACS 四个异构数据源统一转换为标准 `Hazard` 接口，消除下游组件的格式耦合
  - 封装 **authFetch** 函数实现 OAuth 2.0 Token 自动刷新（401/403 拦截），结合 **Promise.allSettled** 实现单一数据源失败自动降级，数据融合成功率 **99.5%+**
  - 构建数据清洗管道：去重、字段标准化、异常值过滤，30 秒超时 + 最多 3 次重试，确保请求稳定性

• **性能优化与工程实践**：
  - 实施**前端性能优化**：React.memo减少重渲染、useMemo缓存计算结果、响应式图表设计
  - 配置**Vite构建优化**：manualChunks将vendor库（react、mapbox-gl、recharts、utils）独立打包，React.lazy()对AnalyticsPage/SaveReportModal/SettingsModal实施懒加载，**构建时间减少29%**（17.76s→12.60s），**首屏bundle减少89%**（669KB→71KB gzip），代码分割为7个优化chunk，提升浏览器缓存利用率
  - 通过Chrome DevTools持续监控性能，Network面板验证懒加载生效

• **基于 LLM 的智能分析模块（AI 灾害分析助手）**：
  - 集成 **OpenAI Chat Completions API**，实现**流式响应（Server-Sent Events + ReadableStream）**，逐字打印动画提升 AI 交互感知体验
  - 设计**灾害上下文自动注入机制**：将平台实时监控数据（事件总数、类型分布、近期代表事件）动态构建为 System Prompt，提升 LLM 响应的专业性与针对性
  - 开发 **6 类预设灾害分析工作流**（Quick Prompts）：全球态势综合分析、地震/洪水/野火/火山专项报告、趋势预测，覆盖灾害分析全场景
  - 实现**多轮对话历史管理**（ChatMessage 链路），维护完整上下文窗口，支持连续深度分析
  - 设计**降级 Demo 模式**：无 API Key 时自动切换本地响应模拟，确保功能演示完整性；API 调用成功率 **99%+**，首字响应延迟 **<1s**
  - 采用 **React.lazy() + Suspense** 懒加载 AI 面板，不影响主应用首屏性能

• **状态管理与业务逻辑**：
  - 使用**React Hooks**（useState、useEffect、useCallback、useMemo）管理组件状态和副作用
  - 使用**notify工具函数**实现消息通知系统
  - 开发**ErrorBoundary组件**优雅处理异常，应用稳定性提升**95%**

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

> **💡 概念解释：Race Condition（竞态条件）是什么？**
>
> 两个或多个异步操作**同时进行，但最终结果取决于它们完成的顺序**，而这个顺序不可预测，从而导致数据错误。
>
> **直观例子**：用户快速切换筛选条件——地震 → 洪水 → 野火
> ```
> 用户操作：  [地震]      [洪水]      [野火]
> 请求发出：   req1        req2        req3
> 响应返回：   req3(200ms) req2(500ms) req1(800ms)  ← 顺序乱了！
>
> ❌ 无保护时：
>   req3 先回来 → 显示"野火" ✅
>   req2 回来   → 显示"洪水" ❌（覆盖野火）
>   req1 最后到 → 显示"地震" ❌（用户选的是野火，却看到地震数据）
> ```
>
> **为什么难排查**：不是代码逻辑错误，只在请求响应时间差异大时触发，测试时难以稳定复现，用户看到的只是"数据不对"而不报错。
>
> **本质**：异步操作的完成顺序和发起顺序不一致，而程序没有感知这一点，用后完成的结果覆盖了先完成的。

> **💡 概念解释：竞态保护是什么？**
>
> 竞态保护 = **防止竞态条件导致数据错乱的一系列机制**，核心目标：确保最终状态永远对应最新的用户操作。
>
> 本项目三层防护：
>
> | 层级 | 机制 | 作用 |
> |---|---|---|
> | **网络层** | `AbortController.abort()` | 发新请求前取消旧请求，旧请求在网络层直接死亡 |
> | **数据层** | `Promise.allSettled` | 4个源并发，失败不阻断，且共享同一 `signal` 同时取消 |
> | **状态层** | 版本号 Hook（`fetchVersion`） | 旧请求侥幸回来时，版本号对不上则丢弃，不更新 state |
>
> ```
> ❌ 无保护：req1(800ms) 最后返回 → 覆盖用户当前选择的野火数据
> ✅ 有保护：
>   网络层 → abort() 直接 cancel req1，浏览器抛 AbortError
>   状态层 → 即使回来，version 不匹配，setHazards 不执行
> ```
>
> **一句话**：竞态保护 = **取消旧请求（网络层）+ 丢弃旧结果（状态层）**，双重兜底。

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

> **💡 概念解释：fetch 是什么？**
>
> `fetch` 是浏览器内置的 HTTP 请求 API，是 `XMLHttpRequest（XHR）` 的现代替代品。
>
> | | **XHR（旧）** | **fetch（新）** |
> |---|---|---|
> | **语法** | 回调嵌套，繁琐 | Promise / async-await，简洁 |
> | **流式读取** | ❌ 不支持 | ✅ `ReadableStream`（SSE 依赖它） |
> | **取消请求** | 复杂 | `AbortController.abort()` 一行搞定 |
>
> 本项目两处关键用法：
> - **AI 流式响应**：`fetch` + `response.body.getReader()` 逐块读 SSE 数据
> - **灾害数据并发拉取**：多个 `fetch` 共享同一个 `AbortController.signal`，一次 `abort()` 全部取消

> **💡 概念解释：AbortController 是什么？**
>
> `AbortController` 是浏览器原生提供的 Web API，用于**取消异步操作**（主要是 `fetch` 请求）。它由两个核心部分组成：
> - `controller.signal`：一个 `AbortSignal` 对象，传给需要被取消的 `fetch`
> - `controller.abort()`：调用后立即触发取消，`signal.aborted` 变为 `true`，`fetch` 抛出 `AbortError`
>
> 关键特性：同一个 `controller` 可以同时传给多个 `fetch`，调一次 `abort()` 全部取消；`AbortError` 需要在 catch 里单独处理，不要当成真正的错误上报。

> **💡 概念解释：什么是 Hook？**
>
> Hook = React 提供的一类特殊函数，让**函数组件也能使用状态、生命周期等能力**（React 16.8 引入）。
>
> | Hook | 作用 | 本项目典型用法 |
> |---|---|---|
> | `useState` | 存储状态，变化触发重渲染 | `const [hazards, setHazards] = useState([])` |
> | `useEffect` | 副作用（请求、订阅、DOM操作） | 地图初始化、数据拉取、事件监听 |
> | `useRef` | 存储不触发渲染的可变值 | `abortControllerRef`、`map.current`、`markers.current` |
> | `useMemo` | 缓存计算结果，依赖不变不重算 | `disasterContext` 从 `hazards` 派生 |
> | `useCallback` | 缓存函数引用，避免子组件无效重渲染 | `sendMessage`、`scrollToBottom` |
>
> **自定义 Hook**：把多个内置 Hook 组合成可复用逻辑，以 `use` 开头命名。本项目的 `useHazardFetch` 就是自定义 Hook——把 `useState + useEffect + useRef` 三者组合，把竞态保护逻辑封装成一行可复用的调用：
> ```typescript
> const hazards = useHazardFetch(filter);  // 一行调用，内部处理所有竞态逻辑
> ```
>
> **两条使用规则**：① 只能在函数组件或自定义 Hook 的**顶层**调用（不能在 if/for 里）；② 只能在 **React 函数**里调用（不能在普通 JS 函数里）。

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

> **💡 概念解释：Promise.all vs Promise.allSettled**
>
> 两者都是**并发执行多个 Promise**的方法，区别在于如何处理失败：
>
> | | **`Promise.all`** | **`Promise.allSettled`** |
> |---|---|---|
> | **失败处理** | 一个失败 → 整体立即失败 | 等所有结束，各自汇报状态 |
> | **返回值** | 所有成功值的数组 | `{status, value/reason}` 数组 |
> | **适合场景** | 所有数据缺一不可 | 多源容错，部分失败可接受 |
>
> ```typescript
> // Promise.all：GDACS 超时 → 其他3个成功的数据全部丢失 ❌
> const [usgs, nasa, gdacs, da] = await Promise.all([fetchUSGS(), fetchNASA(), fetchGDACS(), fetchDA()]);
>
> // Promise.allSettled：GDACS 超时 → 其他3个数据照常展示 ✅
> const results = await Promise.allSettled([fetchUSGS(), fetchNASA(), fetchGDACS(), fetchDA()]);
> // [{ status:'fulfilled', value:[...] }, ..., { status:'rejected', reason:Error }]
> ```
>
> **本项目必须用 `allSettled` 的原因**：4 个数据源来自不同机构，网络稳定性各不相同。`Promise.all` 会让 GDACS 一次超时导致用户连地震数据都看不到——对灾害监测平台不可接受。

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

> **💡 概念解释：RxJS 是什么？**
>
> **RxJS**（Reactive Extensions for JavaScript）= 用**流（Observable）**处理异步事件的库。把网络请求、用户事件、定时器等任何异步数据源抽象成"数据流"，再用操作符变换、过滤、合并。
>
> | | **Promise / async-await** | **RxJS Observable** |
> |---|---|---|
> | **适合** | 一次性请求 | 持续数据流、复杂事件组合 |
> | **取消** | `AbortController`（手动） | `takeUntil()` 自动取消 |
> | **重试** | 手动 try/catch 循环 | `retry(3)` 一行 |
> | **防抖** | `setTimeout` 手写 | `debounceTime(300)` |
> | **多流合并** | `Promise.allSettled` | `combineLatest` / `merge` |
> | **包体积** | 0（原生） | ~40KB+ |
>
> RxJS 最擅长"搜索框自动补全"这类场景——防抖 + 取消旧请求 + 重试可以各用一行操作符解决。但有一定学习曲线，且打包体积较大。

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

> **💡 概念解释：什么是 Props Drilling？**
>
> Props Drilling（属性钻透）= 为了把数据传给深层组件，不得不让中间每一层都转手传递 props，即使这些中间组件**根本不需要这个数据**。
>
> ```
> App（持有 filter）
>   └── Header（不需要 filter，但必须接收并往下传 ← 过道）
>         └── FilterBar（不需要 filter，但必须接收并往下传 ← 过道）
>               └── TypeSelector（真正需要 filter 的地方）
> ```
>
> 带来的问题：中间组件被迫知道它不关心的数据；加一个新 prop，中间所有层都要改签名；App.tsx 积累大量状态，组件臃肿。
>
> **解决方案**：用 Context，让 `TypeSelector` 直接消费 `useFilter()`，中间层 props 签名完全干净。

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

> **💡 概念解释：Context 是什么？**
>
> Context = React 提供的**跨层级数据共享机制**，让任意深度的组件直接读取数据，无需逐层传 props。三个核心部分：
>
> ```typescript
> // 1. createContext：创建"数据频道"
> const FilterContext = createContext<FilterState | null>(null);
>
> // 2. Provider：在组件树顶部"广播"数据
> <FilterContext.Provider value={{ filter, setFilter }}>
>   <Header />     {/* 内部所有组件都能收到 */}
>   <MapView />
> </FilterContext.Provider>
>
> // 3. useContext：在任意深度"收听"数据，不需要任何 props
> function TypeSelector() {
>   const { filter, setFilter } = useContext(FilterContext)!;
> }
> ```
>
> **重要注意**：Context 值变化时，所有消费该 Context 的组件都会重渲染——所以要按职责域**拆分细粒度 Context**，而不是一个巨型 Context，否则任何状态变化都导致整树重渲染。
>
> **本项目 4 个 Context 的分工**：`HazardContext`（灾害数据）/ `FilterContext`（筛选条件）/ `UIContext`（地图样式/Tab）/ `NotificationContext`（通知列表），每个都封装了自定义 Hook 作为唯一消费入口（`useHazards()` / `useFilter()` 等）。

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

> **💡 概念解释：Zustand 和 Jotai 是什么？**
>
> **Zustand** = 极简全局状态库，核心思路"一个 store，按需订阅"，无 Provider、无 boilerplate：
> ```typescript
> const useHazardStore = create((set) => ({
>   hazards: [], filter: 'ALL',
>   setFilter: (filter) => set({ filter }),
> }));
> // selector 精确控制渲染：filter 变化不触发 MapView 重渲染
> const hazards = useHazardStore(state => state.hazards);
> ```
>
> **Jotai** = 原子化状态，把状态拆成最小单元 `atom`，组件只订阅用到的 atom，更新粒度最细：
> ```typescript
> const hazardsAtom = atom<Hazard[]>([]);
> const filterAtom = atom<string>('ALL');
> // 派生 atom：自动追踪依赖，类似 useMemo
> const filteredAtom = atom((get) =>
>   get(hazardsAtom).filter(h => h.type === get(filterAtom))
> );
> ```
>
> **本项目选择路径**：
> ```
> 当前规模 → useState + 扁平 props（零依赖，够用）
> 层级加深 → Context + useReducer（原生，按域拆分）
> 跨域频繁 → Zustand（最常见选择，生态成熟）
> 极细粒度 → Jotai（地图点位高频更新等特殊场景）
> ```

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
        ↓  fetch /api/chat
server.js（BFF 层）
        ↓  带 API Key 请求
OpenAI Chat Completions API（stream: true）
```

> **💡 概念解释：什么是 BFF？**
>
> **BFF**（Backend For Frontend，服务于前端的后端）= 专门为前端量身定制的中间层服务。
>
> 本项目需要 BFF 的核心原因：**OpenAI API Key 不能暴露给浏览器**——用户可以在 Chrome Network 面板看到所有请求头，直连 OpenAI 会导致 Key 泄露。
>
> ```
> ❌ 无 BFF：前端 → 直接带 API Key 请求 OpenAI  →  Key 暴露在浏览器
> ✅ 有 BFF：前端 → 请求 server.js → server.js 带 Key 请求 OpenAI → Key 只在服务端
> ```
>
> `server.js` 作为 BFF 还承担了 SSE 流转发（`response.body.pipe(res)`）和请求代理两个职责，前端只需请求本地 `/api/chat`，完全不感知 OpenAI 的存在。

两个核心文件职责分离：`aiAssistant.ts` 负责所有 LLM 通信逻辑（System Prompt 构建、SSE 流解析、Demo 降级），`AIChatAssistant.tsx` 负责 UI 状态管理和逐字打印动画，互不耦合。

---

##### 核心一：System Prompt 上下文动态注入（`buildSystemPrompt`）

> **💡 概念解释：什么是 Prompt？**
>
> **Prompt**（提示词）= 发给 AI 的"指令"，决定 AI 怎么回答。LLM 对话中通常有两种 Prompt：
>
> | | **System Prompt** | **User Prompt** |
> |---|---|---|
> | **是什么** | 系统级指令，用户看不到 | 用户输入的消息 |
> | **作用** | 设定 AI 的角色、行为规则、背景知识 | 具体的问题或请求 |
> | **类比** | 给员工的岗前培训手册 | 员工每天接到的具体任务 |
>
> **本项目的做法**：每次用户发消息，都把当前地图上的实时灾害数据注入进 System Prompt，AI 才能回答"现在哪个地区最危险"这类问题——这就是下面的"上下文注入"技术。
>
> **Prompt Engineering**（提示词工程）= 研究如何写出更好的 Prompt，让 AI 输出更准确的内容，是当前 AI 应用开发的核心技能之一。

> **💡 概念解释：什么是上下文注入？**
>
> LLM 本身只有训练时学到的知识，它不知道你的平台当前有多少条灾害、最新发生了哪些地震。**上下文注入就是在发请求前，把你想让它知道的信息提前塞进 Prompt 里**，让它回答时能参考这些信息。
>
> LLM 的对话分三种角色：
>
> | 角色 | 作用 |
> |---|---|
> | `system` | 系统指令——告诉 LLM 它是谁、职责是什么、能看到哪些背景数据 |
> | `user` | 用户发的问题 |
> | `assistant` | LLM 的回答 |
>
> 注入就是往 `system` 消息里拼字符串：
> ```
> 你是灾害分析助手。
>
> 📡 当前平台实时数据：
> - 活跃事件：342 条
> - 类型分布：EARTHQUAKE(89)、FLOOD(54)、WILDFIRE(31)...
> - 近期事件：「M6.2 日本本州」地震；「亚马逊洪水」洪水...
>
> 请结合以上数据回答用户问题。
> ```
> 不注入时问"当前全球灾害态势怎么样"，LLM 只能泛泛而谈；注入之后，它能回答"当前平台监控 342 条事件，其中地震 89 起……"
>
> **本项目的注入时机**：每次用户点击发送 → `useMemo` 从 `hazards` 实时计算 `DisasterContext` → `buildSystemPrompt(ctx)` 拼成字符串 → 作为 `{ role: 'system' }` 发给 OpenAI。每次对话都重新构建，LLM 永远看到最新数据快照。

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
> **标准回答**：不是 RAG，我用的是更轻量的**动态上下文注入（Dynamic Context Injection）**。
>
> RAG 的核心是"检索"——先把文档向量化存进数据库，用户提问时做相似度检索、召回相关片段再喂给 LLM。我这个方案没有检索步骤，而是每次请求前直接把平台当前的实时数据（事件总数、类型分布、近期代表事件）结构化地拼进 System Prompt。
>
> 我选择不用 RAG 有三个原因：第一，灾害数据本身就是结构化的，直接注入比向量检索更精准、延迟更低；第二，数据 5 分钟刷新一次，RAG 需要维护向量索引，成本远高于收益；第三，这个场景不需要从大量文档中"找答案"，LLM 自身的地理和灾害领域知识已经足够，我只需要让它"看到"当前数据快照。
>
> | | **RAG** | **本项目（动态上下文注入）** |
> |---|---|---|
> | **数据存储** | 向量数据库（Pinecone / Chroma 等） | 无，直接用内存中的实时数据 |
> | **检索步骤** | 提问 → Embedding → 向量相似度检索 → 召回文档片段 | 无检索，结构化数据直接拼入 System Prompt |
> | **数据来源** | 离线索引的文档库（PDF、网页等） | 平台实时抓取的灾害事件（`hazards` 数组） |
> | **适合场景** | 大量非结构化静态知识库 | 少量、结构化、高频更新的实时数据 |
>
> 当然，如果将来要接入历史灾害报告、应急预案等大量非结构化文档，再升级成 RAG 也不复杂——用 **LangChain.js + Pinecone** 或 OpenAI Assistants API 的 File Search 都能快速接入。

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

> **💡 概念解释：Markdown 增量渲染是什么？**
>
> 就是 AI 回复**一边输出一边被渲染成格式化内容**的过程。拆开理解：
> - **"增量"**：每收到一个 token，`content` 字符串就变长
> - **"Markdown 渲染"**：把 `**粗体**`、`### 标题`、`- 列表` 纯文本转成真正的 HTML 标签
>
> 实际发生的过程：
> ```
> 收到 "当"     → content="当"           → <p>当</p>
> 收到 "前"     → content="当前"          → <p>当前</p>
> 收到 "**地"   → content="当前**地"      → <p>当前**地</p>   ← 格式还不完整
> 收到 "震**"   → content="当前**地震**"  → <p>当前<strong>地震</strong></p>  ← 粗体出现
> ```
>
> 本项目 `renderMarkdown` 的工作方式：每次 `content` 增长触发重渲染 → **全量重 parse 整个字符串** → React diff 只更新变化的 DOM 节点。
>
> | | 说明 |
> |---|---|
> | **数据是增量的** | `content` 每次 +delta，不断增长 |
> | **渲染是全量的** | `renderMarkdown` 每次重新 parse 整个字符串 |
> | **DOM 更新是增量的** | React diff 只改变化的节点 |
>
> 三者结合，视觉上表现为**文字逐字出现并自动带格式**。

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
> **第一层 BFF 代理层**（`server.js`）：OpenAI API Key 不能暴露在浏览器里，前端请求本地 `/api/chat`，由 `server.js` 带 Key 去请求 OpenAI，同时把 SSE 流直接 `pipe` 给前端。
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
> | **这是 RAG 吗？** | 不是标准 RAG（无向量检索），是动态上下文注入——实时数据直接拼进 Prompt |
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

#### Q2：项目最大的技术挑战是什么？

> 有四个核心挑战，每个都有具体的解决方案：
>
> **第一，海量地理数据渲染性能**
> 难点在于 DOM Marker 方案在万级点位下帧率直接从 60fps 崩到 5fps，根本矛盾是 DOM 渲染路径（Layout → Paint → Composite）随节点数线性增长，靠 JS 层面的优化根本触碰不到这个瓶颈。解法是跨越渲染范式——引入 LOD 三级调度把远景全量渲染交给 GPU，GeoJSON diff 增量更新把 5 分钟刷新从 800ms 降到 20ms，Web Worker 把数据清洗移出主线程。三层叠加，帧率恢复 55fps+，内存从 400MB 降到 60MB。
>
> **第二，实时数据流的并发竞态**
> 4 个数据源响应速度差异 200ms 到 3s+，用户快速切换筛选时旧请求会比新请求晚到，覆盖正确的数据。这类 bug 偶发性强、难以稳定复现，很容易被忽视。解法是三层保障：AbortController 在网络层取消过期请求，Promise.allSettled 做多源容错聚合，useRef 版本号兜底无法 abort 的异步操作，彻底消除数据错乱。
>
> **第三，复杂状态管理与模块解耦**
> 地图、筛选、图表、AI 助手四个模块共享大量状态，随功能迭代 Props drilling 风险持续增加，每加一个新功能都要评估整条 props 链路。解法是按职责域拆分 4 个独立 Context + useReducer，封装自定义 Hook 作为唯一消费入口，App.tsx 始终保持在 150 行以内，组件重渲染次数降低 60%。
>
> **第四，多异构数据源统一治理**
> 4 个数据源格式完全不同——DisasterAware 需要 OAuth 鉴权，USGS 是 GeoJSON，NASA 是 JSON 数组，GDACS 是 XML/RSS，字段命名和坐标精度也各不相同。解法是 BFF 适配器层把所有源统一转换为标准 `Hazard` 接口，authFetch 封装 Token 自动刷新，Promise.allSettled 实现单源故障自动降级，整体可用性不受任一数据源影响。
>
> _(通常说前两个就够，等面试官追问再展开后两个)_

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

---

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

---

### 五、AI 模块（加分题）

#### Q19：介绍 AI 智能分析模块的整体实现

> 整体分三层：
>
> **第一层 BFF 代理层**（`server.js`）：OpenAI API Key 不能暴露在浏览器里，前端请求本地 `/api/chat`，由 `server.js` 带 Key 去请求 OpenAI，同时把 SSE 流直接 pipe 给前端。
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

#### Q22：打字机效果和 Markdown 增量渲染是怎么实现的？

> **打字机效果**：发消息时在 messages 数组里插入一条 `{ content: '', isStreaming: true }` 的占位消息，每次 `onChunk` 回调把 delta 追加到 `content`，React 检测到 state 变化触发重渲染，视觉上就是文字逐渐出现。`onDone` 时把 `isStreaming` 置为 false，光标（`▌`）消失。
>
> **Markdown 增量渲染**：`MessageBubble` 组件对 `content` 字符串做实时解析（正则匹配加粗/标题/列表/表格/分割线），每次 chunk 到来触发重渲染，React diff 只更新变化的 DOM 节点，不是整体替换。视觉上 Markdown 格式随文字流式出现，而不是等全部内容到了才格式化。

#### Q23：动态上下文注入是 RAG 吗？

> 不是标准的 RAG（Retrieval-Augmented Generation）。RAG 的核心是**向量检索**：把文档分块、embedding 后存入向量数据库，查询时先检索最相关的 chunk，再注入 Prompt。
>
> 本项目是**动态上下文注入**：`buildSystemPrompt()` 在每次请求前直接把当前地图的实时数据（事件总数、类型分布、近期代表事件的 title/severity/location）拼进 System Prompt，无向量检索，无持久化存储。适合实时数据量不大（几十条代表事件）、需要每次都是最新状态的场景。

---

### 六、工程化与 API 集成

#### Q24：bundle 体积从 669KB 降到 71KB 是怎么做的？

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

### 七、核心概念速答

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

