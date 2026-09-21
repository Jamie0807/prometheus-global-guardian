"""定义四维数据透视表分析路由。"""

import logging
from typing import Annotated, Callable

from fastapi import APIRouter, Depends, Request

from app.core.errors import analysis_internal_error
from app.core.responses import build_success_response
from app.dependencies import get_pivot_service
from app.schemas.requests import AnalysisRequest
from app.services.pivot_service import PivotService
from security import require_service_access


logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_service_access)])
PivotServiceDependency = Annotated[PivotService, Depends(get_pivot_service)]


def _invoke(
    operation: Callable[[AnalysisRequest], dict[str, object]],
    request: AnalysisRequest,
    http_request: Request,
    event: str,
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, operation(request))
    except Exception:
        logger.error(event)
        return analysis_internal_error(http_request)


@router.post("/api/v1/pivot/create")
async def create_4d_pivot_table(
    request: AnalysisRequest, http_request: Request, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.create, request, http_request, "pivot_table.creation_request_failed")


@router.post("/api/v1/pivot/query")
async def multi_dimensional_query(
    request: AnalysisRequest, http_request: Request, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.query, request, http_request, "pivot_table.query_request_failed")


@router.post("/api/v1/pivot/trend-analysis")
async def analyze_4d_trends(
    request: AnalysisRequest, http_request: Request, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.trend_analysis, request, http_request, "pivot_table.trend_request_failed")


@router.post("/api/v1/pivot/risk-score")
async def calculate_4d_risk_scores(
    request: AnalysisRequest, http_request: Request, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.risk_score, request, http_request, "pivot_table.risk_request_failed")


@router.post("/api/v1/pivot/summary")
async def get_4d_summary(
    request: AnalysisRequest, http_request: Request, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.summary, request, http_request, "pivot_table.summary_request_failed")
