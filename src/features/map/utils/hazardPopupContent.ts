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
