"""定义数据分析 API 的响应模式。"""

from typing import Any

from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    success: bool
    data: dict[str, Any]
    processingTime: float
    timestamp: str
