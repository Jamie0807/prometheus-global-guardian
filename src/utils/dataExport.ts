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
export const exportToCSV = (hazards: Hazard[], filename: string = "hazards-data.csv"): void => {
  if (hazards.length === 0) {
    alert("No data to export");
    return;
  }

  // Define CSV headers
  const headers = [
    "ID",
    "Type",
    "Title",
    "Severity",
    "Population Exposed",
    "Source",
    "Date",
    "Latitude",
    "Longitude",
    "Description",
  ];

  // Convert hazards to CSV rows
  const rows = hazards.map((hazard) => [
    hazard.id,
    hazard.type.replace(/_/g, " "),
    `"${hazard.title.replace(/"/g, '""')}"`, // Escape quotes
    hazard.severity || "Unknown",
    hazard.magnitude || 0,
    hazard.source || "Unknown",
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
  filename: string = "analytics-data.csv",
): void => {
  // Create comprehensive analytics CSV
  const sections = [];

  // Type Distribution
  sections.push("TYPE DISTRIBUTION");
  sections.push("Type,Count,Percentage");
  typeData.forEach((item) => {
    sections.push(`"${item.type.replace(/_/g, " ")}",${item.count},${item.percentage}%`);
  });
  sections.push("");

  // Severity Distribution
  sections.push("SEVERITY DISTRIBUTION");
  sections.push("Severity,Count,Percentage");
  severityData.forEach((item) => {
    sections.push(`${item.severity},${item.count},${item.percentage}%`);
  });
  sections.push("");

  // Timeline Data
  sections.push("TIMELINE DATA");
  sections.push("Date,Earthquakes,Volcanoes,Storms,Floods,Wildfires,Total");
  timelineData.forEach((item) => {
    sections.push(
      `${new Date(item.date).toLocaleDateString()},${item.earthquakes},${item.volcanoes},${item.storms},${item.floods},${item.wildfires},${item.total}`,
    );
  });
  sections.push("");

  // Source Distribution
  sections.push("DATA SOURCES");
  sections.push("Source,Count");
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
export const exportToJSON = (data: unknown, filename: string = "data.json"): void => {
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
