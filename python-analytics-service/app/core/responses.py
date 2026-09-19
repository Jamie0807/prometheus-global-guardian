"""构造 Analytics 统一成功和错误响应信封。"""

import hashlib
import json
from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.schemas.responses import AnalyticsSuccessResponse


ANALYTICS_SCHEMA_VERSION = "1.0"
ANALYTICS_MODEL_VERSION = "analytics-model-v1"


def utc_now() -> str:
    """返回带 UTC 标记的 ISO 8601 时间。"""

    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def input_snapshot_id(value: BaseModel | Mapping[str, Any] | Sequence[Any] | None) -> str:
    """对已验证输入生成稳定摘要，不保存原始请求数据。"""

    if isinstance(value, BaseModel):
        normalized: Any = value.model_dump(mode="json")
    elif value is None:
        normalized = {}
    else:
        normalized = value
    serialized = json.dumps(
        normalized,
        ensure_ascii=True,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _unwrap_result(result: Any) -> tuple[Any, float, list[str]]:
    if isinstance(result, BaseModel):
        result = result.model_dump(mode="json")
    if isinstance(result, Mapping) and result.get("success") is True and "data" in result:
        warnings = result.get("warnings", [])
        return (
            result["data"],
            float(result.get("processingTime", 0.0)),
            list(warnings) if isinstance(warnings, list) else [],
        )
    return result, 0.0, []


def build_success_response(
    request: Request,
    input_value: BaseModel | Mapping[str, Any] | Sequence[Any] | None,
    result: Any,
) -> dict[str, Any]:
    """把服务结果包装为统一的版本化成功响应。"""

    data, processing_time, warnings = _unwrap_result(result)
    generated_at = utc_now()
    response = AnalyticsSuccessResponse(
        data=data,
        schemaVersion=ANALYTICS_SCHEMA_VERSION,
        requestId=request.state.request_id,
        generatedAt=generated_at,
        modelVersion=ANALYTICS_MODEL_VERSION,
        inputSnapshotId=input_snapshot_id(input_value),
        warnings=warnings,
        processingTime=processing_time,
        timestamp=generated_at,
    )
    return response.model_dump()


def build_error_response(
    request: Request,
    status_code: int,
    code: str,
    message: str,
) -> JSONResponse:
    """返回不包含异常正文的稳定错误信封。"""

    request_id = request.state.request_id
    generated_at = utc_now()
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "schemaVersion": ANALYTICS_SCHEMA_VERSION,
            "requestId": request_id,
            "generatedAt": generated_at,
            "modelVersion": ANALYTICS_MODEL_VERSION,
            "warnings": [],
            "error": {
                "code": code,
                "message": message,
                "requestId": request_id,
            },
        },
    )
