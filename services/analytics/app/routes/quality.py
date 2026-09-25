"""定义数据质量和统一模型转换路由。"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.core.errors import analysis_internal_error
from app.core.responses import build_success_response
from app.dependencies import get_quality_service
from app.schemas.requests import QualityCheckRequest, UnifiedDataRequest
from app.services.quality_service import QualityService
from security import require_service_access


logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_service_access)])
QualityServiceDependency = Annotated[QualityService, Depends(get_quality_service)]


@router.post("/api/v1/quality/assess")
async def assess_data_quality(
    request: QualityCheckRequest, http_request: Request, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, service.assess(request))
    except Exception:
        logger.error("quality.assessment_request_failed")
        return analysis_internal_error(http_request)


@router.post("/api/v1/unified-model/transform")
async def transform_to_unified_model(
    request: QualityCheckRequest, http_request: Request, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, service.transform(request))
    except Exception:
        logger.error("unified_model.transformation_request_failed")
        return analysis_internal_error(http_request)


@router.post("/api/v1/unified-model/merge")
async def merge_multi_source(
    request: UnifiedDataRequest, http_request: Request, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return build_success_response(http_request, request, service.merge(request))
    except Exception:
        logger.error("unified_model.merge_request_failed")
        return analysis_internal_error(http_request)


@router.get("/api/v1/quality/thresholds")
async def get_quality_thresholds(
    http_request: Request, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return build_success_response(http_request, None, service.thresholds())
    except Exception:
        return analysis_internal_error(http_request)


@router.get("/api/v1/quality/history")
async def get_quality_history(
    http_request: Request,
    service: QualityServiceDependency,
    limit: int = Query(default=10, ge=1, le=100),
) -> dict[str, object]:
    try:
        history = service.history(limit)
        return build_success_response(
            http_request,
            {"limit": limit},
            {"history": history, "count": len(history)},
        )
    except Exception:
        logger.error("quality.history_request_failed")
        return analysis_internal_error(http_request)
