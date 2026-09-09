from typing import Any

import numpy as np

from analytics.etl_processor import ETLProcessor
from app.schemas.requests import QualityCheckRequest, UnifiedDataRequest


class QualityService:
    def __init__(self, etl_processor: ETLProcessor | None = None) -> None:
        self.etl_processor = etl_processor or ETLProcessor()

    def assess(self, request: QualityCheckRequest) -> dict[str, Any]:
        dataframe = self.etl_processor.convert_to_dataframe(
            [hazard.model_dump() for hazard in request.hazards]
        )
        return self.etl_processor.assess_data_quality(dataframe, request.source)

    def transform(self, request: QualityCheckRequest) -> dict[str, Any]:
        unified_dataframe = self.etl_processor.transform_to_unified_model(
            [hazard.model_dump() for hazard in request.hazards], request.source
        )
        cleaned_dataframe = unified_dataframe.replace({np.nan: None})
        return {
            "records": cleaned_dataframe.to_dict("records"),
            "total_records": len(unified_dataframe),
            "schema": list(unified_dataframe.columns),
            "source": request.source,
        }

    def merge(self, request: UnifiedDataRequest) -> dict[str, Any]:
        result = self.etl_processor.merge_multi_source_data(
            usgs_data=request.usgs_data,
            nasa_data=request.nasa_data,
            gdacs_data=request.gdacs_data,
        )
        cleaned_dataframe = result["unified_data"].replace({np.nan: None})
        return {
            "unified_records": cleaned_dataframe.to_dict("records"),
            "total_records": result["total_records"],
            "source_records": result["source_records"],
            "merged_quality": result["merged_quality"],
            "source_quality_reports": result["source_quality_reports"],
            "source_comparison": result["source_comparison"],
        }

    def thresholds(self) -> dict[str, Any]:
        return self.etl_processor.quality_monitor.QUALITY_THRESHOLDS

    def history(self, limit: int) -> list[dict[str, Any]]:
        return self.etl_processor.quality_monitor.get_quality_trend(limit)
