"""封装四维数据透视表的服务操作。"""

import logging
import time
from datetime import datetime
from typing import Any

import pandas as pd

from analytics.pivot_table_analyzer import FourDimensionalPivotTable
from app.schemas.requests import AnalysisRequest


logger = logging.getLogger(__name__)


class PivotService:
    def _analyzer(self, request: AnalysisRequest) -> FourDimensionalPivotTable:
        dataframe = pd.DataFrame([hazard.model_dump() for hazard in request.hazards])
        return FourDimensionalPivotTable(dataframe)

    def create(self, request: AnalysisRequest) -> dict[str, Any]:
        started_at = time.perf_counter()
        analyzer = self._analyzer(request)
        pivot_table = analyzer.create_4d_pivot(
            time_dim=request.time_dim,
            geo_dim=request.geo_dim,
            type_dim="type_category",
            severity_dim="severity",
            aggfunc=request.aggfunc,
            values_col="id" if request.aggfunc == "count" else "magnitude",
        )
        processing_time = time.perf_counter() - started_at
        logger.info("pivot_table.created")
        return {
            "success": True,
            "data": {
                "pivot_table": analyzer.export_pivot_to_dict(pivot_table),
                "summary": analyzer.get_summary_statistics(),
                "dimensions": {
                    "rows": len(pivot_table.index),
                    "columns": len(pivot_table.columns),
                },
            },
            "processingTime": processing_time,
            "timestamp": datetime.now().isoformat(),
        }

    def query(self, request: AnalysisRequest) -> dict[str, Any]:
        started_at = time.perf_counter()
        analyzer = self._analyzer(request)
        time_range = None
        if request.time_range:
            time_range = (
                pd.to_datetime(request.time_range[0]),
                pd.to_datetime(request.time_range[1]),
            )
        result_dataframe = analyzer.multi_dimensional_query(
            time_range=time_range,
            regions=request.regions,
            types=request.types,
            severities=request.severities,
        )
        return {
            "success": True,
            "data": {
                "results": result_dataframe.to_dict("records"),
                "total_count": len(result_dataframe),
                "query_params": {
                    "time_range": request.time_range,
                    "regions": request.regions,
                    "types": request.types,
                    "severities": request.severities,
                },
            },
            "processingTime": time.perf_counter() - started_at,
            "timestamp": datetime.now().isoformat(),
        }

    def trend_analysis(self, request: AnalysisRequest) -> dict[str, Any]:
        started_at = time.perf_counter()
        analyzer = self._analyzer(request)
        trends = analyzer.trend_analysis_4d(time_window=request.time_window)
        if trends.empty:
            return {
                "success": True,
                "data": {
                    "trends": [],
                    "message": "时间窗口内数据不足",
                    "time_window": request.time_window,
                },
                "processingTime": time.perf_counter() - started_at,
                "timestamp": datetime.now().isoformat(),
            }
        high_risk_trends = trends[
            (trends["trend_direction"] == "increasing")
            & (trends["severity"] == "WARNING")
        ].sort_values("trend_slope", ascending=False)
        return {
            "success": True,
            "data": {
                "all_trends": trends.to_dict("records"),
                "high_risk_trends": high_risk_trends.to_dict("records"),
                "statistics": {
                    "total_combinations": len(trends),
                    "increasing": len(trends[trends["trend_direction"] == "increasing"]),
                    "stable": len(trends[trends["trend_direction"] == "stable"]),
                    "decreasing": len(trends[trends["trend_direction"] == "decreasing"]),
                    "high_risk_count": len(high_risk_trends),
                },
                "time_window": request.time_window,
            },
            "processingTime": time.perf_counter() - started_at,
            "timestamp": datetime.now().isoformat(),
        }

    def risk_score(self, request: AnalysisRequest) -> dict[str, Any]:
        started_at = time.perf_counter()
        analyzer = self._analyzer(request)
        risk_scores = analyzer.risk_score_4d(time_window=request.time_window)
        if risk_scores.empty:
            return {
                "success": True,
                "data": {
                    "risk_scores": [],
                    "message": "时间窗口内数据不足",
                    "time_window": request.time_window,
                },
                "processingTime": time.perf_counter() - started_at,
                "timestamp": datetime.now().isoformat(),
            }
        return {
            "success": True,
            "data": {
                "all_risk_scores": risk_scores.to_dict("records"),
                "top_10_risks": risk_scores.head(10).to_dict("records"),
                "statistics": {
                    "total_combinations": len(risk_scores),
                    "max_risk_score": float(risk_scores["risk_score"].max()),
                    "avg_risk_score": float(risk_scores["risk_score"].mean()),
                    "min_risk_score": float(risk_scores["risk_score"].min()),
                },
                "time_window": request.time_window,
            },
            "processingTime": time.perf_counter() - started_at,
            "timestamp": datetime.now().isoformat(),
        }

    def summary(self, request: AnalysisRequest) -> dict[str, Any]:
        started_at = time.perf_counter()
        summary = self._analyzer(request).get_summary_statistics()
        return {
            "success": True,
            "data": summary,
            "processingTime": time.perf_counter() - started_at,
            "timestamp": datetime.now().isoformat(),
        }
