"""汇集 API 请求与响应的数据模式。"""

from .requests import AnalysisRequest, HazardData, QualityCheckRequest, UnifiedDataRequest
from .responses import AnalysisResponse

__all__ = [
    "AnalysisRequest",
    "AnalysisResponse",
    "HazardData",
    "QualityCheckRequest",
    "UnifiedDataRequest",
]
