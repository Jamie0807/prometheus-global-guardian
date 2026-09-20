/**
 * 提供服务与灾害状态面板组件。
 */
import React from "react";
import DISPLAYED_TYPES from "../config/displayedTypes";
import { useMapState } from "../features/map/state/MapStateContext";

const StatusPanel: React.FC = () => {
  const { filter, hazards, refresh, setFilter } = useMapState();

  return (
    <details className="status-panel orbital-overlay" aria-label="实时监控面板" open>
      <summary className="status-header">
        <svg
          aria-hidden="true"
          className="status-icon"
          width="24"
          height="24"
          fill="none"
          stroke="#ef4444"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span className="status-panel-title" role="heading" aria-level={2}>
          实时监控
        </span>
        <span className="status-summary-count" aria-label={`灾害总数 ${hazards.length} 条`}>
          {hazards.length} 条
        </span>
        <span className="overlay-chevron" aria-hidden="true" />
      </summary>

      <div className="status-content">
        <p className="status-text">实时监测全球环境灾害动态</p>

        <div className="total-count">
          <div className="count-label">灾害总数</div>
          <div className="count-value">{hazards.length}</div>
        </div>

        <div className="filter-section">
          <label className="filter-label" htmlFor="hazard-filter">
            按类型筛选
          </label>
          <span className="status-filter-control">
            <select
              id="hazard-filter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input"
            >
              <option value="ALL">全部灾害</option>
              {DISPLAYED_TYPES.map((type) => (
                <option key={type.type_id} value={type.type_id}>
                  {type.type_name}
                </option>
              ))}
            </select>
            <svg
              aria-hidden="true"
              className="status-filter-chevron"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
            </svg>
          </span>
        </div>

        <button className="btn btn-primary status-refresh-button" onClick={() => void refresh()}>
          刷新数据
        </button>
      </div>
    </details>
  );
};

export default StatusPanel;
