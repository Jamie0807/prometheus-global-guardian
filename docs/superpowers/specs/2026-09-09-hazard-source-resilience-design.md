# 外部数据源时效性与韧性设计

## 目标

为 DisasterAWARE、USGS、NASA EONET 和 GDACS 增加来源级超时、有限重试、短期缓存与陈旧数据状态。地图在实时请求短暂失败时仍可展示最近成功数据，并明确提示其可能过期。

## 范围

- 每个来源单独执行超时与一次重试。
- 每个来源缓存最近成功数据和成功时间，缓存有效期为 5 分钟。
- 响应标记实时、陈旧、空和不可用来源，并返回最近成功时间。
- 聚合响应按 `source:id` 去重。
- 地图状态条展示陈旧数据与最近成功时间。
- 补充 BFF 与组件自动化测试，更新优化清单。

本次不加入定时刷新、后台刷新、客户端请求取消、客户端去重、磁盘缓存或多实例共享缓存。

## 来源执行策略

每个来源使用独立的请求包装器：

- 默认超时为 8 秒。
- 一次请求失败后最多再尝试一次。
- 超时配置由服务端环境变量提供，取值限制为 1–30 秒。
- 只有成功完成的来源结果才更新缓存；空列表也是成功结果，记录为 `empty`。

DisasterAWARE 保持唯一首选来源。只有它实时失败或返回空列表时，才请求三个备用来源。备用来源可以独立返回未过期缓存，不改变首选来源优先级。

## 缓存与来源状态

缓存是 BFF 进程内内存状态，按来源保存 `hazards` 与 `fetchedAt`，进程重启后失效，不在实例间共享。

来源状态扩展为：

```ts
type HazardSourceState = "success" | "empty" | "unavailable" | "fallback" | "stale";

interface HazardSourceStatus {
  id: HazardSourceId;
  status: HazardSourceState;
  count: number;
  fetchedAt?: string;
  message?: string;
}
```

实时成功使用 `success` 或 `empty`；实时失败但缓存年龄不超过 5 分钟时使用 `stale`，返回缓存及其 `fetchedAt`；实时失败且无可用缓存时使用 `unavailable`。错误信息保持稳定、用户可展示，不包含上游 URL、凭据、响应正文或堆栈。

`HazardFeedResponse.meta` 增加 `stale: boolean`，当至少一个实际返回的来源为陈旧缓存时为 `true`。最终 hazards 以 `source:id` 为键去重，不进行跨来源事件匹配。

## 地图展示

地图状态条继续展示实时来源状态。`meta.stale` 为 `true` 时，在状态条显示“数据可能已过期”，并显示所有陈旧来源中最早的最近成功时间。首次加载无实时或缓存数据时仍显示“暂无可用灾害数据”。

## 测试与验证

- BFF 测试超时重试成功、重试失败后使用未过期缓存、超过 5 分钟的缓存不复用、每来源 `stale` 与 `fetchedAt`、`meta.stale` 和 `source:id` 去重。
- 组件测试陈旧提示与最近成功时间；现有首选与回退提示继续通过。
- 完成后运行完整 Node 基线、Docker Python unittest、格式检查和 `git diff --check`。

## 后续边界

自动刷新、页面隐藏暂停、请求取消、请求去重与过期响应丢弃仍由“实现自动刷新与请求竞态保护”负责。多实例部署时，以共享缓存替换当前进程内缓存，并在部署治理中单独确定容量、TTL 和失效策略。
