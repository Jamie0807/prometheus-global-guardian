import React, { useEffect, useState } from "react";
import { fetchHazardTypes } from "../services/hazards/hazardService";
import { checkHealth } from "../services/analytics/analyticsService";
import type { HazardType } from "../types";
import DISPLAYED_TYPES from "../config/displayedTypes";
import { useMapState } from "../features/map/state/MapStateContext";
import { createClientLogger } from "../utils/logger";

const logger = createClientLogger("status-panel");
const displayedTypeNames = new Map(
  DISPLAYED_TYPES.map(({ type_id, type_name }) => [type_id, type_name]),
);

const StatusPanel: React.FC = () => {
  const { filter, hazards, refresh, setFilter } = useMapState();
  const [hazardTypes, setHazardTypes] = useState<HazardType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchHazardTypes();
      setHazardTypes(
        data.flatMap((item: HazardType) => {
          const typeName = displayedTypeNames.get(item.type_id);
          return typeName === undefined ? [] : [{ ...item, type_name: typeName }];
        }),
      );
    } catch {
      logger.warn("hazard_types_load_failed");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    checkPythonService();
    const interval = setInterval(checkPythonService, 10000); // 每10秒检查一次
    return () => clearInterval(interval);
  }, []);

  const checkPythonService = async () => {
    await checkHealth();
  };

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
          disabled={isLoading}
        >
          <option value="ALL">全部灾害</option>
          {hazardTypes.map((type) => (
            <option key={type.type_id} value={type.type_id}>
              {type.type_name}
            </option>
          ))}
        </select>
        {isLoading && <p className="loading-text">正在加载灾害类型...</p>}
      </div>

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: "12px" }}
        onClick={() => void refresh()}
      >
        刷新数据
      </button>
    </div>
  );
};

export default StatusPanel;
