/**
 * 提供灾害数据的 CSV 与 JSON 导出工具。
 */
import type { Hazard } from "../types";

interface TypeDistributionRow {
  type: string;
  count: number;
  percentage: number;
}

interface SeverityDistributionRow {
  severity: string;
  count: number;
  percentage: number;
}

interface TimelineRow {
  date: string;
  earthquakes: number;
  volcanoes: number;
  storms: number;
  floods: number;
  wildfires: number;
  total: number;
}

interface SourceDistributionRow {
  source: string;
  count: number;
}

/**
 * 将灾害数据转换为 CSV 格式
 */
export const exportToCSV = (hazards: Hazard[], filename: string = "灾害数据.csv"): void => {
  if (hazards.length === 0) {
    alert("没有可导出的数据");
    return;
  }

  // 定义 CSV 表头
  const headers = [
    "编号",
    "类型",
    "标题",
    "严重程度",
    "暴露人口",
    "来源",
    "日期",
    "纬度",
    "经度",
    "说明",
  ];

  // 将灾害数据转换为 CSV 行
  const rows = hazards.map((hazard) => [
    hazard.id,
    hazard.type.replace(/_/g, " "),
    `"${hazard.title.replace(/"/g, '""')}"`, // 转义引号
    hazard.severity || "未知",
    hazard.magnitude || 0,
    hazard.source || "未知",
    hazard.timestamp || new Date().toISOString(),
    hazard.geometry.coordinates[1] || 0,
    hazard.geometry.coordinates[0] || 0,
    `"${(hazard.description || "").replace(/"/g, '""')}"`, // 转义引号
  ]);

  // 合并表头与数据行
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // 创建 Blob 并下载
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 导出包含图表数据的分析数据
 */
export const exportAnalyticsToCSV = (
  typeData: TypeDistributionRow[],
  severityData: SeverityDistributionRow[],
  timelineData: TimelineRow[],
  sourceData: SourceDistributionRow[],
  filename: string = "分析数据.csv",
): void => {
  // 创建综合分析 CSV
  const sections = [];

  // 类型分布
  sections.push("类型分布");
  sections.push("类型,数量,占比");
  typeData.forEach((item) => {
    sections.push(`"${item.type.replace(/_/g, " ")}",${item.count},${item.percentage}%`);
  });
  sections.push("");

  // 严重度分布
  sections.push("严重程度分布");
  sections.push("严重程度,数量,占比");
  severityData.forEach((item) => {
    sections.push(`${item.severity},${item.count},${item.percentage}%`);
  });
  sections.push("");

  // 时间线数据
  sections.push("时间线数据");
  sections.push("日期,地震,火山,风暴,洪水,野火,总计");
  timelineData.forEach((item) => {
    sections.push(
      `${new Date(item.date).toLocaleDateString("zh-CN")},${item.earthquakes},${item.volcanoes},${item.storms},${item.floods},${item.wildfires},${item.total}`,
    );
  });
  sections.push("");

  // 数据源分布
  sections.push("数据来源");
  sections.push("来源,数量");
  sourceData.forEach((item) => {
    sections.push(`${item.source},${item.count}`);
  });

  const csvContent = sections.join("\n");

  // 创建 Blob 并下载
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 将数据导出为 JSON
 */
export const exportToJSON = (data: unknown, filename: string = "数据.json"): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
