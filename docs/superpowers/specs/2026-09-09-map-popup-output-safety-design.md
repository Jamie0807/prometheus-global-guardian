# 地图 Popup 外部数据输出安全设计

## 目标

消除 Mapbox Popup 将外部灾害数据拼接为 HTML 的路径，同时保持现有 Popup 的信息结构和视觉样式。

## 范围

- 将 `Hazard` 的 `title`、`type`、`severity` 和 `description` 作为纯文本写入 Popup。
- 保留标题、类型、严重程度、描述和平台信息的现有显示顺序与 CSS 类名。
- 为恶意 HTML、事件属性和 URL 文本增加自动化回归测试。
- 同步项目待优化清单的完成状态、实现内容和验证记录。

不处理外部链接跳转、数据源适配、Marker 样式或地图交互行为。

## 方案

在 `src/features/map/utils/` 增加纯 DOM 工厂函数，接收 `Hazard` 并返回 Popup 内容根节点。

- 函数用 `document.createElement` 创建本地固定的 `div`、`strong` 和 `br` 节点。
- 外部字段一律通过 `textContent` 写入；`type` 的下划线替换仅改变显示文本。
- `useHazardMarkers` 将工厂函数返回的节点传给 Mapbox Popup，不再调用 `setHTML()`。

这条边界保证外部文本即使包含标签、脚本、事件属性或 URL，也只会被浏览器当作可见文字处理。项目自身控制的元素、标签和类名继续保留。

## 测试

新增纯函数测试，构造包含 `<script>`、`<img onerror>` 和恶意 URL 字符串的灾害数据，验证：

- Popup 根节点及既有类名存在。
- 每个外部值以 `textContent` 保留。
- 生成节点中不存在由外部输入产生的 `script`、`img` 或事件属性。

随后运行该测试、组件测试、客户端类型检查、格式检查与差异检查。

## 验收标准

- 地图 Marker Popup 不再使用 `setHTML()`。
- 任意外部字段不能创建或修改 Popup DOM 结构，也不能执行脚本。
- 原有 Popup 信息和样式类名保持可用。
- 回归测试覆盖恶意标签、属性和 URL 文本。
