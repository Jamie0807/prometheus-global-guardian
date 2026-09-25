"""定义服务信息、健康检查和管理路由。"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies import get_analytics_service
from app.services.analytics_service import AnalyticsService
from security import AdminAccess


router = APIRouter()
AnalyticsServiceDependency = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.get("/")
async def root() -> dict[str, object]:
    return {
        "service": "Prometheus Analytics Service",
        "status": "running",
        "version": "1.0.0",
        "features": [
            "Statistical Analysis",
            "5 Prediction Models",
            "ETL Processing",
            "Risk Assessment",
        ],
    }


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@router.get("/metrics")
async def get_metrics(_: AdminAccess, service: AnalyticsServiceDependency) -> dict[str, object]:
    return service.metrics()


@router.post("/cache/clear")
async def clear_cache(_: AdminAccess, service: AnalyticsServiceDependency) -> dict[str, object]:
    service.clear_cache()
    return {"success": True, "message": "Cache cleared"}
