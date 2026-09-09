from typing import Any

from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    success: bool
    data: dict[str, Any]
    processingTime: float
    timestamp: str
