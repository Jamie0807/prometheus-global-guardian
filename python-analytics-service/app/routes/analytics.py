"""定义综合分析、统计、预测、ETL 与风险评估路由。"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.core.errors import analysis_internal_error
from app.core.responses import build_success_response
from app.dependencies import get_analytics_service
from app.schemas.requests import AnalysisRequest
from app.schemas.responses import AnalyticsSuccessResponse
from app.services.analytics_service import AnalyticsService


router = APIRouter()
AnalyticsServiceDependency = Annotated[AnalyticsService, Depends(get_analytics_service)]


@router.post("/api/v1/analyze", response_model=AnalyticsSuccessResponse)
async def comprehensive_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> AnalyticsSuccessResponse:
    try:
        return build_success_response(
            http_request,
            request,
            await service.comprehensive_analysis(request),
        )
    except Exception:
        return analysis_internal_error(http_request)


@router.post("/api/v1/statistics")
async def statistical_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, await service.statistics(request))
    except Exception:
        return analysis_internal_error(http_request)


@router.post("/api/v1/predictions")
async def prediction_analysis(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, await service.predictions(request))
    except Exception:
        return analysis_internal_error(http_request)


@router.post("/api/v1/etl/process")
async def etl_processing(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, await service.etl(request))
    except Exception:
        return analysis_internal_error(http_request)


@router.post("/api/v1/risk-assessment")
async def risk_assessment(
    request: AnalysisRequest,
    http_request: Request,
    service: AnalyticsServiceDependency,
) -> dict[str, object]:
    try:
        return build_success_response(
            http_request,
            request,
            await service.risk_assessment(request),
        )
    except Exception:
        return analysis_internal_error(http_request)
