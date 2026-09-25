"""定义数据分析 API 的响应模式。"""

from typing import Any, Literal

from pydantic import BaseModel


class AnalysisResponse(BaseModel):
    success: bool
    data: dict[str, Any]
    processingTime: float
    timestamp: str


class AnalyticsSuccessResponse(BaseModel):
    """统一的 Analytics 成功响应信封。"""

    success: Literal[True] = True
    data: Any
    schemaVersion: str
    requestId: str
    generatedAt: str
    modelVersion: str
    inputSnapshotId: str
    warnings: list[str]
    processingTime: float
    timestamp: str


class AnalyticsError(BaseModel):
    """统一错误信封中的安全错误信息。"""

    code: str
    message: str
    requestId: str


class AnalyticsErrorResponse(BaseModel):
    """统一的 Analytics 错误响应信封。"""

    success: Literal[False] = False
    schemaVersion: str
    requestId: str
    generatedAt: str
    modelVersion: str
    warnings: list[str]
    error: AnalyticsError
