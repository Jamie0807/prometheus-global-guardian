from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.core.errors import raise_analysis_internal_error
from app.dependencies import get_analytics_service
from app.schemas.requests import AnalysisRequest
from app.schemas.responses import AnalysisResponse
from app.services.analytics_service import AnalyticsService


router = APIRouter()
AnalyticsServiceDependency = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.post("/api/v1/analyze", response_model=AnalysisResponse)
async def comprehensive_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> AnalysisResponse:
    try:
        return await service.comprehensive_analysis(request)
    except Exception:
        raise_analysis_internal_error(http_request)


@router.post("/api/v1/statistics")
async def statistical_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return {"success": True, "data": await service.statistics(request)}
    except Exception:
        raise_analysis_internal_error(http_request)


@router.post("/api/v1/predictions")
async def prediction_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return {"success": True, "data": await service.predictions(request)}
    except Exception:
        raise_analysis_internal_error(http_request)


@router.post("/api/v1/etl/process")
async def etl_processing(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return {"success": True, "data": await service.etl(request)}
    except Exception:
        raise_analysis_internal_error(http_request)


@router.post("/api/v1/risk-assessment")
async def risk_assessment(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return {"success": True, "data": await service.risk_assessment(request)}
    except Exception:
        raise_analysis_internal_error(http_request)
