# 地图模块拆分设计规格

## 目标

将 `src/components/MapView.tsx` 拆分为职责单一、可独立测试的地图功能模块；保持现有地图交互、灾害数据策略和 `MapViewProps` 对外契约不变。

## 范围

本次只处理地图模块的内部结构：

- 保留 Mapbox GL、deck.gl、Worker 和现有 `src/services/hazards/hazardService.ts` 的使用方式。
- 保留 DisasterAware 优先、USGS/NASA EONET/GDACS 回退的既有数据加载策略。
- 保留筛选、样式切换、Marker、聚合 LOD、热力图和 3D 建筑的可见行为。
- 将纯数据转换与 LOD 判断从 React/Mapbox 副作用中抽离，并补充单元测试。
- 将地图实例、图层、Marker 和 Worker 的清理责任归属明确化。

## 非目标

下列事项继续保留在项目待优化清单中，不随本次拆分一并修改：

- 将 Popup 的 `setHTML()` 改为安全 DOM 构建。
- 将地图数据请求改为统一的 Express `/api/hazards` 入口，并暴露来源级状态。
- 自动刷新、页面隐藏暂停、AbortController、请求竞态与旧响应丢弃。
- Mapbox/deck.gl 的按需加载、包体积预算与分包治理。
- 修改地图视觉风格、交互文案、默认地图样式或灾害筛选规则。

## 架构

```text
src/features/map/
  MapView.tsx
  hooks/
    useMapboxInstance.ts
    useHazardData.ts
    useHazardMarkers.ts
    useHazardLodLayers.ts
    useHazardHeatmap.ts
    useDeck3DTiles.ts
  utils/
    hazardGeojson.ts
    mapLayerIds.ts
    mapLod.ts
```

`MapView.tsx` 是组合型组件：创建容器、协调 hooks、把筛选条件和灾害数据传给各项地图能力，并渲染热力图切换控件。它不直接构造 GeoJSON、不直接添加图层、不直接维护 Marker 数组，也不直接处理 Worker 消息。

`useMapboxInstance` 只管理 Mapbox 实例初始化、地图样式更新、生命周期销毁和样式恢复回调。其他 hooks 通过稳定的 `map` 引用注册或更新各自的能力；样式切换完成后由组合组件按既有顺序重新建立 LOD、热力图、3D 建筑、Marker 及数据。

`useHazardData` 保持当前请求语义，将 Worker 清洗、DisasterAware 映射和备用来源聚合封装为可调用的刷新函数，并继续通过 `onDataUpdate` 向上层发送结果。

## 模块边界

### `utils/mapLayerIds.ts`

导出所有地图 source/layer ID 和 LOD 阈值，避免字符串散落在多个 hook 中。ID 值保持当前名称，确保样式切换恢复行为不变。

### `utils/mapLod.ts`

导出纯函数，根据 zoom 与热力图状态计算建筑、聚合图层和 Marker 的可见性。函数不依赖浏览器、React 或 Mapbox。

### `utils/hazardGeojson.ts`

导出将 `Hazard[]` 转为 LOD GeoJSON 和 Heatmap GeoJSON 的纯函数。转换应过滤无有效坐标的记录，保留灾害 id、类型、严重程度、颜色和强度信息；热力图使用现有缺省强度 3 的兼容规则。

### `hooks/useMapboxInstance.ts`

创建并销毁 `mapboxgl.Map`，配置 token、projection、初始视角和 fog。对外提供地图实例引用及样式加载完成事件，保证组件卸载时 `map.remove()` 只执行一次。

### `hooks/useHazardData.ts`

负责数据请求和 Worker 清洗，输出 `disasters`、`refresh` 和加载后的回调。组件卸载时终止 Worker；调用方仍可通过 `onRefreshReady` 获得刷新函数。

### `hooks/useHazardMarkers.ts`

负责筛选后的 DOM Marker 渲染、显示状态与清理。每次重建前清理旧 Marker，卸载时复用同一清理函数；Popup 内容、颜色和当前交互保持不变。

### `hooks/useHazardLodLayers.ts`

负责 `hazards-lod` source、聚合图层、数据写入、zoom 监听和 LOD 可见性更新。图层或 source 不存在时安全跳过，样式重建后可重复初始化。

### `hooks/useHazardHeatmap.ts`

负责 `hazards-heat` source、热力图图层、数据写入和模式切换。热力图开启时隐藏 LOD 与 Marker；关闭时交由 LOD 重新计算可见性。

### `hooks/useDeck3DTiles.ts`

负责 deck.gl overlay、外部 3D Tiles 与 fill-extrusion 回退建筑层。它只在配置启用时添加 overlay，销毁时移除 control；建筑图层可见性由 LOD 结果驱动。

## 数据与事件流

1. `MapView` 挂载后通过 `useMapboxInstance` 创建地图，并通过 `useHazardData` 创建 Worker、加载灾害数据。
2. 数据清洗完成后，`MapView` 保存 `Hazard[]`，向 `App` 调用现有 `onDataUpdate`，并将数据分发给 LOD、热力图和 Marker hook。
3. 筛选条件变化时，仅 Marker hook 重建筛选后的 DOM Marker；LOD 与热力图继续保存完整灾害数据，保持现有语义。
4. zoom 或热力图状态变化时，LOD 计算可见性并同步图层和 Marker 显示状态。
5. 样式切换完成后，重新建立自定义 source/layer/overlay，重新写入灾害数据，再按当前 zoom 和热力图状态恢复可见性。
6. 卸载时，Marker、Worker、deck overlay 和 Mapbox 地图分别由所属 hook 清理。

## 错误处理

- 保留当前 DisasterAware 请求失败后的备用来源回退。
- 保留备用来源的 `Promise.allSettled` 语义，允许部分来源失败。
- 保留不支持 fill-extrusion 样式时的 warning 与安全降级。
- 对缺少 source/layer 的更新操作直接跳过，避免地图样式切换期间抛错。

## 测试与验收

- `MapView.tsx` 不超过 220 行，且不含 GeoJSON 构建、Layer ID 字符串或 Marker 清理实现细节。
- `hazardGeojson` 单测覆盖：有效坐标、无效坐标过滤、id、颜色、严重程度、热力图强度缺省值。
- `mapLod` 单测覆盖：聚合临界值、建筑临界值、热力图开启与关闭状态。
- Mapbox mock 组件测试覆盖：筛选后 Marker 更新、热力图切换和样式切换后的自定义图层重建。
- 保持既有 `MapViewProps` 与 `App.tsx` 的调用兼容；只允许把 import 改为新的 feature 路径。
- 完成后运行项目规定的 lint、format、测试、客户端/服务端类型检查、构建和 `git diff --check`。

## 风险与约束

- Mapbox API 是命令式接口，hooks 之间必须通过稳定 ref 协作，不能把 `Map` 放入 React state。
- 样式切换会清除自定义 source/layer，恢复顺序必须为：初始化图层、写入数据、重建 Marker、应用 LOD。
- 3D 外部 Tiles 是可选能力；未配置时仍必须保留 fill-extrusion 回退。
- 本次不改变外部数据源、网络请求次数或安全策略，因此不把接口变更混入重构提交。
