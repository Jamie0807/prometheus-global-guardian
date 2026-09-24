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
    <details
      className="legend-panel orbital-overlay"
      id="legend-panel"
      aria-label="灾害类型图例"
      open
    >
      <summary className="legend-header">
        <span className="legend-title">
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            fill="none"
            stroke="white"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
            ></path>
          </svg>
          <span>灾害类型</span>
        </span>
        <span className="legend-summary-count">{hazardList.length} 类</span>
        <span className="overlay-chevron" aria-hidden="true" />
      </summary>

      <div className="legend-content">
        <ul className="legend-items">
          {hazardList.map(({ color, label }) => (
            <li className="legend-item" key={label}>
              <span
                aria-hidden="true"
                className="legend-color"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}`,
                }}
              />
              <span className="legend-label">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
};

export default LegendPanel;
