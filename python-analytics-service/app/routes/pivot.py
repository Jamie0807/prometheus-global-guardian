import logging
from typing import Annotated, Callable

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_pivot_service
from app.schemas.requests import AnalysisRequest
from app.services.pivot_service import PivotService


logger = logging.getLogger(__name__)
router = APIRouter()
PivotServiceDependency = Annotated[PivotService, Depends(get_pivot_service)]


def _invoke(operation: Callable[[AnalysisRequest], dict[str, object]], request: AnalysisRequest, event: str) -> dict[str, object]:
    try:
        return operation(request)
    except Exception as exc:
        logger.error(event)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/v1/pivot/create")
async def create_4d_pivot_table(
    request: AnalysisRequest, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.create, request, "pivot_table.creation_request_failed")


@router.post("/api/v1/pivot/query")
async def multi_dimensional_query(
    request: AnalysisRequest, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.query, request, "pivot_table.query_request_failed")


@router.post("/api/v1/pivot/trend-analysis")
async def analyze_4d_trends(
    request: AnalysisRequest, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.trend_analysis, request, "pivot_table.trend_request_failed")


@router.post("/api/v1/pivot/risk-score")
async def calculate_4d_risk_scores(
    request: AnalysisRequest, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.risk_score, request, "pivot_table.risk_request_failed")


@router.post("/api/v1/pivot/summary")
async def get_4d_summary(
    request: AnalysisRequest, service: PivotServiceDependency
) -> dict[str, object]:
    return _invoke(service.summary, request, "pivot_table.summary_request_failed")
