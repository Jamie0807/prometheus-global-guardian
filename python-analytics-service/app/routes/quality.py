import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.dependencies import get_quality_service
from app.schemas.requests import QualityCheckRequest, UnifiedDataRequest
from app.services.quality_service import QualityService


logger = logging.getLogger(__name__)
router = APIRouter()
QualityServiceDependency = Annotated[QualityService, Depends(get_quality_service)]


@router.post("/api/v1/quality/assess")
async def assess_data_quality(
    request: QualityCheckRequest, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return {"success": True, "data": service.assess(request)}
    except Exception as exc:
        logger.error("quality.assessment_request_failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/v1/unified-model/transform")
async def transform_to_unified_model(
    request: QualityCheckRequest, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return {"success": True, "data": service.transform(request)}
    except Exception as exc:
        logger.error("unified_model.transformation_request_failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/api/v1/unified-model/merge")
async def merge_multi_source(
    request: UnifiedDataRequest, service: QualityServiceDependency
) -> dict[str, object]:
    try:
        return {"success": True, "data": service.merge(request)}
    except Exception as exc:
        logger.error("unified_model.merge_request_failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/api/v1/quality/thresholds")
async def get_quality_thresholds(service: QualityServiceDependency) -> dict[str, object]:
    return {"success": True, "data": service.thresholds()}


@router.get("/api/v1/quality/history")
async def get_quality_history(
    service: QualityServiceDependency, limit: int = Query(default=10, ge=1, le=100)
) -> dict[str, object]:
    try:
        history = service.history(limit)
        return {"success": True, "data": {"history": history, "count": len(history)}}
    except Exception as exc:
        logger.error("quality.history_request_failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc
