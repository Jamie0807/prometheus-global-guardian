import type { SaveReportPayload } from "../types";

export type HtmlReportPayload = SaveReportPayload & { timestamp: string };

function escapeHtml(value: string | number | undefined): string {
  return String(value ?? "未知")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "未知";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Shanghai",
      }).format(date);
}

function buildTypeRows(payload: HtmlReportPayload): string {
  const counts = new Map<string, number>();
  for (const disaster of payload.disasters) {
    const type = disaster.type || "未知";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right, "zh-CN"))
    .map(([type, count]) => `<tr><td>${escapeHtml(type)}</td><td>${count}</td></tr>`)
    .join("");
}

function buildDisasterRows(payload: HtmlReportPayload): string {
  return payload.disasters
    .map(
      (disaster) => `<tr>
        <td>${escapeHtml(disaster.title)}</td>
        <td>${escapeHtml(disaster.type)}</td>
        <td>${escapeHtml(disaster.severity)}</td>
        <td>${escapeHtml(formatTimestamp(disaster.timestamp))}</td>
        <td>${escapeHtml(disaster.source)}</td>
        <td>${escapeHtml(disaster.description)}</td>
      </tr>`,
    )
    .join("");
}

export function buildReportHtml(payload: HtmlReportPayload): string {
  const title = escapeHtml(payload.reportName || "灾害报告");
  const organization = payload.organization.trim()
    ? `<p><strong>组织：</strong>${escapeHtml(payload.organization)}</p>`
    : "";
  const email = payload.email.trim()
    ? `<p><strong>邮箱：</strong>${escapeHtml(payload.email)}</p>`
    : "";
  const notes = payload.notes.trim()
    ? `<section><h2>补充说明</h2><p>${escapeHtml(payload.notes)}</p></section>`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color: #172033; background: #f4f7fb; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { max-width: 1120px; margin: 0 auto; padding: 32px; background: #fff; }
    header { border-bottom: 3px solid #2563eb; margin-bottom: 24px; padding-bottom: 16px; }
    h1 { margin: 0 0 8px; color: #102a56; font-size: 28px; } h2 { color: #1d4ed8; font-size: 18px; margin-top: 28px; }
    p { line-height: 1.7; } .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .summary-item { border: 1px solid #dbe5f3; border-radius: 8px; padding: 14px; background: #f8fbff; }
    .summary-item strong { display: block; color: #64748b; font-size: 13px; margin-bottom: 6px; }
    table { border-collapse: collapse; width: 100%; margin-top: 12px; font-size: 14px; } th, td { border: 1px solid #dbe5f3; padding: 10px; text-align: left; vertical-align: top; word-break: break-word; } th { background: #eff6ff; color: #1e3a5f; }
    @media print { @page { margin: 14mm; } body { max-width: none; padding: 0; } .summary { grid-template-columns: repeat(3, 1fr); } tr { break-inside: avoid; } }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    ${organization}${email}
    <p><strong>生成时间：</strong>${escapeHtml(formatTimestamp(payload.timestamp))}</p>
  </header>
  <section class="summary">
    <div class="summary-item"><strong>当前筛选</strong>${escapeHtml(payload.filter === "ALL" ? "全部灾害" : payload.filter)}</div>
    <div class="summary-item"><strong>灾害事件总数</strong>${payload.disasters.length}</div>
    <div class="summary-item"><strong>报告格式</strong>HTML（可通过浏览器打印为 PDF）</div>
  </section>
  ${notes}
  <section><h2>按灾害类型汇总</h2><table><thead><tr><th>灾害类型</th><th>事件数</th></tr></thead><tbody>${buildTypeRows(payload)}</tbody></table></section>
  <section><h2>灾害事件明细</h2><table><thead><tr><th>标题</th><th>类型</th><th>严重程度</th><th>发生时间</th><th>来源</th><th>说明</th></tr></thead><tbody>${buildDisasterRows(payload)}</tbody></table></section>
</body>
</html>`;
}
