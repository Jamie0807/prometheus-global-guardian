import math
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


MAX_HAZARDS = 1_000
MAX_FILTER_VALUES = 100
MAX_SOURCE_RECORDS = 1_000
MAX_FILTER_TEXT_LENGTH = 128

FilterText = Annotated[str, Field(min_length=1, max_length=MAX_FILTER_TEXT_LENGTH)]


class HazardData(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=128)
    type: str = Field(default="unknown", min_length=1, max_length=64)
    title: str = Field(default="Unknown Event", min_length=1, max_length=256)
    coordinates: list[float] = Field(default_factory=lambda: [0.0, 0.0], min_length=2, max_length=2)
    timestamp: str = Field(min_length=1, max_length=64)
    magnitude: float | None = Field(default=None, ge=-20, le=20, allow_inf_nan=False)
    severity: str | None = Field(default=None, min_length=1, max_length=64)
    source: str = Field(default="DisasterAWARE", min_length=1, max_length=64)
    populationExposed: int | None = Field(default=None, ge=0, le=1_000_000_000)

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_coordinate_input_types(cls, value: object) -> object:
        if not isinstance(value, list) or any(
            isinstance(coordinate, bool)
            or not isinstance(coordinate, (int, float))
            for coordinate in value
        ):
            raise ValueError("coordinates must contain JSON numbers")
        return value

    @field_validator("magnitude", "populationExposed", mode="before")
    @classmethod
    def validate_numeric_input_types(cls, value: object) -> object:
        if value is not None and (
            isinstance(value, bool) or not isinstance(value, (int, float))
        ):
            raise ValueError("numeric fields must contain JSON numbers")
        return value

    @field_validator("id", "type", "title", "timestamp", "severity", "source")
    @classmethod
    def validate_text_fields(cls, value: str | None) -> str | None:
        if value is not None and not value.strip():
            raise ValueError("text fields must not be blank")
        return value

    @field_validator("coordinates")
    @classmethod
    def validate_coordinates(cls, value: list[float]) -> list[float]:
        longitude, latitude = value
        if not all(math.isfinite(coordinate) for coordinate in value):
            raise ValueError("coordinates must contain finite numbers")
        if not -180 <= longitude <= 180 or not -90 <= latitude <= 90:
            raise ValueError("coordinates must be [longitude, latitude] within valid ranges")
        return value


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hazards: list[HazardData] = Field(min_length=1, max_length=MAX_HAZARDS)
    analysisType: str = "comprehensive"
    timeRange: int = Field(default=30, ge=1, le=3_650)
    time_dim: Literal["year", "quarter", "month", "week", "day", "date_only"] = "month"
    geo_dim: Literal["region", "continent", "geo_grid"] = "region"
    aggfunc: Literal["count", "sum", "mean"] = "count"
    time_range: tuple[str, str] | None = None
    regions: list[FilterText] | None = Field(default=None, max_length=MAX_FILTER_VALUES)
    types: list[FilterText] | None = Field(default=None, max_length=MAX_FILTER_VALUES)
    severities: list[FilterText] | None = Field(default=None, max_length=MAX_FILTER_VALUES)
    time_window: int = Field(default=7, ge=1, le=365)

    @field_validator("time_range")
    @classmethod
    def validate_time_range(cls, value: tuple[str, str] | None) -> tuple[str, str] | None:
        if value is None:
            return None

        parsed_timestamps = []
        for timestamp in value:
            try:
                parsed_timestamps.append(datetime.fromisoformat(timestamp.replace("Z", "+00:00")))
            except ValueError as exc:
                raise ValueError("time_range must contain ISO 8601 timestamps") from exc
        if parsed_timestamps[0] > parsed_timestamps[1]:
            raise ValueError("time_range start must not be after its end")
        return value

    @field_validator("regions", "types", "severities")
    @classmethod
    def validate_filter_values(cls, value: list[str] | None) -> list[str] | None:
        if value is not None and any(not item.strip() for item in value):
            raise ValueError("filter values must not be blank")
        return value


class UnifiedDataRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    usgs_data: list[dict[str, Any]] | None = Field(default=None, max_length=MAX_SOURCE_RECORDS)
    nasa_data: list[dict[str, Any]] | None = Field(default=None, max_length=MAX_SOURCE_RECORDS)
    gdacs_data: list[dict[str, Any]] | None = Field(default=None, max_length=MAX_SOURCE_RECORDS)


class QualityCheckRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    hazards: list[HazardData] = Field(min_length=1, max_length=MAX_HAZARDS)
    source: str = Field(default="unknown", min_length=1, max_length=64)

    @field_validator("source")
    @classmethod
    def validate_source(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("source must not be blank")
        return value
