/**
 * 提供灾害图表展示与钻取组件。
 */
import React, { useState, useEffect, useCallback } from "react";
import { getStatistics } from "../services/analytics/analyticsService";
import type { StatisticsData } from "../services/analytics/contracts/statistics";
import { formatAnalyticsNumber } from "../services/analytics/analyticsPresentation";
import type { AnalyticsHazard } from "../features/analytics/types";
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
import {
  buildSeverityDistribution,
  buildTimelineData,
  formatHazardDate,
  getHazardSeverity,
} from "../features/analytics/utils/analyticsTransforms";
import { readChartEvent } from "../features/analytics/utils/chartEventAdapter";
import AnalyticsIcon from "../features/analytics/components/AnalyticsIcon";

const logger = createClientLogger("charts-panel");

type ChartHazard = AnalyticsHazard;

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
  const timelineData = React.useMemo(() => buildTimelineData(hazards), [hazards]);

  // 严重性分布数据
  const severityData = React.useMemo(() => buildSeverityDistribution(hazards), [hazards]);

  const COLORS = [
    "var(--analytics-chart-1)",
    "var(--analytics-chart-2)",
    "var(--analytics-chart-3)",
    "var(--analytics-chart-4)",
    "var(--analytics-chart-5)",
    "var(--analytics-chart-6)",
    "var(--analytics-chart-7)",
  ];

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
          const severity = getHazardSeverity(h) || "未知";
          return severity === value;
        });
        title = `严重性级别：${value} (${filtered.length}条)`;
        break;
      case "date":
        filtered = hazards.filter((h) => {
          return formatHazardDate(h) === value;
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
    <div className="analytics-surface--inset" style={{ padding: "20px", borderRadius: "8px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 className="analytics-heading" style={{ margin: 0 }}>
          <AnalyticsIcon name="analysis" size={20} />
          4类交互式分析图表
        </h3>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {loading && (
            <span style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
              加载中...
            </span>
          )}
          {chartError && (
            <span style={{ color: "var(--analytics-state-danger)", fontSize: "12px" }}>
              <AnalyticsIcon name="warning" size={14} /> {chartError}
            </span>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "12px",
              color: "var(--analytics-muted, #888)",
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
          className={`analytics-chart-control${activeChart === "pie" ? " is-active" : ""}`}
          onClick={() => setActiveChart("pie")}
          style={{
            padding: "8px 16px",
            backgroundColor:
              activeChart === "pie"
                ? "rgba(56, 189, 248, 0.16)"
                : "var(--analytics-surface-inset, #0a0a0a)",
            color:
              activeChart === "pie"
                ? "var(--analytics-text, #e8f3ff)"
                : "var(--analytics-muted, #91b8d1)",
            border: `1px solid ${activeChart === "pie" ? "var(--analytics-accent, #67e8f9)" : "var(--analytics-border-soft, rgba(148, 193, 225, 0.13))"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          <AnalyticsIcon name="chart" size={16} />
          饼图
        </button>
        <button
          className={`analytics-chart-control${activeChart === "bar" ? " is-active" : ""}`}
          onClick={() => setActiveChart("bar")}
          style={{
            padding: "8px 16px",
            backgroundColor:
              activeChart === "bar"
                ? "rgba(56, 189, 248, 0.16)"
                : "var(--analytics-surface-inset, #0a0a0a)",
            color:
              activeChart === "bar"
                ? "var(--analytics-text, #e8f3ff)"
                : "var(--analytics-muted, #91b8d1)",
            border: `1px solid ${activeChart === "bar" ? "var(--analytics-accent, #67e8f9)" : "var(--analytics-border-soft, rgba(148, 193, 225, 0.13))"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          <AnalyticsIcon name="analysis" size={16} />
          柱状图
        </button>
        <button
          className={`analytics-chart-control${activeChart === "line" ? " is-active" : ""}`}
          onClick={() => setActiveChart("line")}
          style={{
            padding: "8px 16px",
            backgroundColor:
              activeChart === "line"
                ? "rgba(56, 189, 248, 0.16)"
                : "var(--analytics-surface-inset, #0a0a0a)",
            color:
              activeChart === "line"
                ? "var(--analytics-text, #e8f3ff)"
                : "var(--analytics-muted, #91b8d1)",
            border: `1px solid ${activeChart === "line" ? "var(--analytics-accent, #67e8f9)" : "var(--analytics-border-soft, rgba(148, 193, 225, 0.13))"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          <AnalyticsIcon name="trend" size={16} />
          时间线
        </button>
        <button
          className={`analytics-chart-control${activeChart === "area" ? " is-active" : ""}`}
          onClick={() => setActiveChart("area")}
          style={{
            padding: "8px 16px",
            backgroundColor:
              activeChart === "area"
                ? "rgba(56, 189, 248, 0.16)"
                : "var(--analytics-surface-inset, #0a0a0a)",
            color:
              activeChart === "area"
                ? "var(--analytics-text, #e8f3ff)"
                : "var(--analytics-muted, #91b8d1)",
            border: `1px solid ${activeChart === "area" ? "var(--analytics-accent, #67e8f9)" : "var(--analytics-border-soft, rgba(148, 193, 225, 0.13))"}`,
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "bold",
            transition: "all 0.3s",
          }}
        >
          <AnalyticsIcon name="chart" size={16} />
          分布图
        </button>
      </div>

      {/* 图表显示区域 */}
      <div style={{ height: "400px", marginBottom: "20px" }}>
        {activeChart === "pie" && (
          <div>
            <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "10px" }}>
              <AnalyticsIcon name="chart" size={16} />
              灾害类型分布（饼图）
              <span
                style={{
                  color: "var(--analytics-muted, #888)",
                  fontSize: "12px",
                  marginLeft: "10px",
                }}
              >
                <AnalyticsIcon name="info" size={14} /> 点击扇区查看详情
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
                  fill="var(--analytics-chart-1)"
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
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    border: "1px solid var(--analytics-border-soft, #444)",
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
            <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "10px" }}>
              <AnalyticsIcon name="analysis" size={16} />
              灾害类型统计（柱状图）
              <span
                style={{
                  color: "var(--analytics-muted, #888)",
                  fontSize: "12px",
                  marginLeft: "10px",
                }}
              >
                <AnalyticsIcon name="info" size={14} /> 点击柱形查看详情
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--analytics-border-soft, #444)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--analytics-muted, #91b8d1)"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="var(--analytics-muted, #91b8d1)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    border: "1px solid var(--analytics-border-soft, #444)",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                  cursor={{ fill: "rgba(255, 152, 0, 0.1)" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar
                  dataKey="value"
                  fill="var(--analytics-accent, #67e8f9)"
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
            <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "10px" }}>
              <AnalyticsIcon name="trend" size={16} />
              灾害时间趋势（时间线图）
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--analytics-border-soft, #444)" />
                <XAxis
                  dataKey="date"
                  stroke="var(--analytics-muted, #91b8d1)"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="var(--analytics-muted, #91b8d1)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    border: "1px solid var(--analytics-border-soft, #444)",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--analytics-accent, #67e8f9)"
                  strokeWidth={3}
                  dot={{ fill: "var(--analytics-accent, #67e8f9)", r: 5 }}
                  activeDot={{ r: 8 }}
                  name="灾害数量"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === "area" && (
          <div>
            <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "10px" }}>
              <AnalyticsIcon name="chart" size={16} />
              严重性分布（面积图）
              <span
                style={{
                  color: "var(--analytics-muted, #888)",
                  fontSize: "12px",
                  marginLeft: "10px",
                }}
              >
                <AnalyticsIcon name="info" size={14} /> 点击区域查看详情
              </span>
            </h4>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--analytics-border-soft, #444)" />
                <XAxis dataKey="name" stroke="var(--analytics-muted, #91b8d1)" />
                <YAxis stroke="var(--analytics-muted, #91b8d1)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    border: "1px solid var(--analytics-border-soft, #444)",
                    borderRadius: "6px",
                  }}
                  itemStyle={{ color: "#fff" }}
                />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--analytics-accent, #67e8f9)"
                  fill="var(--analytics-accent, #67e8f9)"
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
      <div
        style={{
          marginTop: "20px",
          paddingTop: "20px",
          borderTop: "1px solid var(--analytics-border-soft, #333)",
        }}
      >
        <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "12px" }}>
          <AnalyticsIcon name="analysis" size={16} />
          数据统计摘要
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
            className="analytics-chart-summary-card analytics-surface--inset"
            style={{
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>总灾害数</div>
            <div
              className="analytics-chart-summary-value"
              style={{ fontWeight: "bold", fontSize: "20px" }}
            >
              {hazards.length}
            </div>
          </div>
          <div
            className="analytics-chart-summary-card analytics-surface--inset"
            style={{
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>灾害类型</div>
            <div
              className="analytics-chart-summary-value"
              style={{ fontWeight: "bold", fontSize: "20px" }}
            >
              {Object.keys(hazardsByType).length}
            </div>
          </div>
          <div
            className="analytics-chart-summary-card analytics-surface--inset"
            style={{
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>时间跨度</div>
            <div
              className="analytics-chart-summary-value"
              style={{ fontWeight: "bold", fontSize: "20px" }}
            >
              {timelineData.length}天
            </div>
          </div>
          <div
            className="analytics-chart-summary-card analytics-surface--inset"
            style={{
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "11px" }}>
              严重性级别
            </div>
            <div
              className="analytics-chart-summary-value"
              style={{ fontWeight: "bold", fontSize: "20px" }}
            >
              {severityData.length}
            </div>
          </div>
        </div>
      </div>

      {pythonStats && (
        <div
          style={{
            marginTop: "20px",
            paddingTop: "20px",
            borderTop: "1px solid var(--analytics-border-soft, #333)",
          }}
        >
          <h4 className="analytics-heading" style={{ fontSize: "14px", marginBottom: "12px" }}>
            <AnalyticsIcon name="analysis" size={16} />
            Python 高级统计
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
                <div
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ color: "var(--analytics-muted, #888)" }}>强度平均值（震级）</div>
                  <div style={{ color: "#fff", fontWeight: "bold" }}>
                    {formatAnalyticsNumber(
                      pythonStats.descriptiveStatistics.basicStats.mean.magnitude,
                      2,
                    )}
                  </div>
                </div>
                <div
                  style={{
                    padding: "8px",
                    backgroundColor: "var(--analytics-surface-inset, #2a2a2a)",
                    borderRadius: "4px",
                  }}
                >
                  <div style={{ color: "var(--analytics-muted, #888)" }}>强度标准差（震级）</div>
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
