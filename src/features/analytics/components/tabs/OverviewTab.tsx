/**
 * 提供分析概览标签页内容组件。
 */
import { toOverviewStatistics } from "../../utils/analyticsViewModels";
import { formatAnalyticsNumber } from "../../../../services/analytics/analyticsPresentation";
import { LineChart } from "../../../../components/DataVisualization";
import type {
  AnalyticsHazard,
  StatisticsResponse,
  CorrelationValue,
  PivotRiskScoresData,
  PivotTrendsData,
} from "../../types";
import type { PivotRow } from "../../../../services/analytics/contracts/pivot";
import type { IntensitySeriesPoint } from "../../utils/analyticsTransforms";
import AnalyticsIcon from "../AnalyticsIcon";

interface OverviewTabProps {
  hazards: AnalyticsHazard[];
  hazardsByType: Record<string, number>;
  intensityData: IntensitySeriesPoint[];
  statistics: StatisticsResponse;
  pivot4DTrends: PivotTrendsData | null;
  pivot4DRiskScores: PivotRiskScoresData | null;
}

function readPivotString(row: PivotRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : null;
}

function readPivotNumber(row: PivotRow, key: string): number | null {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

export default function OverviewTab({
  hazards,
  hazardsByType,
  intensityData,
  statistics: response,
  pivot4DTrends,
  pivot4DRiskScores,
}: OverviewTabProps) {
  const statistics = { data: toOverviewStatistics(response.data) };
  return (
    <div
      className="analytics-surface analytics-tab-panel"
      style={{
        padding: "24px",
        borderRadius: "12px",
        marginTop: "20px",
      }}
    >
      <h3
        className="analytics-heading"
        style={{
          marginBottom: "24px",
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        <AnalyticsIcon name="analysis" size={20} />
        描述性统计分析
      </h3>

      {/* 折线图展示 */}
      <div style={{ marginBottom: "30px" }}>
        <LineChart
          data={intensityData}
          title="灾害强度趋势分析（有效强度数据）"
          color="var(--analytics-accent, #67e8f9)"
          xLabel="数据编号"
          yLabel="灾害强度"
          showDots={true}
          height={280}
        />
        <div style={{ marginTop: "8px", color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
          有效强度数据：{intensityData.length} / {hazards.length}
        </div>
      </div>

      {/* 基础统计 */}
      <div style={{ marginBottom: "30px" }}>
        <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
          <AnalyticsIcon name="analysis" />
          基本数据统计
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>数据总量</div>
            <div
              style={{
                color: "var(--analytics-state-normal, #67e8f9)",
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "5px",
              }}
            >
              {hazards.length} 条
            </div>
          </div>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>灾害类型</div>
            <div
              style={{
                color: "var(--analytics-state-normal, #67e8f9)",
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "5px",
              }}
            >
              {Object.keys(hazardsByType).length} 种
            </div>
          </div>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
              最常见灾害
            </div>
            <div
              style={{
                color: "var(--analytics-state-normal, #67e8f9)",
                fontSize: "20px",
                fontWeight: "bold",
                marginTop: "5px",
              }}
            >
              {Object.entries(hazardsByType).sort((a, b) => b[1] - a[1])[0]?.[0] || "暂无"}
            </div>
          </div>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "15px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
              数据覆盖度
            </div>
            <div
              style={{
                color: "var(--analytics-state-normal, #67e8f9)",
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "5px",
              }}
            >
              {hazards.length > 0 ? "100%" : "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* 数据可靠性分析 */}
      <div style={{ marginBottom: "30px", color: "#fff" }}>
        <div>强度平均值（震级）：{formatAnalyticsNumber(statistics.data.magnitudeMean, 2)}</div>
        <div>
          强度标准差（震级）：
          {formatAnalyticsNumber(statistics.data.magnitudeStandardDeviation, 2)}
        </div>
      </div>
      {statistics.data.inferentialStatistics?.confidenceIntervals && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            数据可信度分析
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div
              style={{
                marginBottom: "10px",
                color: "var(--analytics-state-normal, #67e8f9)",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              ✓ 可信度: 95%（非常可靠）
            </div>
            {statistics.data.inferentialStatistics.confidenceIntervals.magnitude && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                }}
              >
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    当前平均值
                  </div>
                  <div style={{ color: "#fff", fontSize: "20px", fontWeight: "bold" }}>
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude.mean,
                      2,
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    预计最低值
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-state-warning, #fbbf24)",
                      fontSize: "20px",
                      fontWeight: "bold",
                    }}
                  >
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude
                        .lowerBound,
                      2,
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    预计最高值
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-state-normal, #67e8f9)",
                      fontSize: "20px",
                      fontWeight: "bold",
                    }}
                  >
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude
                        .upperBound,
                      2,
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    上下浮动
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-chart-2)",
                      fontSize: "20px",
                      fontWeight: "bold",
                    }}
                  >
                    ±
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude
                        .marginOfError,
                      2,
                    )}
                  </div>
                </div>
              </div>
            )}
            {statistics.data.inferentialStatistics.confidenceIntervals.magnitude?.lowerBound !=
              null &&
              statistics.data.inferentialStatistics.confidenceIntervals.magnitude?.upperBound !=
                null && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px",
                    backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                    borderRadius: "6px",
                    fontSize: "12px",
                    color: "var(--analytics-muted, #aaa)",
                    lineHeight: "1.6",
                  }}
                >
                  <AnalyticsIcon name="info" size={14} /> 根据当前数据分析，未来灾害强度大概率会在{" "}
                  <span
                    style={{ color: "var(--analytics-state-warning, #fbbf24)", fontWeight: "bold" }}
                  >
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude
                        .lowerBound,
                      2,
                    )}
                  </span>{" "}
                  到{" "}
                  <span
                    style={{ color: "var(--analytics-state-normal, #67e8f9)", fontWeight: "bold" }}
                  >
                    {formatAnalyticsNumber(
                      statistics.data.inferentialStatistics.confidenceIntervals.magnitude
                        .upperBound,
                      2,
                    )}
                  </span>{" "}
                  之间波动
                </div>
              )}
          </div>
        </div>
      )}

      {/* 数据分散程度 */}
      {statistics.data.descriptiveStatistics?.variabilityMeasures && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="ruler" />
            数据稳定性分析
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  平均波动幅度
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-normal, #67e8f9)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.variabilityMeasures.standardDeviation !=
                  null ? (
                    formatAnalyticsNumber(
                      statistics.data.descriptiveStatistics.variabilityMeasures.standardDeviation,
                      2,
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "10px",
                    marginTop: "3px",
                  }}
                >
                  值越小越稳定
                </div>
              </div>
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  最大最小差距
                </div>
                <div
                  style={{
                    color: "var(--analytics-chart-4)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.variabilityMeasures.range != null ? (
                    formatAnalyticsNumber(
                      statistics.data.descriptiveStatistics.variabilityMeasures.range,
                      2,
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "10px",
                    marginTop: "3px",
                  }}
                >
                  数据跨度范围
                </div>
              </div>
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  数据集中度
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-warning, #fbbf24)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.variabilityMeasures
                    .coefficientOfVariation != null ? (
                    statistics.data.descriptiveStatistics.variabilityMeasures
                      .coefficientOfVariation *
                      100 <
                    15 ? (
                      "✓ 集中"
                    ) : statistics.data.descriptiveStatistics.variabilityMeasures
                        .coefficientOfVariation *
                        100 <
                      30 ? (
                      "⊙ 均匀"
                    ) : (
                      "⊗ 分散"
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "10px",
                    marginTop: "3px",
                  }}
                >
                  整体分布状态
                </div>
              </div>
            </div>
            {statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation !=
              null && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "12px",
                  backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--analytics-muted, #aaa)",
                  lineHeight: "1.6",
                }}
              >
                <AnalyticsIcon name="info" size={14} />{" "}
                {statistics.data.descriptiveStatistics.variabilityMeasures.coefficientOfVariation *
                  100 <
                15
                  ? "灾害强度比较稳定，大多数数值接近平均水平"
                  : statistics.data.descriptiveStatistics.variabilityMeasures
                        .coefficientOfVariation *
                        100 <
                      30
                    ? "灾害强度分布均匀，高低强度灾害都有出现"
                    : "灾害强度变化较大，从低到高差异明显"}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 数据分布情况 */}
      {statistics.data.descriptiveStatistics?.distributionMetrics && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            数据分布特征
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
              }}
            >
              <div>
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginBottom: "5px",
                  }}
                >
                  分布均衡性
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-normal, #67e8f9)",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.distributionMetrics.skewness !==
                    undefined &&
                  statistics.data.descriptiveStatistics.distributionMetrics.skewness !== null ? (
                    Math.abs(statistics.data.descriptiveStatistics.distributionMetrics.skewness) <
                    0.5 ? (
                      "✓ 均衡"
                    ) : statistics.data.descriptiveStatistics.distributionMetrics.skewness > 0 ? (
                      "⬆ 偏高"
                    ) : (
                      "⬇ 偏低"
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "11px",
                    marginTop: "3px",
                  }}
                >
                  {statistics.data.descriptiveStatistics.distributionMetrics.skewness !==
                    undefined &&
                  statistics.data.descriptiveStatistics.distributionMetrics.skewness !== null
                    ? Math.abs(statistics.data.descriptiveStatistics.distributionMetrics.skewness) <
                      0.5
                      ? "高低值分布均匀"
                      : statistics.data.descriptiveStatistics.distributionMetrics.skewness > 0
                        ? "高强度灾害较多"
                        : "低强度灾害较多"
                    : "需要更多数据"}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginBottom: "5px",
                  }}
                >
                  中位数（中间值）
                </div>
                <div
                  style={{
                    color: "var(--analytics-chart-2)",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.distributionMetrics.q50 != null ? (
                    formatAnalyticsNumber(
                      statistics.data.descriptiveStatistics.distributionMetrics.q50,
                      2,
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "11px",
                    marginTop: "3px",
                  }}
                >
                  一半数据在此值之上
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "var(--analytics-muted, #888)",
                    fontSize: "12px",
                    marginBottom: "5px",
                  }}
                >
                  主要数据范围
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-warning, #fbbf24)",
                    fontSize: "18px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.descriptiveStatistics.distributionMetrics.iqr != null ? (
                    formatAnalyticsNumber(
                      statistics.data.descriptiveStatistics.distributionMetrics.iqr,
                      2,
                    )
                  ) : (
                    <span style={{ fontSize: "14px", color: "var(--analytics-muted, #666)" }}>
                      暂无数据
                    </span>
                  )}
                </div>
                <div
                  style={{
                    color: "var(--analytics-muted, #666)",
                    fontSize: "11px",
                    marginTop: "3px",
                  }}
                >
                  中间50%数据的跨度
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 异常数据识别 */}
      {statistics.data.anomalyDetection?.anomalyStatistics && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            异常数据检测
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "15px",
              }}
            >
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  数据总量
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-normal, #67e8f9)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.anomalyDetection.anomalyStatistics.totalRecords} 条
                </div>
              </div>
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  异常数据
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-warning, #fbbf24)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.anomalyDetection.anomalyStatistics.iqrOutliers} 条
                </div>
              </div>
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  严重异常
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-danger, #fb7185)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {statistics.data.anomalyDetection.anomalyStatistics.zscoreOutliers} 条
                </div>
              </div>
              <div>
                <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                  数据质量
                </div>
                <div
                  style={{
                    color: "var(--analytics-state-normal, #67e8f9)",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  {formatAnalyticsNumber(
                    statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore,
                    1,
                  )}
                  %
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: "15px",
                padding: "12px",
                backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--analytics-muted, #aaa)",
              }}
            >
              <AnalyticsIcon name="info" size={14} /> 异常数据占比{" "}
              {(
                (statistics.data.anomalyDetection.anomalyStatistics.zscoreOutliers /
                  statistics.data.anomalyDetection.anomalyStatistics.totalRecords) *
                100
              ).toFixed(2)}
              %， 数据质量
              {statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore > 90
                ? "优秀"
                : statistics.data.anomalyDetection.anomalyStatistics.dataQualityScore > 70
                  ? "良好"
                  : "一般"}
            </div>
          </div>
        </div>
      )}

      {/* 灾害分类统计 */}
      {statistics.data.descriptiveStatistics?.typeDistribution && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            灾害分类统计
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div style={{ marginBottom: "15px" }}>
              <div
                style={{
                  color: "var(--analytics-state-warning, #fbbf24)",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                最常见类型: {statistics.data.descriptiveStatistics.typeDistribution.mostCommon}
              </div>
            </div>

            {/* 类型计数 */}
            <div style={{ marginTop: "15px" }}>
              <div
                style={{
                  color: "var(--analytics-muted, #888)",
                  fontSize: "12px",
                  marginBottom: "10px",
                }}
              >
                按类型统计:
              </div>
              {Object.entries(statistics.data.descriptiveStatistics.typeDistribution.counts).map(
                ([type, count]: [string, number]) => (
                  <div
                    key={type}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px",
                      backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                      borderRadius: "4px",
                      marginBottom: "5px",
                    }}
                  >
                    <span style={{ color: "#fff" }}>{type}</span>
                    <span
                      style={{
                        color: "var(--analytics-state-normal, #67e8f9)",
                        fontWeight: "bold",
                      }}
                    >
                      {count} 条
                    </span>
                  </div>
                ),
              )}
            </div>

            {/* 百分比分布 */}
            <div style={{ marginTop: "15px" }}>
              <div
                style={{
                  color: "var(--analytics-muted, #888)",
                  fontSize: "12px",
                  marginBottom: "10px",
                }}
              >
                占比分布:
              </div>
              {Object.entries(
                statistics.data.descriptiveStatistics.typeDistribution.percentages,
              ).map(([type, percentage]: [string, number]) => (
                <div key={type} style={{ marginBottom: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "3px",
                    }}
                  >
                    <span style={{ color: "#fff", fontSize: "12px" }}>{type}</span>
                    <span
                      style={{
                        color: "var(--analytics-state-normal, #67e8f9)",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "6px",
                      backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        backgroundColor: "var(--analytics-state-normal, #67e8f9)",
                        borderRadius: "3px",
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* 4维透视表数据可视化 - 增强版 */}
            {(statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot ||
              pivot4DTrends ||
              pivot4DRiskScores) && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                  borderRadius: "8px",
                }}
              >
                <div
                  style={{
                    color: "var(--analytics-chart-2)",
                    fontSize: "13px",
                    fontWeight: "bold",
                    marginBottom: "15px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <AnalyticsIcon name="analysis" />
                  4维透视表分析
                  {(pivot4DTrends || pivot4DRiskScores) && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        backgroundColor: "var(--analytics-state-normal, #67e8f9)",
                        borderRadius: "10px",
                        color: "#000",
                      }}
                    >
                      增强版
                    </span>
                  )}
                </div>

                {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot && (
                  <>
                    {/* 基础维度统计 */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                          borderRadius: "8px",
                          border: "1px solid var(--analytics-border-soft, #333)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--analytics-muted, #888)",
                            fontSize: "10px",
                            marginBottom: "5px",
                          }}
                        >
                          时间维度
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-state-normal, #67e8f9)",
                            fontSize: "28px",
                            fontWeight: "bold",
                          }}
                        >
                          {
                            Object.keys(
                              statistics.data.descriptiveStatistics.typeDistribution
                                .fourDimensionalPivot.timeDimension || {},
                            ).length
                          }
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-muted, #666)",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          个时间段
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                          borderRadius: "8px",
                          border: "1px solid var(--analytics-border-soft, #333)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--analytics-muted, #888)",
                            fontSize: "10px",
                            marginBottom: "5px",
                          }}
                        >
                          地理维度
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-chart-2)",
                            fontSize: "28px",
                            fontWeight: "bold",
                          }}
                        >
                          {
                            Object.keys(
                              statistics.data.descriptiveStatistics.typeDistribution
                                .fourDimensionalPivot.geoDimension || {},
                            ).length
                          }
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-muted, #666)",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          个区域
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                          borderRadius: "8px",
                          border: "1px solid var(--analytics-border-soft, #333)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--analytics-muted, #888)",
                            fontSize: "10px",
                            marginBottom: "5px",
                          }}
                        >
                          类型维度
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-accent)",
                            fontSize: "28px",
                            fontWeight: "bold",
                          }}
                        >
                          {
                            Object.keys(
                              statistics.data.descriptiveStatistics.typeDistribution
                                .fourDimensionalPivot.typeDimension || {},
                            ).length
                          }
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-muted, #666)",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          种灾害
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                          borderRadius: "8px",
                          border: "1px solid var(--analytics-border-soft, #333)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--analytics-muted, #888)",
                            fontSize: "10px",
                            marginBottom: "5px",
                          }}
                        >
                          严重性维度
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-chart-4)",
                            fontSize: "28px",
                            fontWeight: "bold",
                          }}
                        >
                          {
                            Object.keys(
                              statistics.data.descriptiveStatistics.typeDistribution
                                .fourDimensionalPivot.severityDimension || {},
                            ).length
                          }
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-muted, #666)",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          个等级
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "15px",
                          backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                          borderRadius: "8px",
                          border: "1px solid var(--analytics-border-soft, #333)",
                          textAlign: "center",
                        }}
                      >
                        <div
                          style={{
                            color: "var(--analytics-muted, #888)",
                            fontSize: "10px",
                            marginBottom: "5px",
                          }}
                        >
                          交叉分析
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-chart-1)",
                            fontSize: "28px",
                            fontWeight: "bold",
                          }}
                        >
                          {
                            Object.keys(
                              statistics.data.descriptiveStatistics.typeDistribution
                                .fourDimensionalPivot.crossAnalysis || {},
                            ).length
                          }
                        </div>
                        <div
                          style={{
                            color: "var(--analytics-muted, #666)",
                            fontSize: "10px",
                            marginTop: "3px",
                          }}
                        >
                          组关联
                        </div>
                      </div>
                    </div>

                    {/* 详细数据展示 */}
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "15px",
                        backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                        borderRadius: "8px",
                        border: "1px solid var(--analytics-border-soft, #333)",
                      }}
                    >
                      <div
                        style={{
                          color: "var(--analytics-chart-2)",
                          fontSize: "12px",
                          fontWeight: "bold",
                          marginBottom: "15px",
                        }}
                      >
                        <AnalyticsIcon name="analysis" size={16} />
                        多维数据透视详情
                      </div>

                      {/* 时间维度数据 */}
                      {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot
                        .timeDimension &&
                        Object.keys(
                          statistics.data.descriptiveStatistics.typeDistribution
                            .fourDimensionalPivot.timeDimension,
                        ).length > 0 && (
                          <div style={{ marginBottom: "12px" }}>
                            <div
                              style={{
                                color: "var(--analytics-state-normal, #67e8f9)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              <AnalyticsIcon name="clock" size={14} /> 时间维度分布:
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Object.entries(
                                statistics.data.descriptiveStatistics.typeDistribution
                                  .fourDimensionalPivot.timeDimension,
                              )
                                .slice(0, 10)
                                .map(([key, value]: [string, number]) => (
                                  <div
                                    key={key}
                                    style={{
                                      padding: "6px 10px",
                                      backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                      borderRadius: "4px",
                                      fontSize: "9px",
                                      border: "1px solid var(--analytics-border-soft, #333)",
                                    }}
                                  >
                                    <span style={{ color: "var(--analytics-muted, #888)" }}>
                                      {key.split("_")[0]}
                                    </span>{" "}
                                    <span
                                      style={{ color: "var(--analytics-state-normal, #67e8f9)" }}
                                    >
                                      {key.split("_")[1]}
                                    </span>
                                    :{" "}
                                    <span style={{ color: "#fff", fontWeight: "bold" }}>
                                      {value}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* 地理维度数据 */}
                      {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot
                        .geoDimension &&
                        Object.keys(
                          statistics.data.descriptiveStatistics.typeDistribution
                            .fourDimensionalPivot.geoDimension,
                        ).length > 0 && (
                          <div style={{ marginBottom: "12px" }}>
                            <div
                              style={{
                                color: "var(--analytics-chart-2)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              <AnalyticsIcon name="map" size={14} /> 地理维度分布:
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Object.entries(
                                statistics.data.descriptiveStatistics.typeDistribution
                                  .fourDimensionalPivot.geoDimension,
                              )
                                .slice(0, 10)
                                .map(([key, value]: [string, number]) => (
                                  <div
                                    key={key}
                                    style={{
                                      padding: "6px 10px",
                                      backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                      borderRadius: "4px",
                                      fontSize: "9px",
                                      border: "1px solid var(--analytics-border-soft, #333)",
                                    }}
                                  >
                                    <span style={{ color: "var(--analytics-muted, #888)" }}>
                                      {key.split("_")[0]}
                                    </span>{" "}
                                    <span style={{ color: "var(--analytics-chart-2)" }}>
                                      {key.split("_")[1]}
                                    </span>
                                    :{" "}
                                    <span style={{ color: "#fff", fontWeight: "bold" }}>
                                      {value}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* 严重性维度数据 */}
                      {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot
                        .severityDimension &&
                        Object.keys(
                          statistics.data.descriptiveStatistics.typeDistribution
                            .fourDimensionalPivot.severityDimension,
                        ).length > 0 && (
                          <div style={{ marginBottom: "12px" }}>
                            <div
                              style={{
                                color: "var(--analytics-chart-4)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              <AnalyticsIcon name="warning" size={14} /> 严重性维度分布:
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Object.entries(
                                statistics.data.descriptiveStatistics.typeDistribution
                                  .fourDimensionalPivot.severityDimension,
                              ).map(([key, value]: [string, number]) => (
                                <div
                                  key={key}
                                  style={{
                                    padding: "6px 10px",
                                    backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    border: "1px solid var(--analytics-border-soft, #333)",
                                  }}
                                >
                                  <span style={{ color: "var(--analytics-muted, #888)" }}>
                                    {key.split("_")[0]}
                                  </span>{" "}
                                  <span style={{ color: "var(--analytics-chart-4)" }}>
                                    {key.split("_")[1]}
                                  </span>
                                  :{" "}
                                  <span style={{ color: "#fff", fontWeight: "bold" }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* 交叉分析数据 */}
                      {statistics.data.descriptiveStatistics.typeDistribution.fourDimensionalPivot
                        .crossAnalysis &&
                        Object.keys(
                          statistics.data.descriptiveStatistics.typeDistribution
                            .fourDimensionalPivot.crossAnalysis,
                        ).length > 0 && (
                          <div>
                            <div
                              style={{
                                color: "var(--analytics-chart-1)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                marginBottom: "8px",
                              }}
                            >
                              <AnalyticsIcon name="analysis" size={14} /> 交叉关联分析:
                            </div>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Object.entries(
                                statistics.data.descriptiveStatistics.typeDistribution
                                  .fourDimensionalPivot.crossAnalysis,
                              ).map(([key, value]: [string, number]) => (
                                <div
                                  key={key}
                                  style={{
                                    padding: "6px 10px",
                                    backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                    borderRadius: "4px",
                                    fontSize: "9px",
                                    border: "1px solid var(--analytics-border-soft, #333)",
                                  }}
                                >
                                  <span style={{ color: "var(--analytics-chart-1)" }}>{key}</span>:{" "}
                                  <span style={{ color: "#fff", fontWeight: "bold" }}>{value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </>
                )}

                {/* 趋势分析图表 */}
                {pivot4DTrends && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "15px",
                      backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                      borderRadius: "8px",
                      border: "1px solid var(--analytics-border-soft, #333)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--analytics-state-normal, #67e8f9)",
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginBottom: "10px",
                      }}
                    >
                      <AnalyticsIcon name="trend" size={16} />
                      多维趋势分析（过去7天）
                    </div>
                    {pivot4DTrends.kind === "empty" ? (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--analytics-muted, #888)",
                          fontStyle: "italic",
                        }}
                      >
                        {pivot4DTrends.message}
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--analytics-muted, #aaa)",
                            marginBottom: "10px",
                          }}
                        >
                          总组合: {pivot4DTrends.statistics.total_combinations ?? 0} | 上升:{" "}
                          <span style={{ color: "var(--analytics-state-warning, #fbbf24)" }}>
                            {pivot4DTrends.statistics.increasing ?? 0}
                          </span>{" "}
                          | 平稳:{" "}
                          <span style={{ color: "var(--analytics-state-warning, #fbbf24)" }}>
                            {pivot4DTrends.statistics.stable ?? 0}
                          </span>{" "}
                          | 下降:{" "}
                          <span style={{ color: "var(--analytics-state-normal, #67e8f9)" }}>
                            {pivot4DTrends.statistics.decreasing ?? 0}
                          </span>
                        </div>
                        {pivot4DTrends.high_risk_trends.length > 0 && (
                          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {pivot4DTrends.high_risk_trends.slice(0, 5).map((trend, idx) => {
                              const region = readPivotString(trend, "region") ?? "未知";
                              const type = readPivotString(trend, "type") ?? "未知";
                              const slope = readPivotNumber(trend, "trend_slope") ?? 0;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    padding: "8px 12px",
                                    backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                    borderRadius: "6px",
                                    fontSize: "10px",
                                    border: "1px solid var(--analytics-border-soft, #333)",
                                  }}
                                >
                                  <span style={{ color: "var(--analytics-muted, #888)" }}>
                                    {region} - {type}:
                                  </span>{" "}
                                  <span
                                    style={{ color: "var(--analytics-state-warning, #fbbf24)" }}
                                  >
                                    ↗ 斜率 {slope.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* 风险评分热力图 */}
                {pivot4DRiskScores && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "15px",
                      backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                      borderRadius: "8px",
                      border: "1px solid var(--analytics-border-soft, #333)",
                    }}
                  >
                    <div
                      style={{
                        color: "var(--analytics-state-warning, #fbbf24)",
                        fontSize: "12px",
                        fontWeight: "bold",
                        marginBottom: "10px",
                      }}
                    >
                      <AnalyticsIcon name="warning" size={16} />
                      多维风险评分（Top 8）
                    </div>
                    {pivot4DRiskScores.kind === "empty" ? (
                      <div
                        style={{
                          fontSize: "10px",
                          color: "var(--analytics-muted, #888)",
                          fontStyle: "italic",
                        }}
                      >
                        {pivot4DRiskScores.message}
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                            gap: "8px",
                          }}
                        >
                          {pivot4DRiskScores.top_10_risks.slice(0, 8).map((item, idx) => {
                            const score = readPivotNumber(item, "risk_score") ?? 0;
                            const riskLevel = score > 2 ? "high" : score > 1 ? "medium" : "low";
                            const color =
                              riskLevel === "high"
                                ? "var(--analytics-state-warning, #fbbf24)"
                                : riskLevel === "medium"
                                  ? "var(--analytics-chart-2)"
                                  : "var(--analytics-state-normal, #67e8f9)";
                            const region = readPivotString(item, "region") ?? "未知";
                            const type = readPivotString(item, "type") ?? "未知";
                            const totalEvents = readPivotNumber(item, "total_events") ?? 0;
                            const label = `${region}-${type}`;

                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: "10px",
                                  backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                                  borderRadius: "6px",
                                  border: `2px solid ${color}`,
                                  textAlign: "center",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "9px",
                                    color: "var(--analytics-muted, #888)",
                                    marginBottom: "5px",
                                  }}
                                >
                                  {label.length > 15 ? label.substring(0, 15) + "..." : label}
                                </div>
                                <div style={{ fontSize: "20px", fontWeight: "bold", color }}>
                                  {score.toFixed(1)}
                                </div>
                                <div
                                  style={{
                                    fontSize: "8px",
                                    color: "var(--analytics-muted, #666)",
                                    marginTop: "3px",
                                  }}
                                >
                                  事件: {totalEvents}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                            borderRadius: "6px",
                            fontSize: "10px",
                          }}
                        >
                          <span
                            style={{
                              color: "var(--analytics-state-warning, #fbbf24)",
                              fontWeight: "bold",
                            }}
                          >
                            <AnalyticsIcon name="warning" size={14} /> 统计:
                          </span>{" "}
                          <span style={{ color: "var(--analytics-muted, #aaa)" }}>
                            最高风险 {(pivot4DRiskScores.statistics.max_risk_score ?? 0).toFixed(2)}{" "}
                            | 平均风险{" "}
                            {(pivot4DRiskScores.statistics.avg_risk_score ?? 0).toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 因素关联度分析 - 帮助用户发现哪些因素相互影响 */}
      {statistics.data.correlationAnalysis && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="analysis" />
            影响因素关联分析
          </h4>
          <div
            style={{
              backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid var(--analytics-border-soft, #333)",
            }}
          >
            <div
              style={{
                marginBottom: "15px",
                padding: "10px",
                backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--analytics-muted, #aaa)",
                lineHeight: "1.6",
              }}
            >
              <AnalyticsIcon name="info" size={14} />{" "}
              分析不同因素之间的关联程度，数值越接近1表示关联越强，越接近0表示关联越弱
            </div>

            {/* 直接关联性分析 */}
            {statistics.data.correlationAnalysis.pearsonCorrelation && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    color: "var(--analytics-chart-2)",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  <AnalyticsIcon name="chart" size={16} />
                  线性关联（直接关系）
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--analytics-surface-inset, #0a0a0a)" }}>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "left",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          数据指标
                        </th>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          与灾害强度
                        </th>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          与影响人口
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(statistics.data.correlationAnalysis.pearsonCorrelation)
                        .length > 0 ? (
                        Object.entries(statistics.data.correlationAnalysis.pearsonCorrelation).map(
                          ([key, values]: [string, CorrelationValue]) => {
                            // 将英文字段名转换为中文
                            const getChineseLabel = (engKey: string) => {
                              const labelMap: Record<string, string> = {
                                magnitude: "震级强度",
                                populationExposed: "受影响人口",
                              };
                              return labelMap[engKey] || engKey;
                            };

                            return (
                              <tr
                                key={key}
                                style={{
                                  borderTop: "1px solid var(--analytics-border-soft, #333)",
                                }}
                              >
                                <td style={{ padding: "8px", color: "#fff" }}>
                                  {getChineseLabel(key)}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    color: values.magnitude
                                      ? "var(--analytics-state-normal, #67e8f9)"
                                      : "#666",
                                  }}
                                >
                                  {values.magnitude ? (
                                    values.magnitude.toFixed(4)
                                  ) : (
                                    <span style={{ fontSize: "11px" }}>暂无</span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    color: values.populationExposed
                                      ? "var(--analytics-state-normal, #67e8f9)"
                                      : "#666",
                                  }}
                                >
                                  {values.populationExposed ? (
                                    values.populationExposed.toFixed(4)
                                  ) : (
                                    <span style={{ fontSize: "11px" }}>暂无</span>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "var(--analytics-muted, #666)",
                            }}
                          >
                            暂无关联数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 间接关联性分析 */}
            {statistics.data.correlationAnalysis.spearmanCorrelation && (
              <div>
                <div
                  style={{
                    color: "var(--analytics-chart-4)",
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginBottom: "10px",
                  }}
                >
                  <AnalyticsIcon name="trend" size={16} />
                  排序关联（趋势关系）
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--analytics-surface-inset, #0a0a0a)" }}>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "left",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          数据指标
                        </th>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          与灾害强度
                        </th>
                        <th
                          style={{
                            padding: "8px",
                            textAlign: "center",
                            color: "var(--analytics-muted, #888)",
                          }}
                        >
                          与影响人口
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(statistics.data.correlationAnalysis.spearmanCorrelation)
                        .length > 0 ? (
                        Object.entries(statistics.data.correlationAnalysis.spearmanCorrelation).map(
                          ([key, values]: [string, CorrelationValue]) => {
                            // 将英文字段名转换为中文
                            const getChineseLabel = (engKey: string) => {
                              const labelMap: Record<string, string> = {
                                magnitude: "震级强度",
                                populationExposed: "受影响人口",
                              };
                              return labelMap[engKey] || engKey;
                            };

                            return (
                              <tr
                                key={key}
                                style={{
                                  borderTop: "1px solid var(--analytics-border-soft, #333)",
                                }}
                              >
                                <td style={{ padding: "8px", color: "#fff" }}>
                                  {getChineseLabel(key)}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    color: values.magnitude ? "var(--analytics-chart-4)" : "#666",
                                  }}
                                >
                                  {values.magnitude ? (
                                    values.magnitude.toFixed(4)
                                  ) : (
                                    <span style={{ fontSize: "11px" }}>暂无</span>
                                  )}
                                </td>
                                <td
                                  style={{
                                    padding: "8px",
                                    textAlign: "center",
                                    color: values.populationExposed
                                      ? "var(--analytics-chart-4)"
                                      : "#666",
                                  }}
                                >
                                  {values.populationExposed ? (
                                    values.populationExposed.toFixed(4)
                                  ) : (
                                    <span style={{ fontSize: "11px" }}>暂无</span>
                                  )}
                                </td>
                              </tr>
                            );
                          },
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            style={{
                              padding: "15px",
                              textAlign: "center",
                              color: "var(--analytics-muted, #666)",
                            }}
                          >
                            暂无关联数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 发展趋势预测 */}
      {statistics.data.timeSeriesAnalysis?.trendAnalysis &&
        Object.keys(statistics.data.timeSeriesAnalysis.trendAnalysis).length > 0 && (
          <div style={{ marginBottom: "30px" }}>
            <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
              <AnalyticsIcon name="trend" />
              发展趋势预测
            </h4>

            {/* 趋势指标 */}
            <div
              style={{
                backgroundColor: "var(--analytics-surface-raised, #1a1a1a)",
                padding: "20px",
                borderRadius: "8px",
                border: "1px solid var(--analytics-border-soft, #333)",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: "15px",
                }}
              >
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    趋势方向
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-state-normal, #67e8f9)",
                      fontSize: "16px",
                      marginTop: "5px",
                    }}
                  >
                    {statistics.data.timeSeriesAnalysis.trendAnalysis.trend || "暂无"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    变化速度
                  </div>
                  <div style={{ color: "#fff", fontSize: "16px", marginTop: "5px" }}>
                    {formatAnalyticsNumber(
                      statistics.data.timeSeriesAnalysis.trendAnalysis.slope,
                      4,
                    ) || "暂无"}
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--analytics-muted, #888)", fontSize: "12px" }}>
                    预测准确度
                  </div>
                  <div
                    style={{
                      color: "var(--analytics-state-normal, #67e8f9)",
                      fontSize: "16px",
                      marginTop: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    {(
                      (statistics.data.timeSeriesAnalysis.trendAnalysis.r_squared ?? 0) * 100
                    ).toFixed(1)}
                    %
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: "15px",
                  padding: "10px",
                  backgroundColor: "var(--analytics-surface-inset, #0a0a0a)",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--analytics-muted, #666)",
                }}
              >
                <AnalyticsIcon name="info" size={14} /> 说明:
                根据历史数据预测未来趋势，准确度越高说明预测越可靠
              </div>
            </div>

            {/* 趋势折线图 */}
            {(() => {
              // 生成模拟数据点（基于线性回归结果）
              const trendData = statistics.data.timeSeriesAnalysis.trendAnalysis;
              const dataPoints = 30; // 30 个模拟点
              const slope = trendData.slope ?? 0;
              const intercept = trendData.intercept ?? hazards.length / 2;

              // 生成趋势线数据
              const chartData = Array.from({ length: dataPoints }, (_, i) => ({
                x: `D${i + 1}`,
                y: Math.max(0, intercept + slope * i), // 确保非负值
              }));

              return (
                <LineChart
                  data={chartData}
                  title="灾害发生趋势图 (30天)"
                  color={
                    trendData.trend === "increasing"
                      ? "var(--analytics-state-danger, #fb7185)"
                      : trendData.trend === "decreasing"
                        ? "var(--analytics-state-normal, #67e8f9)"
                        : "var(--analytics-state-warning, #fbbf24)"
                  }
                  xLabel="时间 (天)"
                  yLabel="灾害数量"
                  showDots={true}
                  height={250}
                />
              );
            })()}
          </div>
        )}

      {/* 如果时间趋势数据不存在，显示示例折线图 */}
      {!statistics.data.timeSeriesAnalysis?.trendAnalysis && (
        <div style={{ marginBottom: "30px" }}>
          <h4 className="analytics-heading" style={{ marginBottom: "15px" }}>
            <AnalyticsIcon name="chart" />
            灾害趋势可视化（示例）
          </h4>
          <LineChart
            data={hazards.slice(0, 20).map((_, i) => ({
              x: `T${i + 1}`,
              y: Math.random() * 10 + 5,
            }))}
            title="灾害频率趋势"
            color="var(--analytics-accent, #67e8f9)"
            xLabel="时间序列"
            yLabel="频率"
            showDots={true}
            height={250}
          />
        </div>
      )}
    </div>
  );
}
