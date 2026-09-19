# 统一灾害事件与图层注册表设计

## 1. 背景与目标

当前项目已经通过 BFF 聚合 DisasterAware、USGS、NASA EONET 和 GDACS，但同一领域事实在不同边界使用了不同表示：

- BFF 目前主要使用 `source:id` 去重；前端领域类型主要使用 `id`、`source` 和 `timestamp`；
- Analytics 请求使用独立的 `HazardData` 字段集合；
- 数据质量检查维护来源名称白名单；
- AI 只接收裁剪后的灾害摘要；
- 地图、Analytics、质量和 AI 尚未共享逻辑图层元数据。

本设计为这些边界建立渐进式 canonical 事件模型和图层注册表，同时保留迁移期兼容字段。目标是：

1. 统一事件标识、来源标识、观测时间、更新时间、几何、严重性、置信度和契约版本；
2. 通过稳定的 `layerId` 让地图、统计、质量和 AI 使用同一套灾害分类元数据；
3. 让 BFF、浏览器 TypeScript 和 Python Analytics 读取同一份语言无关样本；
4. 不改变现有 API 路径、分析算法、自动刷新策略或部署边界。

## 2. 范围与非目标

### 2.1 本轮范围

- 新增纯 TypeScript 共享领域模块 `shared/hazards/`；
- 新增 `contracts/hazard-event.json`，作为 TypeScript 和 Python 测试共同读取的契约样本；
- 为 BFF 四类灾害源适配器补充 canonical 事件字段；
- 在客户端 Hazard parser、Worker、GeoJSON 转换、Analytics 转换、质量检查和 AI 摘要边界使用 canonical 字段；
- 为 Python `HazardData` 增加必要的可选字段并补充跨语言测试；
- 更新项目规格和优化清单，记录兼容策略与剩余边界。

### 2.2 不在本轮范围

- 不引入 PostgreSQL、PostGIS、Redis 或其他持久化/共享状态组件；
- 不实现历史快照、回放、审计、事件生命周期或协同处置；
- 不把点状事件扩展为多边形、线或栅格数据服务；
- 不实施数据源健康检查、延迟指标或统一降级原因契约；
- 不删除现有 `Hazard.id`、`Hazard.source`、`Hazard.timestamp` 兼容字段；
- 不改变 Mapbox 现有聚合、热力图和 LOD 物理图层；
- 不改变 Analytics 算法、接口路径、请求限制或响应信封。

## 3. Canonical 事件模型

共享模型位于 `shared/hazards/hazard-event.ts`，只依赖 TypeScript 标准类型，不依赖 React、Mapbox、Express 或 Python。

```ts
interface HazardEvent {
  schemaVersion: "1";
  eventId: string;
  sourceEventId: string;
  sourceId: "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";
  layerId: string;
  type: string;
  title: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  observedAt?: string;
  updatedAt?: string;
  severity?: string;
  confidence?: number;
  magnitude?: number;
  description: string;
  url?: string;
}
```

### 3.1 标识规则

- `sourceEventId` 保存上游来源的稳定事件 ID；
- `eventId` 必须是 `${sourceId}:${sourceEventId}`；
- BFF 聚合、客户端 Worker 和相关测试均以 `eventId` 作为跨来源稳定标识；
- 上游没有稳定事件 ID 的记录不进入 canonical 事件集合；不得继续使用数组下标或 `Date.now()` 作为跨刷新 ID；
- 现有 `Hazard.id` 在迁移期保留，并归一化为 `eventId` 的兼容别名。

### 3.2 时间与数值语义

- `observedAt` 表示事件被观测或发生的时间；
- `updatedAt` 表示来源记录的更新时间；
- 现有 `timestamp` 作为兼容字段，优先映射到 `observedAt`，缺失时不伪造时间；
- `confidence` 为可选的 `0..1` 数值。来源没有可信度依据时保持缺省；
- `magnitude` 延续现有可选数值语义，不为非地震事件强行换算统一量纲；
- `geometry` 保留现有点状数据表示和坐标顺序 `[longitude, latitude]`。本轮不会增加复杂几何解析。

## 4. 图层注册表

注册表位于 `shared/hazards/hazard-layer-registry.ts`，描述逻辑灾害图层，不直接绑定 Mapbox 物理图层。

```ts
interface HazardLayerDefinition {
  layerId: string;
  typeIds: readonly string[];
  category: "geological" | "hydrological" | "meteorological" | "environmental";
  label: string;
}
```

首批注册项：

| `layerId`        | 类型集合                                                                               |
| ---------------- | -------------------------------------------------------------------------------------- |
| `earthquake`     | `EARTHQUAKE`                                                                           |
| `volcanic`       | `VOLCANO`                                                                              |
| `hydrological`   | `FLOOD`、`TSUNAMI`                                                                     |
| `meteorological` | `STORM`、`TROPICAL_CYCLONE`、`CYCLONE`、`TORNADO`、`WINTERSTORM`、`EXTREMETEMPERATURE` |
| `fire`           | `WILDFIRE`                                                                             |
| `land`           | `LANDSLIDE`                                                                            |
| `drought`        | `DROUGHT`                                                                              |
| `unknown`        | 未识别类型                                                                             |

注册表提供纯函数完成类型到 `layerId` 的解析。未知类型统一回退到 `unknown`，不会使整批灾害数据失败。来源显示名仍由各展示边界处理，注册表只保存稳定的类型和分类语义。

## 5. 系统数据流

### 5.1 BFF 适配与响应

`server/hazards/hazard-source.ts` 和 `server.ts` 中的 DisasterAware、USGS、NASA EONET、GDACS 适配器负责：

1. 提取来源事件 ID、来源 ID、观测/更新时间和已有灾害字段；
2. 通过图层注册表生成 `layerId`；
3. 生成 `eventId` 并在 BFF 聚合阶段按 canonical ID 去重；
4. 对缺少稳定来源 ID 的记录跳过，并只记录不含原始响应内容的安全日志。

BFF 响应同时包含 canonical 字段和迁移期兼容字段。现有 `meta.sources` 继续只描述来源级成功、空结果、不可用、fallback 和 stale 状态，不在本轮混入健康检查指标。

### 5.2 浏览器边界

客户端 Hazard parser 对新字段执行运行时校验；旧响应缺少新字段时执行兼容归一化：

- 从 `source` 推导可识别的 `sourceId`；
- 以现有 `id` 作为 `sourceEventId` 并生成兼容 `eventId`；
- 由 `type` 解析 `layerId`；
- 保留已有 `timestamp`、`source` 和 `id` 字段；
- 无法安全推导的 `updatedAt`、`confidence` 等字段保持缺省。

Worker 使用 `eventId` 去重，并透传 `layerId`、`sourceId`、时间和版本字段。地图 GeoJSON 只增加必要的逻辑属性，现有聚合、热力图和 LOD 行为不变。

### 5.3 Analytics、质量与 AI

- `formatHazards` 以 canonical 事件作为来源，继续向现有 Analytics 字段提供兼容的 `timestamp` 和 `source`；
- Python `HazardData` 增加可选的 `schemaVersion`、`eventId`、`sourceEventId`、`sourceId`、`layerId`、`observedAt`、`updatedAt`、`confidence` 字段；现有 `timestamp`、`source` 仍可用；
- 质量检查优先使用 canonical `sourceId` 和 `layerId`，显示文本再转换为可读来源名；
- AI 的灾害摘要增加 `sourceId` 和 `layerId` 的可选上下文，但不扩大现有消息、数量和长度上限；
- 任何算法仍可使用原有 `type`、`timestamp`、`magnitude` 和 `severity` 字段，不改变统计口径。

## 6. 校验与错误语义

canonical parser 和 Python Pydantic 模型必须拒绝：

- 缺少必填字段或空标识；
- `eventId` 与 `sourceId:sourceEventId` 不一致；
- 非有限坐标、越界经纬度或不支持的几何坐标结构；
- 超出 `0..1` 的 `confidence`；
- 未知的 `schemaVersion`。

未知 `type` 和未知 `layerId` 使用 `unknown` 回退，不把单条未知类型升级为整批失败。边界错误继续使用现有稳定错误类型和安全消息，不向浏览器暴露上游原始响应或异常文本。

## 7. 测试策略

### 7.1 TypeScript 和 BFF

- 注册表类型映射、未知类型回退和事件 ID 构造单元测试；
- 四个来源适配器测试 canonical ID、时间、来源、图层和缺少稳定 ID 的跳过行为；
- BFF 聚合测试 canonical 去重；
- Hazard parser 测试新响应、旧响应兼容、非法 ID、坐标、置信度和版本；
- Worker 和 GeoJSON 测试 canonical 字段透传及基于 `eventId` 去重；
- Analytics `formatHazards` 和 AI 摘要测试使用 canonical 字段。

### 7.2 Python 与跨语言

- Python 请求模型读取并校验 `contracts/hazard-event.json`；
- TypeScript 测试读取同一份样本并验证解析结果；
- 双端验证字段默认值、可选字段、未知字段、坐标范围和置信度边界；
- 不修改既有算法测试的输入语义。

### 7.3 完整验收

实现后按项目既有入口执行相关测试，并至少完成：

```text
pnpm run lint
pnpm run format:check
pnpm run typecheck:client
pnpm run typecheck:server
pnpm run typecheck:contracts
pnpm run test:bff
pnpm run test:services
pnpm run test:component
pnpm run test:e2e
pnpm run test:python
pnpm run build
git diff --check
```

## 8. 兼容、回滚与后续演进

- 本轮新增字段优先采用可选兼容方式；BFF 先提供 canonical 字段，客户端逐步迁移读取路径；
- 如果某一来源的真实字段不足以满足 canonical 规则，只影响该来源记录，不阻塞其他来源；
- 回滚时可保留旧 `Hazard` 字段和旧 Analytics 请求结构，删除新字段不会改变现有 API 路径；
- 数据源健康检查应在本模型稳定后单独设计，使用 `sourceId` 作为指标维度；
- PostgreSQL/PostGIS 设计应直接以 `eventId`、`sourceId`、`layerId`、观测/更新时间和几何字段为基础，但不在本轮实施。

## 9. 验收标准

完成本设计对应实现后，应满足：

1. 同一来源事件在 BFF、Worker 和地图/Analytics/AI 边界保持同一个 `eventId`；
2. 所有已支持类型都能通过同一注册表得到稳定 `layerId`，未知类型回退为 `unknown`；
3. 新旧 Hazard 响应都能安全解析，非法 canonical 字段会被拒绝且不泄露原始数据；
4. TypeScript、BFF、Python 和共享契约测试对 canonical 样本达成一致；
5. 现有地图展示、Analytics 分析、质量检查、AI 请求、来源 fallback 和刷新竞态行为不回归；
6. 质量清单和项目规格书准确记录注册表完成状态，以及数据源健康检查和数据库设计仍未完成的边界。
