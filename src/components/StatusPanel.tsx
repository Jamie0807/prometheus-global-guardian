import React from "react";
import DISPLAYED_TYPES from "../config/displayedTypes";
import { useMapState } from "../features/map/state/MapStateContext";

const StatusPanel: React.FC = () => {
  const { filter, hazards, refresh, setFilter } = useMapState();

  return (
    <div className="status-panel">
      <div className="status-header">
        <svg width="24" height="24" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2>实时监控</h2>
      </div>

      <p className="status-text">实时环境灾害</p>

      <div className="total-count">
        <div className="count-label">灾害总数</div>
        <div className="count-value">{hazards.length}</div>
      </div>

      <div className="filter-section">
        <label className="filter-label" htmlFor="hazard-filter">
          按类型筛选
        </label>
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
      </div>

      <button className="btn btn-primary status-refresh-button" onClick={() => void refresh()}>
        刷新数据
      </button>
    </div>
  );
};

export default StatusPanel;
