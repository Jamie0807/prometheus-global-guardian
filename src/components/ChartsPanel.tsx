import React, { useState, useEffect, useCallback } from "react";
import { getStatistics } from "../services/analytics/analyticsService";
import type { StatisticsData } from "../services/analytics/contracts/statistics";
import { formatAnalyticsNumber } from "../services/analytics/analyticsPresentation";
import type { Hazard } from "../types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ChartDrilldownModal from "./ChartDrilldownModal";
import { createClientLogger } from "../utils/logger";
import { readChartEvent } from "../features/analytics/utils/chartEventAdapter";

const logger = createClientLogger("charts-panel");

type ChartHazard = Hazard & {
  properties?: {
    type?: string;
    severity?: string;
    timestamp?: string;
  };
};

const ChartsPanel: React.FC<{ hazards: ChartHazard[] }> = ({ hazards }) => {
  const [pythonStats, setPythonStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeChart, setActiveChart] = useState<"pie" | "bar" | "line" | "area">("pie");
  const [chartError, setChartError] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 钻取功能状态
  const [isDrilldownOpen, setIsDrilldownOpen] = useState(false);
  const [drilldownData, setDrilldownData] = useState<{
    title: string;
    filteredHazards: ChartHazard[];
    drilldownType: "type" | "severity" | "source" | "date";
    drilldownValue: string;
  } | null>(null);

  const hazardsByType = hazards.reduce(
    (acc, h) => {
      const type = h.type || h.properties?.type || "未分类";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // 为图表准备数据
  const chartData = Object.entries(hazardsByType).map(([name, value]) => ({
    name,
    value,
    count: value,
  }));

  // 时间线数据（按日期统计）
  const timelineData = React.useMemo(() => {
    const dateCount: Record<string, number> = {};
    hazards.forEach((h) => {
      const date = h.properties?.timestamp
        ? new Date(h.properties.timestamp).toLocaleDateString("zh-CN")
        : "未知日期";
      dateCount[date] = (dateCount[date] || 0) + 1;
    });
    return Object.entries(dateCount)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-30) // 最近30天
      .map(([date, count]) => ({ date, count }));
  }, [hazards]);

  // 严重性分布数据
  const severityData = React.useMemo(() => {
    const severityCount: Record<string, number> = {};
    hazards.forEach((h) => {
      const severity = h.properties?.severity || "未知";
      severityCount[severity] = (severityCount[severity] || 0) + 1;
    });
    return Object.entries(severityCount).map(([name, value]) => ({ name, value }));
  }, [hazards]);

  const COLORS = ["#4CAF50", "#FF9800", "#2196F3", "#F44336", "#9C27B0", "#00BCD4", "#FFEB3B"];

  // 处理图表点击事件（钻取功能）
  const handleChartClick = (
    data: unknown,
    drilldownType: "type" | "severity" | "source" | "date",
  ) => {
    logger.debug("chart_clicked", { drilldownType });
    const chartEvent = readChartEvent(data);
    if (chartEvent === null) {
      logger.warn("chart_drilldown_invalid");
      return;
    }

    const value = chartEvent.name;
    let filtered: ChartHazard[] = [];
    let title = "";

    switch (drilldownType) {
      case "type":
        filtered = hazards.filter((h) => {
          const type = h.type || h.properties?.type || "未分类";
          return type === value;
        });
        title = `灾害类型：${value} (${filtered.length}条)`;
        break;
      case "severity":
        filtered = hazards.filter((h) => {
          const severity = h.properties?.severity || "未知";
          return severity === value;
        });
        title = `严重性级别：${value} (${filtered.length}条)`;
        break;
      case "date":
        filtered = hazards.filter((h) => {
          const date = h.properties?.timestamp
            ? new Date(h.properties.timestamp).toLocaleDateString("zh-CN")
            : "未知日期";
          return date === value;
        });
        title = `日期：${value} (${filtered.length}条)`;
        break;
      default:
        filtered = hazards;
        title = `全部数据 (${filtered.length}条)`;
    }

    logger.debug("chart_drilldown_opened", { filteredCount: filtered.length, drilldownType });
    setDrilldownData({
      title,
      filteredHazards: filtered,
      drilldownType,
      drilldownValue: value,
    });
    setIsDrilldownOpen(true);
  };

  const loadPythonStats = useCallback(async () => {
    if (hazards.length === 0) return;

    setLoading(true);
    setChartError("");
    try {
      const result = await getStatistics(hazards.slice(0, 100));
      if (result.success) {
        setPythonStats(result.data);
      } else {
        setChartError("统计数据加载失败");
      }
    } catch {
      logger.error("statistics_load_failed");
      setChartError("加载统计数据时出错");
    } finally {
      setLoading(false);
    }
  }, [hazards]);

  useEffect(() => {
    if (hazards.length > 0) {
      void loadPythonStats();
    }
  }, [hazards.length, loadPythonStats]);

  // 自动刷新功能
  useEffect(() => {
    if (autoRefresh && hazards.length > 0) {
      const interval = setInterval(() => {
        void loadPythonStats();
      }, 30000); // 每30秒刷新一次
      return () => clearInterval(interval);
    }
  }, [autoRefresh, hazards.length, loadPythonStats]);

  return (
    <div style={{ backgroundColor: "#1a1a1a", padding: "20px", borderRadius: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ color: "#4CAF50", margin: 0 }}>📊 4类交互式分析图表</h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {loading && <span style={{ color: "#888", fontSize: "12px" }}>加载中...</span>}
          {chartError && (
            <span style={{ color: "#ff6b6b", fontSize: "12px" }}>⚠️ {chartError}</span>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "#888",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            自动刷新
          </label>
        </div>
      </div>

      {/* 图表切换按钮 */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          onClick={() => setActiveChart("pie")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeChart === "pie" ? "#4CAF50" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          🥧 饼图
        </button>
        <button
          onClick={() => setActiveChart("bar")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeChart === "bar" ? "#FF9800" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          📊 柱状图
        </button>
        <button
          onClick={() => setActiveChart("line")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeChart === "line" ? "#2196F3" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          📈 时间线
        </button>
        <button
          onClick={() => setActiveChart("area")}
          style={{
            padding: "8px 16px",
            backgroundColor: activeChart === "area" ? "#9C27B0" : "#333",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          📉 分布图
        </button>
      </div>

      {/* 图表显示区域 */}
      <div style={{ height: "400px", marginBottom: "20px" }}>
        {activeChart === "pie" && (
          <div>
            <h4 style={{ color: "#4CAF50", fontSize: "14px", marginBottom: "10px" }}>
              🥧 灾害类型分布（饼图）
              <span style={{ color: "#888", fontSize: "12px", marginLeft: "10px" }}>
                💡 点击扇区查看详情
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart
                onClick={() => {
                  logger.debug("pie_chart_clicked");
                }}
              >
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={(data, index) => {
                    logger.debug("pie_segment_clicked", { index });
                    handleChartClick(data, "type");
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {chartData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === "bar" && (
          <div>
            <h4 style={{ color: "#FF9800", fontSize: "14px", marginBottom: "10px" }}>
              📊 灾害类型统计（柱状图）
              <span style={{ color: "#888", fontSize: "12px", marginLeft: "10px" }}>
                💡 点击柱形查看详情
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255, 152, 0, 0.1)" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar
                  dataKey="value"
                  fill="#FF9800"
                  name="数量"
                  onClick={(data, index) => {
                    logger.debug("bar_clicked", { index });
                    handleChartClick(data, "type");
                  }}
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === "line" && (
          <div>
            <h4 style={{ color: "#2196F3", fontSize: "14px", marginBottom: "10px" }}>
              📈 灾害时间趋势（时间线图）
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="date" stroke="#888" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#2196F3"
                  strokeWidth={3}
                  dot={{ fill: "#2196F3", r: 5 }}
                  activeDot={{ r: 8 }}
                  name="灾害数量"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === "area" && (
          <div>
            <h4 style={{ color: "#9C27B0", fontSize: "14px", marginBottom: "10px" }}>
              📉 严重性分布（面积图）
              <span style={{ color: "#888", fontSize: "12px", marginLeft: "10px" }}>
                💡 点击区域查看详情
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#2a2a2a",
                    border: "1px solid #444",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#9C27B0"
                  fill="#9C27B0"
                  fillOpacity={0.6}
                  name="数量"
                  onClick={(data, index) => {
                    logger.debug("area_clicked", { index });
                    handleChartClick(data, "severity");
                  }}
                  cursor="pointer"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 数据统计摘要 */}
      <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #333" }}>
        <h4 style={{ color: "#4CAF50", fontSize: "14px", marginBottom: "12px" }}>
          📈 数据统计摘要
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
            fontSize: "13px",
          }}
        >
          <div
            style={{
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "6px",
              border: "1px solid #4CAF50",
            }}
          >
            <div style={{ color: "#888", fontSize: "11px" }}>总灾害数</div>
            <div style={{ color: "#4CAF50", fontWeight: "bold", fontSize: "20px" }}>
              {hazards.length}
            </div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "6px",
              border: "1px solid #FF9800",
            }}
          >
            <div style={{ color: "#888", fontSize: "11px" }}>灾害类型</div>
            <div style={{ color: "#FF9800", fontWeight: "bold", fontSize: "20px" }}>
              {Object.keys(hazardsByType).length}
            </div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "6px",
              border: "1px solid #2196F3",
            }}
          >
            <div style={{ color: "#888", fontSize: "11px" }}>时间跨度</div>
            <div style={{ color: "#2196F3", fontWeight: "bold", fontSize: "20px" }}>
              {timelineData.length}天
            </div>
          </div>
          <div
            style={{
              padding: "12px",
              backgroundColor: "#2a2a2a",
              borderRadius: "6px",
              border: "1px solid #9C27B0",
            }}
          >
            <div style={{ color: "#888", fontSize: "11px" }}>严重性级别</div>
            <div style={{ color: "#9C27B0", fontWeight: "bold", fontSize: "20px" }}>
              {severityData.length}
            </div>
          </div>
        </div>
      </div>

      {pythonStats && (
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #333" }}>
          <h4 style={{ color: "#4CAF50", fontSize: "14px", marginBottom: "12px" }}>
            🐍 Python 高级统计
          </h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              fontSize: "13px",
            }}
          >
            {pythonStats.descriptiveStatistics.basicStats && (
              <>
                <div style={{ padding: "8px", backgroundColor: "#2a2a2a", borderRadius: "4px" }}>
                  <div style={{ color: "#888" }}>强度平均值（震级）</div>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>
                    {formatAnalyticsNumber(
                      pythonStats.descriptiveStatistics.basicStats.mean.magnitude,
                      2,
                    )}
                  </div>
                </div>
                <div style={{ padding: "8px", backgroundColor: "#2a2a2a", borderRadius: "4px" }}>
                  <div style={{ color: "#888" }}>强度标准差（震级）</div>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>
                    {formatAnalyticsNumber(
                      pythonStats.descriptiveStatistics.basicStats.std.magnitude,
                      2,
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 钻取弹窗 */}
      {isDrilldownOpen && drilldownData ? (
        <>
          <ChartDrilldownModal
            isOpen={isDrilldownOpen}
            onClose={() => {
              logger.debug("chart_drilldown_closed");
              setIsDrilldownOpen(false);
            }}
            title={drilldownData.title}
            filteredHazards={drilldownData.filteredHazards}
            drilldownType={drilldownData.drilldownType}
            drilldownValue={drilldownData.drilldownValue}
          />
        </>
      ) : null}
    </div>
  );
};

export default ChartsPanel;
