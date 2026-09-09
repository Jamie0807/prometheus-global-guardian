# 灾害数据入口与来源级状态设计

## 目标

让地图通过一个 BFF 入口获得灾害数据和来源状态。DisasterAWARE 是首选来源；只有首选来源不可用或没有记录时，才使用 USGS、NASA EONET 和 GDACS 作为备用来源。

## 范围

- BFF 的 `/api/hazards` 成为地图唯一的数据调度入口。
- BFF 统一适配 DisasterAWARE 与备用来源数据，返回 `Hazard` 列表和来源级状态。
- 地图展示当前数据状态及首选来源降级信息。
- 测试首选、回退、部分成功、全失败和地图状态条行为。
- 更新优化清单的 CI 与本项状态。

本次不增加超时、重试、缓存、陈旧数据、新鲜度计算、定时刷新或请求取消；它们属于后续数据源韧性与请求生命周期任务。

## BFF 响应契约

`GET /api/hazards` 返回：

```ts
interface HazardSourceStatus {
  id: "disasteraware" | "usgs" | "nasa-eonet" | "gdacs";
  status: "success" | "empty" | "unavailable" | "fallback";
  count: number;
  message?: string;
}

interface HazardFeedResponse {
  hazards: Hazard[];
  meta: {
    primary: "disasteraware";
    fallbackUsed: boolean;
    generatedAt: string;
    sources: HazardSourceStatus[];
  };
}
```

来源状态中的 `message` 仅使用稳定、用户可展示的文本；不得包含上游 URL、凭据、令牌、响应正文或异常堆栈。

## 调度与降级

1. BFF 首先通过既有 DisasterAWARE 受限代理能力获取活动灾害，并统一适配为 `Hazard`。
2. 首选来源成功且有记录时，直接返回数据；`fallbackUsed` 为 `false`，且不发起备用来源请求。
3. 首选来源成功但无记录时，标记为 `empty`，并行请求三个备用来源；`fallbackUsed` 为 `true`。
4. 首选来源失败时，标记为 `unavailable`，并行请求三个备用来源；`fallbackUsed` 为 `true`。
5. 备用来源各自报告 `success`、`empty` 或 `unavailable`。任何可用备用记录都立即组成响应。
6. 全部来源均没有可用记录时，返回空 `hazards` 与完整来源状态，HTTP 响应保持成功，方便 UI 区分“无数据”和接口错误。

## 前端边界与状态条

`hazardService` 只调用 `/api/hazards` 并解析 `HazardFeedResponse`。`useHazardData` 只负责调用统一入口、将灾害交给 Worker 清洗，并把来源状态传给地图组合组件；它不再直接请求任何外部灾害 URL，也不实现回退策略。

地图顶部状态条按元数据显示：

- 首选成功：`DisasterAWARE · 已更新`。
- 首选为空、备用成功：`DisasterAWARE 暂无数据 · 已显示备用数据`。
- 首选不可用、备用成功：`DisasterAWARE 暂不可用 · 已显示备用数据`。
- 全部来源无可用数据：若已有地图数据则保留；首次加载显示无可用数据。

## 测试与验证

- BFF 测试首选成功不调用备用来源、首选为空回退、首选不可用且部分备用成功、全部来源无可用数据，以及不泄露上游异常详情。
- Service 测试统一响应的解析与非成功响应处理。
- 地图组件测试状态条显示与统一入口调用，确保不再 mock 或调用外部来源函数。
- 完成后运行项目质量基线、Python unittest、格式检查和 `git diff --check`。

## 文档状态

`docs/PROJECT_OPTIMIZATION_BACKLOG.md` 将把最小 CI 门禁与 Python 测试入口移动到已完成项，并将统一灾害数据入口与来源级状态更新为已完成；外部数据源韧性与自动刷新继续保留为后续工作。
