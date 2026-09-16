/**
 * 提供地图图例面板组件。
 */
import React from "react";
import { HAZARD_COLORS } from "../config/hazardColors";
import DISPLAYED_TYPES from "../config/displayedTypes";

const LegendPanel: React.FC = () => {
  const hazardList = Object.entries(HAZARD_COLORS).map(([label, color]) => ({
    label: DISPLAYED_TYPES.find((item) => item.type_id === label)?.type_name || label,
    color,
  }));

  return (
    <div className="legend-panel" id="legend-panel">
      <div className="legend-header">
        <div className="legend-title">
          <svg width="20" height="20" fill="none" stroke="white" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            ></path>
          </svg>
          <span>灾害类型</span>
        </div>
      </div>

      <div className="legend-items">
        {hazardList.map(({ color, label }) => (
          <div className="legend-item" key={label}>
            <div
              className="legend-color"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 8px ${color}`,
              }}
            ></div>
            <span className="legend-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LegendPanel;
