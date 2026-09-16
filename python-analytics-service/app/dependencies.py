"""提供 FastAPI 路由所需的服务依赖。"""

from fastapi import Request

from app.services.analytics_service import AnalyticsService
from app.services.pivot_service import PivotService
from app.services.quality_service import QualityService


def get_analytics_service(request: Request) -> AnalyticsService:
    return request.app.state.analytics_service


def get_quality_service(request: Request) -> QualityService:
    return request.app.state.quality_service


def get_pivot_service(request: Request) -> PivotService:
    return request.app.state.pivot_service
