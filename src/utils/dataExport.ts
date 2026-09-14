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
 * Convert hazards data to CSV format
 */
export const exportToCSV = (hazards: Hazard[], filename: string = "灾害数据.csv"): void => {
  if (hazards.length === 0) {
    alert("没有可导出的数据");
    return;
  }

  // Define CSV headers
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

  // Convert hazards to CSV rows
  const rows = hazards.map((hazard) => [
    hazard.id,
    hazard.type.replace(/_/g, " "),
    `"${hazard.title.replace(/"/g, '""')}"`, // Escape quotes
    hazard.severity || "未知",
    hazard.magnitude || 0,
    hazard.source || "未知",
    hazard.timestamp || new Date().toISOString(),
    hazard.geometry.coordinates[1] || 0,
    hazard.geometry.coordinates[0] || 0,
    `"${(hazard.description || "").replace(/"/g, '""')}"`, // Escape quotes
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  // Create blob and download
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
 * Export analytics data including charts data
 */
export const exportAnalyticsToCSV = (
  typeData: TypeDistributionRow[],
  severityData: SeverityDistributionRow[],
  timelineData: TimelineRow[],
  sourceData: SourceDistributionRow[],
  filename: string = "分析数据.csv",
): void => {
  // Create comprehensive analytics CSV
  const sections = [];

  // Type Distribution
  sections.push("类型分布");
  sections.push("类型,数量,占比");
  typeData.forEach((item) => {
    sections.push(`"${item.type.replace(/_/g, " ")}",${item.count},${item.percentage}%`);
  });
  sections.push("");

  // Severity Distribution
  sections.push("严重程度分布");
  sections.push("严重程度,数量,占比");
  severityData.forEach((item) => {
    sections.push(`${item.severity},${item.count},${item.percentage}%`);
  });
  sections.push("");

  // Timeline Data
  sections.push("时间线数据");
  sections.push("日期,地震,火山,风暴,洪水,野火,总计");
  timelineData.forEach((item) => {
    sections.push(
      `${new Date(item.date).toLocaleDateString("zh-CN")},${item.earthquakes},${item.volcanoes},${item.storms},${item.floods},${item.wildfires},${item.total}`,
    );
  });
  sections.push("");

  // Source Distribution
  sections.push("数据来源");
  sections.push("来源,数量");
  sourceData.forEach((item) => {
    sections.push(`${item.source},${item.count}`);
  });

  const csvContent = sections.join("\n");

  // Create blob and download
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
 * Export data as JSON
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
