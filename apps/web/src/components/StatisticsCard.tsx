/**
 * 提供统计指标卡片组件。
 */
import React from "react";

const StatisticsCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => {
  return (
    <div
      style={{
        backgroundColor: "#2a2a2a",
        padding: "20px",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <div style={{ color: "#888", fontSize: "14px", marginBottom: "8px" }}>{title}</div>
      <div style={{ color: "#4CAF50", fontSize: "24px", fontWeight: "bold" }}>{value}</div>
    </div>
  );
};

export default StatisticsCard;
