# 地图模块拆分实施计划

> **面向智能体执行者：** 必须使用 `subagent-driven-development` 按任务逐项实现；任务使用复选框跟踪。

**目标：** 将地图的初始化、数据、渲染能力拆分到 `src/features/map/`，保持现有 `MapViewProps`、地图行为与数据策略不变。

**架构：** 先用无副作用的工具函数统一地图 Layer ID、LOD 可见性判定和 Hazard 到 GeoJSON 的转换；随后将 Mapbox 生命周期、数据加载、Marker、LOD、热力图与 3D 图层迁移为独立 hook。最终 `MapView` 只负责编排 hook 和渲染容器/热力图切换控件。

**技术栈：** React 19、TypeScript 5.9、Vite 7、Mapbox GL JS、deck.gl、Vitest、React Testing Library。

## 全局约束

- `MapViewProps` 的字段和 `App.tsx` 调用语义必须保持兼容。
- 本次不修改 Popup `setHTML()`、灾害 API 入口、自动刷新或请求竞态行为。
- 新增 TypeScript 代码使用 `import type`、`unknown` 和明确的返回类型；不得新增 `any`。
- 图层 ID、source ID 与 LOD 阈值必须维持现有值：cluster 最大 zoom 为 8，建筑最小 zoom 为 14。
- Marker 的创建、重建和卸载必须使用同一个 `clearMarkers()` 清理路径。
- 只在用户明确要求时提交；本计划执行期间不自动运行 `git add` 或 `git commit`。
- 每项实现先写失败测试，再写最小实现；完成后执行项目既有 lint、format、测试、类型检查和构建命令。

---

## 文件结构

| 文件                                           | 职责                                       |
| ---------------------------------------------- | ------------------------------------------ |
| `src/features/map/utils/mapLayerIds.ts`        | 图层/source ID 与 LOD 阈值常量             |
| `src/features/map/utils/mapLod.ts`             | zoom、热力图状态到可见性的纯计算           |
| `src/features/map/utils/hazardGeojson.ts`      | `Hazard[]` 到 LOD/Heatmap GeoJSON 的纯转换 |
| `src/features/map/hooks/useMapboxInstance.ts`  | Mapbox 创建、样式切换、销毁                |
| `src/features/map/hooks/useHazardData.ts`      | Worker 清洗与既有数据加载策略              |
| `src/features/map/hooks/useHazardMarkers.ts`   | DOM Marker 生命周期                        |
| `src/features/map/hooks/useHazardLodLayers.ts` | LOD source、图层、zoom 监听和可见性同步    |
| `src/features/map/hooks/useHazardHeatmap.ts`   | Heatmap source、图层、模式切换             |
| `src/features/map/hooks/useDeck3DTiles.ts`     | deck.gl 3D Tiles 与建筑回退图层            |
| `src/features/map/MapView.tsx`                 | 所有地图能力的组合组件                     |
| `tests/service-map-utils.test.ts`              | 不依赖 DOM/Mapbox 的工具函数单测           |
| `tests/component/map-view.test.tsx`            | Mapbox mock 下的地图组件回归测试           |

## 任务 1：建立地图纯工具函数与单元测试

**文件：**

- 新建：`src/features/map/utils/mapLayerIds.ts`
- 新建：`src/features/map/utils/mapLod.ts`
- 新建：`src/features/map/utils/hazardGeojson.ts`
- 新建：`tests/service-map-utils.test.ts`

**接口：**

```ts
export const MAP_SOURCE_IDS = {
  lod: "hazards-lod",
  heatmap: "hazards-heat",
} as const;

export const MAP_LAYER_IDS = {
  clusters: "lod-clusters",
  clusterCount: "lod-cluster-count",
  unclustered: "lod-unclustered",
  heatmap: "hazards-heatmap",
  buildings: "3d-buildings",
  externalBuildings: "city-3d-model",
} as const;

export const MAP_LOD_THRESHOLDS = {
  clusterMaxZoom: 8,
  buildingsMinZoom: 14,
} as const;

export interface MapLodVisibility {
  readonly showClusters: boolean;
  readonly showMarkers: boolean;
  readonly showBuildings: boolean;
}

export function getMapLodVisibility(zoom: number, showHeatmap: boolean): MapLodVisibility;
export function createLodFeatureCollection(hazards: readonly Hazard[]): FeatureCollection<Point>;
export function createHeatmapFeatureCollection(
  hazards: readonly Hazard[],
): FeatureCollection<Point>;
```

- [x] **步骤 1：编写失败的工具函数测试**

```ts
it("uses clusters below zoom 8 and markers at zoom 8", () => {
  expect(getMapLodVisibility(7.9, false)).toEqual({
    showClusters: true,
    showMarkers: false,
    showBuildings: false,
  });
  expect(getMapLodVisibility(8, false)).toEqual({
    showClusters: false,
    showMarkers: true,
    showBuildings: false,
  });
});

it("filters invalid coordinates and retains mapped LOD properties", () => {
  const data = createLodFeatureCollection([
    validHazard,
    { ...validHazard, id: "missing", geometry: { type: "Point", coordinates: [] } },
  ]);
  expect(data.features).toHaveLength(1);
  expect(data.features[0]?.properties).toMatchObject({ id: "hazard-1", color: "#4A90E2" });
});
```

- [x] **步骤 2：运行测试，确认模块尚不存在而失败**

运行：`pnpm run test:services -- tests/service-map-utils.test.ts`

预期：因找不到 `src/features/map/utils/*` 导入而失败。

- [x] **步骤 3：实现最小纯函数**

```ts
export function getMapLodVisibility(zoom: number, showHeatmap: boolean): MapLodVisibility {
  if (showHeatmap) return { showClusters: false, showMarkers: false, showBuildings: false };
  return {
    showClusters: zoom < MAP_LOD_THRESHOLDS.clusterMaxZoom,
    showMarkers: zoom >= MAP_LOD_THRESHOLDS.clusterMaxZoom,
    showBuildings: zoom >= MAP_LOD_THRESHOLDS.buildingsMinZoom,
  };
}
```

GeoJSON 转换只接受长度为 2 且两个坐标均为有限数值的 Point；LOD properties 为 `id`、`title`、`type`、`severity`、`color`，热力图 properties 为 `magnitude` 与 `type`，其中无有效 `magnitude` 时为 `3`。

- [x] **步骤 4：运行工具函数测试**

运行：`pnpm run test:services -- tests/service-map-utils.test.ts`

预期：测试全部通过。

## 任务 2：迁移地图实例、数据加载和 Marker 生命周期

**文件：**

- 新建：`src/features/map/hooks/useMapboxInstance.ts`
- 新建：`src/features/map/hooks/useHazardData.ts`
- 新建：`src/features/map/hooks/useHazardMarkers.ts`
- 新建：`tests/component/map-view.test.tsx`

**接口：**

```ts
export interface MapboxInstanceResult {
  readonly mapRef: RefObject<mapboxgl.Map | null>;
  readonly containerRef: RefObject<HTMLDivElement | null>;
  readonly mapRevision: number;
}

export function useMapboxInstance(mapStyle: string): MapboxInstanceResult;

export interface HazardDataResult {
  readonly disasters: readonly Hazard[];
  readonly refresh: () => Promise<void>;
}

export function useHazardData(
  filter: string,
  onDataUpdate: (hazards: Hazard[]) => void,
): HazardDataResult;

export function useHazardMarkers(
  mapRef: RefObject<mapboxgl.Map | null>,
  hazards: readonly Hazard[],
  filter: string,
  hidden: boolean,
  mapRevision: number,
): { readonly setVisible: (visible: boolean) => void };
```

- [ ] **步骤 1：建立 Mapbox 与 Worker mock，并写失败组件测试**

在测试中 mock `mapbox-gl` 的 `Map`、`Marker`、`Popup`，并记录 `addSource`、`addLayer`、`setStyle`、`remove` 和 Marker `remove` 调用。mock `Worker` 后渲染地图，验证筛选由 `ALL` 改为 `FLOOD` 时旧 Marker 全部清理后只创建 FLOOD Marker。

```ts
expect(markerMocks.remove).toHaveBeenCalledTimes(2);
expect(markerMocks.setLngLat).toHaveBeenLastCalledWith([120, 30]);
```

- [ ] **步骤 2：运行组件测试，确认新入口尚不存在而失败**

运行：`pnpm run test:component -- tests/component/map-view.test.tsx`

预期：因 `src/features/map/MapView.tsx` 尚不存在而失败。

- [ ] **步骤 3：实现三个 hook**

`useMapboxInstance` 使用 `useRef` 保存 Mapbox instance，首次 mount 初始化 `Map`，卸载时只调用一次 `remove()`；首次 `load` 和每次样式 `style.load` 完成后递增 `mapRevision`，mapStyle 改变时调用 `setStyle()`。

`useHazardData` 原样迁移 `cleanWithWorker()`、DisasterAware 映射、`Promise.allSettled()` 回退、`onDataUpdate()` 调用和 Worker `terminate()`，不得改变请求顺序或回退条件。

`useHazardMarkers` 内部定义唯一的 `clearMarkers()`：先对数组中每个 Marker 调用 `remove()`，再重置数组。每次 hazards/filter/hidden/mapRevision 所属的重建调用都只能通过它清理。

- [ ] **步骤 4：运行组件测试**

运行：`pnpm run test:component -- tests/component/map-view.test.tsx`

预期：筛选与 Marker 清理断言全部通过。

## 任务 3：迁移 LOD、热力图和 3D 图层能力

**文件：**

- 新建：`src/features/map/hooks/useHazardLodLayers.ts`
- 新建：`src/features/map/hooks/useHazardHeatmap.ts`
- 新建：`src/features/map/hooks/useDeck3DTiles.ts`
- 修改：`tests/component/map-view.test.tsx`

**接口：**

```ts
export interface HazardLodLayersResult {
  readonly applyLod: (zoom: number, showHeatmap: boolean) => void;
}

export function useHazardLodLayers(
  mapRef: RefObject<mapboxgl.Map | null>,
  hazards: readonly Hazard[],
  mapRevision: number,
  setMarkerVisibility: (visible: boolean) => void,
): HazardLodLayersResult;

export function useHazardHeatmap(
  mapRef: RefObject<mapboxgl.Map | null>,
  hazards: readonly Hazard[],
  mapRevision: number,
  onModeChange: (showHeatmap: boolean) => void,
): { readonly showHeatmap: boolean; readonly toggleHeatmap: () => void };

export function useDeck3DTiles(mapRef: RefObject<mapboxgl.Map | null>, mapRevision: number): void;
```

- [ ] **步骤 1：扩展失败组件测试**

```ts
await user.click(screen.getByRole("button", { name: "Show Heatmap" }));
expect(mapMocks.setLayoutProperty).toHaveBeenCalledWith("hazards-heatmap", "visibility", "visible");
expect(markerMocks.getElement).toHaveBeenCalled();

rerender(<MapView {...props} mapStyle="streets-v12" />);
mapMocks.emit("styledata");
expect(mapMocks.addSource).toHaveBeenCalledWith("hazards-lod", expect.any(Object));
expect(mapMocks.addSource).toHaveBeenCalledWith("hazards-heat", expect.any(Object));
```

- [ ] **步骤 2：运行组件测试，确认热力图和样式恢复断言失败**

运行：`pnpm run test:component -- tests/component/map-view.test.tsx`

预期：热力图 source/layer、样式恢复调用尚未满足测试。

- [ ] **步骤 3：实现三个图层 hook**

`useHazardLodLayers` 使用 `createLodFeatureCollection()` 更新 source，初始化 cluster、cluster-count、unclustered 图层；zoom 监听只注册一次并在 cleanup 中移除；使用 `getMapLodVisibility()` 设置 LOD layer、建筑和 Marker 可见性。

`useHazardHeatmap` 使用 `createHeatmapFeatureCollection()` 更新 source；切换时显示/隐藏 `hazards-heatmap`，并通知 LOD hook/Marker 统一恢复可见性。

`useDeck3DTiles` 原样迁移外部 Tile3DLayer 与 fill-extrusion 回退逻辑。外部 overlay 仅在 `config.tiles3d.enabled` 时创建，并在 cleanup 移除 control；不设置时只创建现有 `3d-buildings` fallback layer。

- [ ] **步骤 4：运行组件测试**

运行：`pnpm run test:component -- tests/component/map-view.test.tsx`

预期：热力图切换、样式切换后的 source/layer 重建、Marker 显隐断言全部通过。

## 任务 4：组合新 MapView、替换入口并完成文档与回归

**文件：**

- 新建：`src/features/map/MapView.tsx`
- 删除：`src/components/MapView.tsx`
- 修改：`src/App.tsx`
- 修改：`docs/PROJECT_OPTIMIZATION_BACKLOG.md`
- 修改：`docs/TESTING_BASELINE.md`
- 修改：`tests/component/map-view.test.tsx`

**接口：**

```ts
const MapView: React.FC<MapViewProps> = ({ filter, mapStyle, onDataUpdate, onRefreshReady }) => {
  // 组合 map、数据、Marker、LOD、Heatmap 与 3D hooks。
};

export default MapView;
```

- [ ] **步骤 1：编写失败的入口兼容测试**

在 `tests/component/map-view.test.tsx` 验证 `onRefreshReady` 得到可调用的刷新函数，调用后仍会向 `onDataUpdate` 发送清洗后的数据。

```ts
expect(onRefreshReady).toHaveBeenCalledWith(expect.any(Function));
await refreshFromParent?.();
expect(onDataUpdate).toHaveBeenCalledWith([expectedHazard]);
```

- [ ] **步骤 2：运行组件测试，确认编排入口在迁移前失败**

运行：`pnpm run test:component -- tests/component/map-view.test.tsx`

预期：新入口或刷新回调断言未满足。

- [ ] **步骤 3：实现组合组件并更新引用**

将 `App.tsx` 的导入改为：

```ts
import MapView from "./features/map/MapView";
```

新 `MapView.tsx` 只包含容器、hook 组合和热力图按钮；删除旧组件。迁移后运行 `wc -l src/features/map/MapView.tsx`，其输出必须不大于 220。

在优化清单中把“地图模块拆分”标为已完成，记录新增目录、测试证据和仍保留的 Popup/API/刷新后续项；在测试基线中更新 Service 与组件测试数量、Mapbox mock 覆盖范围。

- [ ] **步骤 4：执行针对性测试与完整质量基线**

运行：

```bash
pnpm run test:services -- tests/service-map-utils.test.ts
pnpm run test:component -- tests/component/map-view.test.tsx
pnpm run test:baseline
git diff --check
```

预期：所有命令以退出码 0 完成；记录 Node 版本或 Mapbox 包体积等既有非阻塞 warning，但不得把 warning 当作测试失败。

## 实施后复核清单

- [ ] `src/components/MapView.tsx` 已删除，`App.tsx` 仅从 `src/features/map/MapView.tsx` 导入地图组件。
- [ ] 新组合组件不超过 220 行，且不直接构建 GeoJSON、不声明 Layer ID、不维护 Marker 数组。
- [ ] `createLodFeatureCollection()` 和 `createHeatmapFeatureCollection()` 的输入/输出仅依赖 `Hazard` 与纯 JSON 数据。
- [ ] 地图样式切换顺序为：初始化图层、写入数据、重建 Marker、应用 LOD。
- [ ] Marker、Worker、deck overlay、Mapbox map 均有确定且唯一的 cleanup 路径。
- [ ] Popup 内容和灾害请求语义未改变，安全与 API 治理事项仍保留为未完成待办。
