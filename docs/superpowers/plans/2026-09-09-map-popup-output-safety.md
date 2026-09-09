# 地图 Popup 外部数据输出安全实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让外部灾害文本只能以纯文本形式进入 Mapbox Popup，并用回归测试防止重新引入 HTML 注入。

**Architecture:** 在地图工具目录创建 `createHazardPopupContent` DOM 工厂函数。Hook 仅将该函数返回的元素交给 Mapbox Popup；固定的标签、CSS 类名和字段标签仍由本地代码创建，外部 `Hazard` 字段仅通过 `textContent` 写入。

**Tech Stack:** React 19、TypeScript 5、Mapbox GL JS、Vitest、JSDOM。

## 全局约束

- `title`、`type`、`severity` 和 `description` 属于外部输入，不得进入 `innerHTML` 或 `setHTML()`。
- 保留 `.popup-title`、`.popup-info` 和既有字段显示顺序。
- 不改变 Marker 样式、数据源适配、外部链接或地图交互。
- 使用 TDD：先运行新增测试并确认其因缺少工厂函数而失败，再写最小实现。
- 不自动暂存、提交或推送。

---

### Task 1: 为 Popup DOM 工厂建立安全回归测试

**Files:**

- Create: `tests/component/hazard-popup-content.test.tsx`
- Create: `src/features/map/utils/hazardPopupContent.ts`

**Interfaces:**

- Consumes: `Hazard` from `src/types/index.ts`.
- Produces: `createHazardPopupContent(hazard: Hazard): HTMLDivElement`.

- [x] **Step 1: 写入失败测试**

```tsx
import { describe, expect, it } from "vitest";

import type { Hazard } from "../../src/types";
import { createHazardPopupContent } from "../../src/features/map/utils/hazardPopupContent";

const maliciousHazard: Hazard = {
  id: "hazard-1",
  title: "<script>window.__xss = true</script>",
  type: '<img src=x onerror="window.__xss = true">',
  severity: 'HIGH <a href="javascript:alert(1)">link</a>',
  description: '<img src=x onerror="window.__xss = true"> https://evil.example',
  geometry: { type: "Point", coordinates: [120, 30] },
  source: "test",
};

describe("hazard popup content", () => {
  it("renders external hazard fields as text without creating executable DOM", () => {
    const content = createHazardPopupContent(maliciousHazard);

    expect(content.className).toBe("popup-content");
    expect(content.querySelector(".popup-title")?.textContent).toBe(maliciousHazard.title);
    expect(content.querySelector(".popup-info")?.textContent).toContain(maliciousHazard.type);
    expect(content.querySelector(".popup-info")?.textContent).toContain(maliciousHazard.severity);
    expect(content.querySelector(".popup-info")?.textContent).toContain(
      maliciousHazard.description,
    );
    expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
    expect(content.querySelector("[onerror], [onclick], [href] ")).toBeNull();
  });
});
```

- [x] **Step 2: 运行测试并确认红灯**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/hazard-popup-content.test.tsx`

Expected: FAIL，错误指出 `hazardPopupContent` 模块或 `createHazardPopupContent` 导出不存在。

- [x] **Step 3: 实现最小 DOM 工厂**

```ts
import type { Hazard } from "../../../types";

function appendTextRow(container: HTMLElement, label: string, value: string): void {
  const labelElement = document.createElement("strong");
  labelElement.textContent = `${label}:`;
  container.append(
    labelElement,
    document.createTextNode(` ${value}`),
    document.createElement("br"),
  );
}

export function createHazardPopupContent(hazard: Hazard): HTMLDivElement {
  const content = document.createElement("div");
  content.className = "popup-content";

  const title = document.createElement("div");
  title.className = "popup-title";
  title.textContent = hazard.title;

  const info = document.createElement("div");
  info.className = "popup-info";
  appendTextRow(info, "Type", hazard.type.replace(/_/g, " "));
  appendTextRow(info, "Severity", hazard.severity ?? "");
  appendTextRow(info, "Description", hazard.description);
  appendTextRow(info, "Platform", "Prometheus Global Guardian");

  content.append(title, info);
  return content;
}
```

- [x] **Step 4: 运行测试并确认绿灯**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/hazard-popup-content.test.tsx`

Expected: PASS，1 个测试通过。

### Task 2: 将 Marker Hook 接到安全内容节点

**Files:**

- Modify: `src/features/map/hooks/useHazardMarkers.ts`
- Modify: `tests/component/map-view.test.tsx`

**Interfaces:**

- Consumes: `createHazardPopupContent(hazard: Hazard): HTMLDivElement` from `src/features/map/utils/hazardPopupContent.ts`.
- Produces: 通过 `Popup#setDOMContent` 设置安全 Popup 内容的 Marker。

- [x] **Step 1: 扩展失败测试，锁定 Mapbox DOM 内容接口**

在 `tests/component/map-view.test.tsx` 的 `mapMocks` 增加 `popupSetDOMContent: vi.fn()`；将 `Popup` mock 设为带 `setDOMContent` 方法的类，将 `Marker` mock 设为支持 `setLngLat`、`setPopup` 和 `addTo` 链式调用的类。将 `fetchHazardsActive` mock 改为返回一条含外部标记文本的有效活动灾害，再添加：

```tsx
it("passes a DOM popup node to Mapbox for external hazard text", async () => {
  render(<MapView filter="ALL" mapStyle="dark-v11" onDataUpdate={vi.fn()} />);

  await waitFor(() => expect(mapMocks.popupSetDOMContent).toHaveBeenCalledTimes(1));

  const content = mapMocks.popupSetDOMContent.mock.calls[0]?.[0] as HTMLDivElement;
  expect(content.querySelector(".popup-title")?.textContent).toContain("<script>");
  expect(content.querySelectorAll("script, img, a")).toHaveLength(0);
});
```

- [x] **Step 2: 运行测试并确认红灯**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/hazard-popup-content.test.tsx`

Expected: FAIL，因为当前 `Popup` 调用的是 `.setHTML()`，`popupSetDOMContent` 尚未被调用。

- [x] **Step 3: 替换 Hook 的 Popup 输出路径**

在 `src/features/map/hooks/useHazardMarkers.ts` 增加：

```ts
import { createHazardPopupContent } from "../utils/hazardPopupContent";
```

并将 Popup 创建替换为：

```ts
const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(createHazardPopupContent(hazard));
```

删除原有 `.setHTML()` 字符串模板，不改动 Marker 创建、坐标校验和清理逻辑。

- [x] **Step 4: 运行安全测试与地图组件测试并确认绿灯**

Run: `pnpm exec vitest run --config vitest.component.config.ts tests/component/hazard-popup-content.test.tsx tests/component/map-view.test.tsx`

Expected: PASS，Popup 安全测试和地图组件测试全部通过。

### Task 3: 更新优化清单并完成范围验证

**Files:**

- Modify: `docs/PROJECT_OPTIMIZATION_BACKLOG.md`

**Interfaces:**

- Consumes: 已通过的 Popup 安全测试和 Hook 实现。
- Produces: P0 条目状态、实现内容、测试入口和遗留范围的准确记录。

- [x] **Step 1: 更新 P0 状态与实施记录**

将“地图外部数据输出安全”标记为已完成，并记录：使用 `setDOMContent`、外部字段经 `textContent` 输出、回归测试覆盖标签、事件属性和 URL 文本。本项遗留范围仅限外部链接功能，未在本轮启用。

- [x] **Step 2: 运行格式与类型验证**

Run: `pnpm run format:check && pnpm run typecheck:client && git diff --check`

Expected: 所有命令退出码为 0。

- [x] **Step 3: 运行完整项目基线**

Run: `pnpm run test:baseline`

Expected: BFF、Service、组件、E2E 和构建全部通过。
