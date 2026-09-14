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
  appendTextRow(info, "类型", hazard.type.replace(/_/g, " "));
  appendTextRow(info, "严重程度", hazard.severity ?? "");
  appendTextRow(info, "说明", hazard.description);
  appendTextRow(info, "平台", "全球灾害监控平台");

  content.append(title, info);
  return content;
}
