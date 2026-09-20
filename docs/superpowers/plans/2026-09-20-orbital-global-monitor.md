# Orbital 全球监控地图视觉升级实施计划

> **执行状态：** 实施、自动化验证与最终工作区复核均已完成。

**Goal:** 按 `docs/superpowers/specs/2026-09-20-orbital-global-monitor-design.md` 将地图首页升级为 Orbital 深空态势视觉，默认 2D Mercator 平面地图，并提供可访问、可回退的 3D Globe Terrain 模式。

**Architecture:** 地图显示模式由 `MapStateContext` 持有，Header 只负责可访问的 2D/3D 操作。Mapbox 视图 Hook 根据模式和 `mapRevision` 管理投影、pitch、DEM Terrain 与建筑层；Globe 模式使用 Mapbox 原生建筑挤出层，不挂载不兼容的 deck.gl 3D Tiles overlay。现有灾害数据、筛选、热力图、Popup 和聚合保持不变。首页覆盖层与灾害点样式按统一深空视觉调整。

**Tech Stack:** React 19、TypeScript 5.9、Mapbox GL JS 3.15、deck.gl、Vitest、React Testing Library、Playwright。

## Global Constraints

- 保留当前工作区中 `docs/PROJECT_OPTIMIZATION_BACKLOG.md`、`docs/OPEN_SOURCE_DISASTER_VISUALIZATION_RESEARCH.md` 和设计规格的既有改动；不清理、不回滚、不提交。
- 不新增生产依赖，不替换 Mapbox，不改变 API、灾害数据、筛选或 Analytics 行为。
- 初始模式固定为 `2d`，刷新后回到 `2d`；`2d` 使用 Mercator 投影且不启用 Terrain、建筑挤出或外部 3D Tiles。
- `3d` 使用 Globe、约 42° pitch、Mapbox Raster DEM 和 1.8 exaggeration，切换按钮可见标签为“3D 地形”；尊重 `prefers-reduced-motion`。
- DEM / 外部 3D Tiles 不可用不得阻塞灾害地图；Globe 模式下配置外部 Tiles 时按高缩放 LOD 使用原生建筑回退，并一次性非阻塞提示；样式重载和卸载不得遗留 source、layer 或 listener。
- 每项行为先新增或调整失败测试并确认 RED，再实现最小变更；最终按项目脚本运行相关验证和 `git diff --check`。

---

### Task 1: 2D/3D 地图模式状态与可访问切换

**Files:**

- Modify: `src/features/map/state/MapStateContext.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `tests/component/map-state-context.test.tsx`
- Modify: `tests/component/map-view.test.tsx`

**Interfaces:**

```ts
export type MapViewMode = "2d" | "3d";

// MapStateValue additions
viewMode: MapViewMode;
setViewMode(mode: MapViewMode): void;
```

- [x] 写测试：初始 `viewMode` 为 `2d`，设置为 `3d` 后 context 消费者读到新模式；不改变 filter、heatmap 或 hazard 状态。
- [x] 写组件测试：地图视图显示名称为“2D 视图”和“3D 地形”的原生按钮；当前模式使用 `aria-pressed="true"`，点击另一按钮后状态同步切换。
- [x] 运行相关 Vitest 测试并确认新断言先因模式状态/控件不存在而失败。
- [x] 在 Provider 增加默认 2D 模式和 setter，在 Header 地图视图操作区加入按钮组；保留现有操作与状态。
- [x] 重跑相关 Vitest 测试，确认新测试通过且既有测试不回归。

### Task 2: Mapbox Terrain、相机、建筑与失败回退

**Files:**

- Create: `src/features/map/hooks/useMapTerrain.ts`
- Create: `tests/component/map-terrain.test.tsx`
- Create: `tests/component/map-deck-tiles.test.tsx`
- Modify: `src/features/map/hooks/useMapboxInstance.ts`
- Modify: `src/features/map/hooks/useDeck3DTiles.ts`
- Modify: `src/features/map/hooks/useHazardLodLayers.ts`
- Modify: `src/features/map/MapView.tsx`
- Modify: `tests/component/map-view.test.tsx`

**Interfaces:**

```ts
export const MAP_TERRAIN_SOURCE_ID = "orbital-terrain-dem";
```

- [x] 写地图 Hook 测试：3D 加载 Raster DEM 并设定 pitch，回到 2D 后关闭 Terrain、移除 source；减少动态效果时使用瞬时相机切换。
- [x] 写生命周期/错误测试：DEM 错误关闭 Terrain、保留 3D pitch 并只发出一次非阻塞 warning；地图卸载时移除错误监听器。
- [x] 写图层测试：仅 3D 创建建筑；按现有 zoom LOD 控制建筑；2D 不创建 3D 图层。后续增量中补充 Globe 与 deck.gl 非 Mercator 集成限制的回归测试。
- [x] 运行相关测试并确认新增模式/地形与建筑显隐断言先失败。
- [x] 实现 Terrain Hook 与 `MapView` 接线；3D 模式添加 `mapbox://mapbox.mapbox-terrain-dem-v1` raster-dem source（tileSize 512、maxzoom 14），设置 exaggeration 1.2；离开 3D 或地图销毁时安全清理。
- [x] 更新 3D 建筑图层响应 view mode；Globe 始终使用原生 extrusion layer，不创建第二个 canvas。
- [x] 重跑相关 Vitest 测试和客户端类型检查，确认回归通过。

### Task 3: Orbital 覆盖层、地图标注与灾害点视觉

**Files:**

- Modify: `src/components/Header.tsx`
- Modify: `src/components/StatusPanel.tsx`
- Modify: `src/components/LegendPanel.tsx`
- Modify: `src/index.css`
- Modify: `src/features/map/hooks/useMapboxInstance.ts`
- Modify: `src/features/map/hooks/useHazardLodLayers.ts`
- Modify: `tests/component/map-view.test.tsx`
- Modify: `tests/e2e/app-smoke.spec.ts`

- [x] 写组件测试：状态面板和图例具有原生可折叠语义，并保留筛选、刷新和图例内容。
- [x] 写 E2E 断言：精简首页标题、默认 2D、2D/3D 切换、过滤保持，以及桌面和窄屏浮层不互相覆盖且位于视口内。
- [x] 运行新组件断言并先确认因缺少折叠语义/Orbital 标题而失败。
- [x] 调整 Header 品牌层级与操作组、玻璃态状态面板/图例、窄屏布局和原生折叠交互；未修改 Analytics 页面样式语义。
- [x] 调整 Globe fog、国家/地点标签权重、cluster 与单点描边/光晕；沿用 `HAZARD_COLORS`，不增加常驻动画或新渲染层。
- [x] 重跑组件测试与 Playwright E2E；检查桌面与窄屏布局。

### Task 4: 清单同步、规格核对与最终验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- Modify: `docs/TESTING_BASELINE.md`（仅当测试命令或统计数字说明实际变化时）

- [x] 对照设计规格验收项，确认默认模式、切换/保留状态、DEM 与 Tiles 回退、响应式浮层、marker/label 层级及生命周期。
- [x] 在待优化清单中将已实现的 Orbital 地图视觉与可切换轻量 3D 能力移入“已完成能力”；保留仍未完成事项和 AI 用户注册/长期记忆优先项。
- [x] 运行 `pnpm run test:baseline`、`pnpm run test:python` 及地图组件定向回归；检查包括 lint、格式、三项类型检查、Service/BFF、组件、E2E、构建。
- [x] 检查最终 diff 与 `git status --short`；保留原有未提交文件且不提交。

### 2026-09-20 增量调整：强化 2D/3D 视觉差异

- [x] 将 3D pitch 从 24° 提高到 42°，地形夸张从 1.2 提高到 1.8；2D 仍回到 pitch 0 并关闭 DEM。
- [x] 将切换按钮可见/可访问名称改为“3D 地形”，不改变默认模式与高缩放建筑 LOD。
- [x] 先更新地形 Hook 与 Header 的测试并确认旧实现失败，再完成参数与标签更新。

### 2026-09-20 增量调整：明确区分地图投影并兼容 Globe 建筑

- [x] 将初始地图投影设为 Mercator 平面；2D/3D 切换时分别运行时切换 Mercator 与 Globe。
- [x] 新增回归测试并确认旧实现仍会在 Globe 模式挂载 deck.gl overlay，验证先 RED。
- [x] Globe 模式统一使用 Mapbox 原生建筑拉伸层；外部 3D Tiles 已配置时，在建筑 LOD 级别提示一次兼容性回退，灾害图层保持可用。
- [x] 运行地图相关组件测试、全项目质量基线、Python 测试和 diff 检查；组件 105/105、E2E 1/1、Python 56/56 通过。
